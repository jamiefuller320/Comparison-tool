#!/usr/bin/env python3
"""Collate product-feedback intake issues into an improvement-cycle digest.

Reads GitHub issues (via `gh`) labelled product-feedback, extracts the
machine JSON fence, and writes a markdown summary + JSONL for automation.

Examples:
  python3 scripts/digest-product-feedback.py
  python3 scripts/digest-product-feedback.py --repo owner/private-intake --limit 50
  python3 scripts/digest-product-feedback.py --jsonl /tmp/feedback.jsonl
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

MACHINE_RE = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)


def gh_issues(repo: str | None, limit: int) -> list[dict]:
    cmd = [
        "gh",
        "issue",
        "list",
        "--label",
        "product-feedback",
        "--state",
        "all",
        "--limit",
        str(limit),
        "--json",
        "number,title,body,createdAt,labels,url",
    ]
    if repo:
        cmd.extend(["--repo", repo])
    proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return json.loads(proc.stdout or "[]")


def extract_machine(body: str) -> dict | None:
    match = MACHINE_RE.search(body or "")
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo",
        help="Intake repo (owner/name). Default: gh's current repo.",
    )
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument(
        "--jsonl",
        type=Path,
        help="Optional path to write one machine payload per line",
    )
    parser.add_argument(
        "--out",
        type=Path,
        help="Optional markdown digest path (default: stdout)",
    )
    args = parser.parse_args()

    try:
        issues = gh_issues(args.repo, args.limit)
    except FileNotFoundError:
        print("gh CLI not found", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as err:
        print(err.stderr or err.stdout or str(err), file=sys.stderr)
        return 1

    rows: list[dict] = []
    for issue in issues:
        machine = extract_machine(issue.get("body") or "")
        if not machine:
            continue
        machine["_issue"] = {
            "number": issue.get("number"),
            "url": issue.get("url"),
            "createdAt": issue.get("createdAt"),
            "title": issue.get("title"),
        }
        rows.append(machine)

    sentiment = Counter(str(r.get("sentiment") or "unknown") for r in rows)
    triggers = Counter(str(r.get("trigger") or "unknown") for r in rows)
    topics = Counter(
        t for r in rows for t in (r.get("topics") or []) if isinstance(t, str)
    )
    campaigns = Counter(str(r.get("campaignId") or "unknown") for r in rows)

    used_compare = sum(
        1 for r in rows if (r.get("usage") or {}).get("openedSideBySide")
    )
    used_print = sum(
        1 for r in rows if (r.get("usage") or {}).get("printedVisitPack")
    )
    no_shortlist = sum(
        1
        for r in rows
        if int((r.get("usage") or {}).get("shortlistCountMax") or 0) == 0
    )
    shortlist_las = Counter(
        la
        for r in rows
        for la in (
            r.get("shortlistLas")
            or (r.get("usage") or {}).get("shortlistLas")
            or []
        )
        if isinstance(la, str) and la.strip()
    )

    lines = [
        "# Product feedback digest",
        "",
        f"Issues with machine payload: **{len(rows)}** (of {len(issues)} labelled).",
        "",
        "## Campaigns",
    ]
    for key, count in campaigns.most_common():
        lines.append(f"- `{key}`: {count}")
    lines += ["", "## Sentiment"]
    for key, count in sentiment.most_common():
        lines.append(f"- `{key}`: {count}")
    lines += ["", "## Triggers"]
    for key, count in triggers.most_common():
        lines.append(f"- `{key}`: {count}")
    lines += ["", "## Topics"]
    for key, count in topics.most_common():
        lines.append(f"- `{key}`: {count}")
    if shortlist_las:
        lines += ["", "## Shortlist LAs (voluntary intake)"]
        for key, count in shortlist_las.most_common():
            lines.append(f"- `{key}`: {count}")
    lines += [
        "",
        "## Usage slices",
        f"- Opened side by side: {used_compare}",
        f"- Printed visit pack: {used_print}",
        f"- Never shortlisted: {no_shortlist}",
        "",
        "## Suggested improvement cycle inputs",
        "",
        "1. Cluster notes by top topics + stuck/mixed sentiment.",
        "2. Prioritise friction before first shortlist if `never shortlisted` is high.",
        "3. If print-pack feedback is thin but shortlists are common, prompt earlier after compare.",
        "4. Feed shortlist / area-page LAs into `npm run loop:pack-quality` interest weighting.",
        "5. Bump `FEEDBACK_CAMPAIGN_ID` in `src/lib/buildMeta.ts` when shipping a significant fix wave.",
        "",
    ]

    md = "\n".join(lines)
    if args.out:
        args.out.write_text(md, encoding="utf-8")
    else:
        print(md)

    if args.jsonl:
        with args.jsonl.open("w", encoding="utf-8") as fh:
            for row in rows:
                fh.write(json.dumps(row, separators=(",", ":")) + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
