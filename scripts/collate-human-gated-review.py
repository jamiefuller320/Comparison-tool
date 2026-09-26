#!/usr/bin/env python3
"""Collate open human-gated improvement signals into a periodic review digest.

Daily producers (spot-check, user-improvement flags) leave gated candidates in
JSONL that is rewritten each run. This script merges those tip-of-tree queues
plus durable digest-only signals (ethos underclaim, unsupported offerings) into:

  - output/human-gated-review-queue.jsonl   (durable pending/done ledger)
  - public/data/packs/human-gated-review-latest.{json,md}

It never auto-applies gated phrases. Maintainers close items via
``--mark-done`` / ``feedback:process done`` / ``qa:human-flags`` (see digest).

Examples:
  python3 scripts/collate-human-gated-review.py
  python3 scripts/collate-human-gated-review.py --dry-run
  python3 scripts/collate-human-gated-review.py --open-issue
  python3 scripts/collate-human-gated-review.py --mark-done <id>
  python3 scripts/collate-human-gated-review.py --mark-done-feedback <uuid>
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "human-gated-review-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "human-gated-review-latest.md"
QUEUE_JSONL = ROOT / "output" / "human-gated-review-queue.jsonl"
SPOTCHECK_DIGEST = ROOT / "public" / "data" / "packs" / "qualitative-spotcheck-latest.json"
SPOTCHECK_GATED = ROOT / "output" / "spotcheck-human-gated-candidates.jsonl"
SPOTCHECK_FLAGS = ROOT / "output" / "spotcheck-human-flag-candidates.jsonl"
USER_GATED = ROOT / "output" / "user-improvement-gated-candidates.jsonl"
LEARNED_QA = ROOT / "output" / "learned-qa-patterns.json"

# Spot-check digest flags that stay human-gated (never phrase-strip auto).
DIGEST_GATE_CODES = frozenset(
    {
        "possible_underclaim",
        "unsupported_offerings",
    }
)

KIND_PHRASE = "phrase_candidate"
KIND_ETHOS = "ethos_underclaim"
KIND_UNSUPPORTED = "unsupported_offerings"
KIND_USER = "user_improvement"
KIND_ISSUE = "github_issue"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def stable_id(*parts: str) -> str:
    raw = "|".join(p.strip().lower() for p in parts if p is not None)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def read_json(path: Path) -> Any | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict):
            rows.append(row)
    return rows


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)
    path.write_text(body, encoding="utf-8")


def learned_phrases() -> set[str]:
    data = read_json(LEARNED_QA)
    if not isinstance(data, dict):
        return set()
    phrases = data.get("phrases") or data.get("patterns") or []
    out: set[str] = set()
    if isinstance(phrases, list):
        for item in phrases:
            if isinstance(item, dict) and item.get("phrase"):
                out.add(str(item["phrase"]).strip().lower())
            elif isinstance(item, str) and item.strip():
                out.add(item.strip().lower())
    elif isinstance(phrases, dict):
        out.update(str(k).strip().lower() for k in phrases.keys())
    return out


def load_queue(path: Path) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for row in read_jsonl(path):
        item_id = str(row.get("id") or "").strip()
        if not item_id:
            continue
        by_id[item_id] = row
    return by_id


def upsert(
    queue: dict[str, dict[str, Any]],
    item: dict[str, Any],
    *,
    seen_at: str,
) -> None:
    item_id = str(item["id"])
    existing = queue.get(item_id)
    if existing is None:
        item.setdefault("status", "open")
        item.setdefault("firstSeen", seen_at)
        item["lastSeen"] = seen_at
        queue[item_id] = item
        return
    # Preserve done/ignored; refresh payload + lastSeen while open.
    status = str(existing.get("status") or "open")
    first = existing.get("firstSeen") or seen_at
    note = existing.get("doneNote")
    done_at = existing.get("doneAt")
    merged = {**existing, **item}
    merged["id"] = item_id
    merged["status"] = status
    merged["firstSeen"] = first
    merged["lastSeen"] = seen_at
    if note is not None:
        merged["doneNote"] = note
    if done_at is not None:
        merged["doneAt"] = done_at
    queue[item_id] = merged


def collect_spotcheck_phrase_candidates(seen_at: str) -> list[dict[str, Any]]:
    """Prefer dedicated gated JSONL (#203); else autoLearn=gated rows."""
    items: list[dict[str, Any]] = []
    gated_rows = read_jsonl(SPOTCHECK_GATED)
    if gated_rows:
        source_rows = gated_rows
        source_name = "spotcheck-human-gated-candidates"
    else:
        # Pre-#203 / tip without gated file: only rows explicitly marked gated.
        source_rows = [
            r
            for r in read_jsonl(SPOTCHECK_FLAGS)
            if str(r.get("autoLearn") or "").lower() == "gated"
        ]
        source_name = "spotcheck-human-flag-candidates(autoLearn=gated)"

    for row in source_rows:
        phrase = str(row.get("phrase") or "").strip()
        if not phrase:
            continue
        junk = str(row.get("junkClass") or row.get("class") or "spotcheck_chrome")
        item_id = stable_id("spotcheck", KIND_PHRASE, phrase, junk)
        items.append(
            {
                "id": item_id,
                "kind": KIND_PHRASE,
                "source": source_name,
                "action": "qa_human_flags",
                "phrase": phrase,
                "junkClass": junk,
                "urn": row.get("urn"),
                "area": row.get("area"),
                "detail": row.get("detail") or row.get("reason"),
                "lastSeen": seen_at,
            }
        )
    return items


def collect_user_gated(seen_at: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in read_jsonl(USER_GATED):
        phrase = str(row.get("phrase") or "").strip()
        feedback_id = str(row.get("feedbackId") or "").strip()
        gate = str(row.get("gate") or "gated_review")
        junk = str(row.get("junkClass") or "user_flag")
        urn = str(row.get("urn") or "").strip()
        area = row.get("area")
        # Phrase optional for refresh-only gates; still collate with feedback id.
        key_phrase = phrase or f"feedback:{feedback_id or urn or 'unknown'}"
        item_id = stable_id(
            "user",
            KIND_USER,
            feedback_id or key_phrase,
            phrase,
            gate,
            junk,
        )
        action = "targeted_refresh" if gate == "gated_refresh" else "qa_or_feedback"
        items.append(
            {
                "id": item_id,
                "kind": KIND_USER,
                "source": "user-improvement-gated-candidates",
                "action": action,
                "phrase": phrase or None,
                "junkClass": junk,
                "gate": gate,
                "urn": urn or None,
                "area": area,
                "feedbackId": feedback_id or None,
                "detail": row.get("detail") or row.get("reason"),
                "lastSeen": seen_at,
            }
        )
    return items


def collect_spotcheck_digest_flags(seen_at: str) -> list[dict[str, Any]]:
    data = read_json(SPOTCHECK_DIGEST)
    if not isinstance(data, dict):
        return []
    schools = data.get("schools") or []
    items: list[dict[str, Any]] = []
    for school in schools:
        if not isinstance(school, dict):
            continue
        urn = str(school.get("urn") or "").strip()
        name = str(school.get("name") or "").strip()
        for flag in school.get("flags") or []:
            if not isinstance(flag, dict):
                continue
            code = str(flag.get("code") or "").strip()
            if code not in DIGEST_GATE_CODES:
                continue
            area = str(flag.get("area") or "").strip()
            excerpts = flag.get("excerpts") or []
            excerpt_key = ",".join(str(x) for x in excerpts[:4])
            kind = KIND_ETHOS if code == "possible_underclaim" else KIND_UNSUPPORTED
            item_id = stable_id("spotcheck-digest", kind, urn, code, area, excerpt_key)
            items.append(
                {
                    "id": item_id,
                    "kind": kind,
                    "source": "qualitative-spotcheck-latest",
                    "action": "targeted_refresh"
                    if kind == KIND_ETHOS
                    else "human_check",
                    "urn": urn or None,
                    "schoolName": name or None,
                    "la": school.get("la"),
                    "area": area or None,
                    "flagCode": code,
                    "severity": flag.get("severity"),
                    "detail": flag.get("detail"),
                    "excerpts": excerpts[:8] if isinstance(excerpts, list) else [],
                    "lastSeen": seen_at,
                }
            )
    return items


def collect_github_issues(limit: int) -> list[dict[str, Any]]:
    """Optional: open [user-improvement] issues still needing review."""
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        return []
    cmd = [
        "gh",
        "issue",
        "list",
        "--state",
        "open",
        "--limit",
        str(limit),
        "--json",
        "number,title,body,createdAt,url,labels",
        "--search",
        'in:title "[user-improvement]"',
    ]
    repo = os.environ.get("CHALLENGE_INTAKE_REPO") or os.environ.get("GITHUB_REPOSITORY")
    if repo:
        cmd.extend(["--repo", repo])
    try:
        proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return []
    try:
        issues = json.loads(proc.stdout or "[]")
    except json.JSONDecodeError:
        return []
    seen_at = utc_now()
    items: list[dict[str, Any]] = []
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        title = str(issue.get("title") or "")
        if "user-improvement" not in title.lower():
            continue
        number = issue.get("number")
        item_id = stable_id("gh-issue", KIND_ISSUE, str(number), title)
        items.append(
            {
                "id": item_id,
                "kind": KIND_ISSUE,
                "source": "github-issues",
                "action": "close_issue_and_feedback_done",
                "issueNumber": number,
                "issueUrl": issue.get("url"),
                "title": title,
                "createdAt": issue.get("createdAt"),
                "detail": (issue.get("body") or "")[:400],
                "lastSeen": seen_at,
            }
        )
    return items


def mark_done(
    queue: dict[str, dict[str, Any]],
    *,
    item_ids: list[str],
    feedback_ids: list[str],
    note: str | None,
    when: str,
) -> list[str]:
    touched: list[str] = []
    feedback_set = {f.strip() for f in feedback_ids if f.strip()}
    id_set = {i.strip() for i in item_ids if i.strip()}
    for item_id, row in queue.items():
        match = item_id in id_set
        if not match and feedback_set:
            fb = str(row.get("feedbackId") or "").strip()
            if fb and fb in feedback_set:
                match = True
        if not match:
            continue
        row["status"] = "done"
        row["doneAt"] = when
        if note:
            row["doneNote"] = note
        touched.append(item_id)
    return touched


def auto_close_learned(
    queue: dict[str, dict[str, Any]],
    phrases: set[str],
    when: str,
) -> int:
    closed = 0
    for row in queue.values():
        if str(row.get("status") or "open") != "open":
            continue
        phrase = str(row.get("phrase") or "").strip().lower()
        if not phrase or phrase not in phrases:
            continue
        if row.get("kind") not in {KIND_PHRASE, KIND_USER}:
            continue
        row["status"] = "done"
        row["doneAt"] = when
        row["doneNote"] = "auto-closed: phrase present in learned-qa-patterns.json"
        closed += 1
    return closed


def open_items(queue: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [
        row
        for row in queue.values()
        if str(row.get("status") or "open") == "open"
    ]
    kind_order = {
        KIND_ETHOS: 0,
        KIND_USER: 1,
        KIND_PHRASE: 2,
        KIND_UNSUPPORTED: 3,
        KIND_ISSUE: 4,
    }
    rows.sort(
        key=lambda r: (
            kind_order.get(str(r.get("kind")), 9),
            str(r.get("lastSeen") or ""),
            str(r.get("id") or ""),
        )
    )
    return rows


def review_commands_for(item: dict[str, Any]) -> list[str]:
    kind = str(item.get("kind") or "")
    cmds: list[str] = []
    if kind == KIND_PHRASE or (
        kind == KIND_USER and item.get("phrase") and item.get("gate") != "gated_refresh"
    ):
        path = (
            "output/spotcheck-human-gated-candidates.jsonl"
            if "spotcheck" in str(item.get("source") or "")
            else "output/user-improvement-gated-candidates.jsonl"
        )
        cmds.append(f"npm run qa:human-flags -- --jsonl {path}")
        cmds.append("npm run loop:qualitative-quality -- --force")
    if kind in {KIND_ETHOS, KIND_UNSUPPORTED} or (
        kind == KIND_USER and item.get("gate") == "gated_refresh"
    ):
        urn = item.get("urn")
        if urn:
            cmds.append(f"npm run enrich:qualitative -- --urn {urn}")
        else:
            cmds.append("# targeted URN refresh (recapture ethos / evidence)")
    if item.get("feedbackId"):
        cmds.append(f"npm run feedback:process -- done {item['feedbackId']}")
    if kind == KIND_ISSUE and item.get("issueNumber"):
        cmds.append(f"gh issue close {item['issueNumber']}")
        if item.get("feedbackId"):
            cmds.append(f"npm run feedback:process -- done {item['feedbackId']}")
    cmds.append(
        f"npm run review:human-gated -- --mark-done {item['id']}"
    )
    return cmds


def build_markdown(payload: dict[str, Any]) -> str:
    counts = payload.get("counts") or {}
    lines = [
        f"# Human-gated review digest — {payload.get('ranAt')}",
        "",
        f"- Mode: `{'dry-run' if payload.get('dryRun') else 'collate'}`",
        f"- Open items: **{payload.get('openCount', 0)}** "
        f"(queue total `{payload.get('queueSize', 0)}` · "
        f"done `{counts.get('done', 0)}` · ignored `{counts.get('ignored', 0)}`)",
        f"- New / refreshed this run: `{payload.get('upserted', 0)}`",
        f"- Auto-closed (already learned): `{payload.get('autoClosedLearned', 0)}`",
        "",
        "## How to review / mark done",
        "",
        "1. **Ambiguous chrome phrases** → confirm junk, then:",
        "   - `npm run qa:human-flags -- --jsonl output/spotcheck-human-gated-candidates.jsonl`",
        "   - or `… output/user-improvement-gated-candidates.jsonl`",
        "   - then `npm run loop:qualitative-quality -- --force`",
        "2. **Ethos / underclaim / missing-point** → targeted recapture "
        "(`enrich:qualitative --urn …`), not phrase strip.",
        "3. **Parent thumbs / improvement flags** → after fix, "
        "`npm run feedback:process -- done <feedbackId>`.",
        "4. **Close the digest ledger row** → "
        "`npm run review:human-gated -- --mark-done <id>` "
        "(or `--mark-done-feedback <uuid>`).",
        "5. Optional: re-run collation with `--auto-close-learned` after applying "
        "phrases so learned rows drop from open.",
        "",
        "## Open by kind",
        "",
    ]
    by_kind = Counter(str(i.get("kind")) for i in payload.get("items") or [])
    if not by_kind:
        lines.append("_No open human-gated items._")
    else:
        for kind, n in by_kind.most_common():
            lines.append(f"- `{kind}`: {n}")

    lines += ["", "## Items", ""]
    for item in payload.get("items") or []:
        title_bits = [f"**{item.get('kind')}**", f"`{item.get('id')}`"]
        if item.get("schoolName"):
            title_bits.append(str(item["schoolName"]))
        if item.get("urn"):
            title_bits.append(f"(URN `{item['urn']}`)")
        if item.get("phrase"):
            title_bits.append(f"— phrase `{item['phrase']}`")
        lines.append("- " + " ".join(title_bits))
        meta = []
        if item.get("junkClass"):
            meta.append(f"class `{item['junkClass']}`")
        if item.get("gate"):
            meta.append(f"gate `{item['gate']}`")
        if item.get("area"):
            meta.append(f"area `{item['area']}`")
        if item.get("flagCode"):
            meta.append(f"flag `{item['flagCode']}`")
        if item.get("feedbackId"):
            meta.append(f"feedback `{item['feedbackId']}`")
        if item.get("issueUrl"):
            meta.append(f"[issue]({item['issueUrl']})")
        if item.get("source"):
            meta.append(f"source `{item['source']}`")
        if meta:
            lines.append(f"  - {'; '.join(meta)}")
        if item.get("detail"):
            lines.append(f"  - {item['detail']}")
        excerpts = item.get("excerpts") or []
        if excerpts:
            shown = ", ".join(str(x) for x in excerpts[:5])
            lines.append(f"  - excerpts: {shown}")
        cmds = review_commands_for(item)
        if cmds:
            lines.append("  - review:")
            for cmd in cmds[:4]:
                lines.append(f"    - `{cmd}`")

    lines += [
        "",
        "## Artefacts",
        "",
        f"- Digest JSON: `{DIGEST_JSON.relative_to(ROOT)}`",
        f"- Digest MD: `{DIGEST_MD.relative_to(ROOT)}`",
        f"- Durable queue: `{QUEUE_JSONL.relative_to(ROOT)}`",
        "",
        "## Notes",
        "",
    ]
    for note in payload.get("notes") or []:
        lines.append(f"- {note}")
    if not payload.get("notes"):
        lines.append("- (none)")
    lines.append("")
    return "\n".join(lines)


def open_or_update_issue(payload: dict[str, Any], repo: str | None) -> str | None:
    """Create a weekly summary issue when openCount > 0."""
    open_count = int(payload.get("openCount") or 0)
    if open_count <= 0:
        return None
    week = datetime.now(timezone.utc).strftime("%G-W%V")
    title = f"[human-gated-review] {week} · {open_count} open"
    body = (
        "Weekly collation of human-gated qualitative improvement signals.\n\n"
        f"Open items: **{open_count}**\n\n"
        "Digest: `public/data/packs/human-gated-review-latest.md`\n"
        "Queue: `output/human-gated-review-queue.jsonl`\n\n"
        "Do **not** auto-apply. Follow the digest “How to review / mark done” section.\n\n"
        "```json\n"
        + json.dumps(
            {
                "ranAt": payload.get("ranAt"),
                "openCount": open_count,
                "countsByKind": dict(
                    Counter(str(i.get("kind")) for i in payload.get("items") or [])
                ),
                "itemIds": [i.get("id") for i in (payload.get("items") or [])[:40]],
            },
            indent=2,
        )
        + "\n```\n"
    )
    cmd = [
        "gh",
        "issue",
        "create",
        "--title",
        title,
        "--body",
        body,
        "--label",
        "product-feedback",
    ]
    if repo:
        cmd.extend(["--repo", repo])
    try:
        proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except (FileNotFoundError, subprocess.CalledProcessError) as err:
        msg = getattr(err, "stderr", None) or str(err)
        print(f"open-issue failed: {msg}", file=sys.stderr)
        return None
    url = (proc.stdout or "").strip().splitlines()[-1] if proc.stdout else None
    return url


def collate(
    *,
    dry_run: bool,
    include_issues: bool,
    issue_limit: int,
    auto_close: bool,
    open_issue: bool,
    mark_done_ids: list[str],
    mark_done_feedback: list[str],
    done_note: str | None,
    digest_json: Path,
    digest_md: Path,
    queue_path: Path,
) -> dict[str, Any]:
    seen_at = utc_now()
    queue = load_queue(queue_path)
    notes: list[str] = []

    if mark_done_ids or mark_done_feedback:
        touched = mark_done(
            queue,
            item_ids=mark_done_ids,
            feedback_ids=mark_done_feedback,
            note=done_note,
            when=seen_at,
        )
        notes.append(f"Marked done: {len(touched)} item(s)")
        if not touched:
            notes.append("No matching open/queue ids for --mark-done*")

    collected: list[dict[str, Any]] = []
    collected.extend(collect_spotcheck_phrase_candidates(seen_at))
    collected.extend(collect_user_gated(seen_at))
    collected.extend(collect_spotcheck_digest_flags(seen_at))
    if include_issues:
        gh_items = collect_github_issues(issue_limit)
        collected.extend(gh_items)
        if not gh_items:
            notes.append("GitHub [user-improvement] issues: none or gh unavailable")

    upserted = 0
    for item in collected:
        before = queue.get(item["id"])
        upsert(queue, item, seen_at=seen_at)
        if before is None:
            upserted += 1

    auto_closed = 0
    if auto_close:
        auto_closed = auto_close_learned(queue, learned_phrases(), seen_at)
        if auto_closed:
            notes.append(
                f"Auto-closed {auto_closed} open phrase item(s) already in learned QA"
            )

    # Source presence notes (helps when PR #203/#204 not yet merged).
    if not SPOTCHECK_GATED.is_file() and not any(
        str(r.get("autoLearn") or "").lower() == "gated"
        for r in read_jsonl(SPOTCHECK_FLAGS)
    ):
        notes.append(
            "No spotcheck gated JSONL yet "
            "(expects output/spotcheck-human-gated-candidates.jsonl after auto-learn PR)"
        )
    if not USER_GATED.is_file():
        notes.append(
            "No user-improvement gated JSONL yet "
            "(expects output/user-improvement-gated-candidates.jsonl after thumbs PR)"
        )
    if not SPOTCHECK_DIGEST.is_file():
        notes.append("Missing qualitative-spotcheck-latest.json — digest flags skipped")

    status_counts = Counter(str(r.get("status") or "open") for r in queue.values())
    items = open_items(queue)
    payload: dict[str, Any] = {
        "ranAt": seen_at,
        "dryRun": dry_run,
        "openCount": len(items),
        "queueSize": len(queue),
        "upserted": upserted,
        "autoClosedLearned": auto_closed,
        "counts": {
            "open": status_counts.get("open", 0),
            "done": status_counts.get("done", 0),
            "ignored": status_counts.get("ignored", 0),
            "byKind": dict(Counter(str(i.get("kind")) for i in items)),
        },
        "sources": {
            "spotcheckGated": str(SPOTCHECK_GATED.relative_to(ROOT)),
            "spotcheckFlags": str(SPOTCHECK_FLAGS.relative_to(ROOT)),
            "userGated": str(USER_GATED.relative_to(ROOT)),
            "spotcheckDigest": str(SPOTCHECK_DIGEST.relative_to(ROOT)),
            "queue": str(queue_path.relative_to(ROOT)),
        },
        "items": items,
        "notes": notes,
        "issueUrl": None,
    }

    if open_issue and not dry_run:
        repo = os.environ.get("CHALLENGE_INTAKE_REPO") or os.environ.get(
            "GITHUB_REPOSITORY"
        )
        payload["issueUrl"] = open_or_update_issue(payload, repo)
        if payload["issueUrl"]:
            notes.append(f"Opened summary issue: {payload['issueUrl']}")
            payload["notes"] = notes

    md = build_markdown(payload)

    if dry_run:
        print(md)
        print(json.dumps({"openCount": payload["openCount"], "dryRun": True}, indent=2))
        return payload

    queue_rows = sorted(
        queue.values(),
        key=lambda r: (str(r.get("status") or ""), str(r.get("lastSeen") or ""), str(r.get("id"))),
    )
    write_jsonl(queue_path, queue_rows)
    digest_json.parent.mkdir(parents=True, exist_ok=True)
    digest_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    digest_md.write_text(md, encoding="utf-8")
    print(
        json.dumps(
            {
                "ranAt": seen_at,
                "openCount": payload["openCount"],
                "queueSize": payload["queueSize"],
                "upserted": upserted,
                "autoClosedLearned": auto_closed,
                "digestJson": str(digest_json.relative_to(ROOT)),
                "digestMd": str(digest_md.relative_to(ROOT)),
                "queue": str(queue_path.relative_to(ROOT)),
                "issueUrl": payload.get("issueUrl"),
            },
            indent=2,
        )
    )
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print digest to stdout without writing queue/digest files",
    )
    parser.add_argument(
        "--include-issues",
        action="store_true",
        default=True,
        help="Include open GitHub [user-improvement] issues (default on)",
    )
    parser.add_argument(
        "--no-include-issues",
        action="store_false",
        dest="include_issues",
        help="Skip GitHub issue scan",
    )
    parser.add_argument("--issue-limit", type=int, default=50)
    parser.add_argument(
        "--auto-close-learned",
        action="store_true",
        help="Mark open phrase items done when already in learned-qa-patterns.json",
    )
    parser.add_argument(
        "--open-issue",
        action="store_true",
        help="Open a weekly summary GitHub issue when openCount > 0",
    )
    parser.add_argument(
        "--mark-done",
        action="append",
        default=[],
        help="Mark queue id done (repeatable)",
    )
    parser.add_argument(
        "--mark-done-feedback",
        action="append",
        default=[],
        help="Mark items with this feedbackId done (repeatable)",
    )
    parser.add_argument("--done-note", default=None, help="Note stored on --mark-done*")
    parser.add_argument(
        "--digest-json",
        type=Path,
        default=DIGEST_JSON,
        help="Override digest JSON path",
    )
    parser.add_argument(
        "--digest-md",
        type=Path,
        default=DIGEST_MD,
        help="Override digest markdown path",
    )
    parser.add_argument(
        "--queue",
        type=Path,
        default=QUEUE_JSONL,
        help="Override durable queue JSONL path",
    )
    args = parser.parse_args()

    collate(
        dry_run=args.dry_run,
        include_issues=args.include_issues,
        issue_limit=args.issue_limit,
        auto_close=args.auto_close_learned,
        open_issue=args.open_issue,
        mark_done_ids=args.mark_done,
        mark_done_feedback=args.mark_done_feedback,
        done_note=args.done_note,
        digest_json=args.digest_json,
        digest_md=args.digest_md,
        queue_path=args.queue,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
