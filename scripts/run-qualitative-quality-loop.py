#!/usr/bin/env python3
"""Dedicated qualitative *quality* loop (separate from coverage ingest).

Programme: analyse suspects → apply current heuristics + learned phrases to the
full sidecar → merge into schools-index → write digest.

This is the efficient cleanup path for rule improvements: no recrawl required.
Coverage expansion stays in run-qualitative-loop.py / qualitative-loop.yml.

Usage:
  python3 scripts/run-qualitative-quality-loop.py
  python3 scripts/run-qualitative-quality-loop.py --limit 250 --min-score 1.5
  python3 scripts/run-qualitative-quality-loop.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
sys.path.insert(0, str(CAPTURE_ROOT))

from school_capture.qa_heuristics import rank_suspects  # noqa: E402
from school_capture.sidecar import load_capture_index  # noqa: E402

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
DEFAULT_CAPTURE = ROOT / "output" / "qualitative-capture.json"
DEFAULT_LEARNED = ROOT / "output" / "learned-qa-patterns.json"
QA_DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-qa-latest.json"
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-quality-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "qualitative-quality-loop-latest.md"


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def analyse_corpus(*, min_score: float) -> dict:
    """Cheap before/after analysis over the whole sidecar."""
    index = load_capture_index(DEFAULT_CAPTURE)
    records = list(index.records) if index else []
    suspects = rank_suspects(records, limit=10_000, min_score=min_score)
    by_flag: dict[str, int] = {}
    for s in suspects:
        for f in s.flags:
            by_flag[f] = by_flag.get(f, 0) + 1
    return {
        "recordCount": len(records),
        "suspectCount": len(suspects),
        "flagCounts": dict(sorted(by_flag.items(), key=lambda kv: (-kv[1], kv[0]))),
        "topSuspects": [
            {"urn": s.urn, "name": s.name, "score": round(s.score, 2), "flags": s.flags}
            for s in suspects[:12]
        ],
    }


def write_digest(payload: dict) -> None:
    DIGEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    DIGEST_JSON.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    before = payload.get("before") or {}
    after = payload.get("after") or {}
    qa = payload.get("qa") or {}
    lines = [
        f"# Qualitative quality loop — {payload.get('ranAt')}",
        "",
        f"- Mode: `{'dry-run' if payload.get('dryRun') else 'apply'}`",
        f"- Provider: `{payload.get('provider')}`",
        f"- Limit / min-score: `{payload.get('limit')}` / `{payload.get('minScore')}`",
        f"- Records: `{before.get('recordCount', 0)}`",
        f"- Suspects before → after: `{before.get('suspectCount', 0)}` → "
        f"`{after.get('suspectCount', 0)}`",
        f"- QA reviewed / changed: `{qa.get('reviewed', 0)}` / "
        f"`{qa.get('changedSchools', 0)}`",
        f"- Findings applied: `{qa.get('findingsApplied', 0)}`",
        f"- Learned phrases added: `{qa.get('learningAdded', 0)}`",
        f"- Merged to index: `{payload.get('merged')}`",
        "",
        "## Top flag counts (before)",
        "",
    ]
    for flag, count in (before.get("flagCounts") or {}).items():
        lines.append(f"- `{flag}`: {count}")
    if not before.get("flagCounts"):
        lines.append("- (none)")
    notes = payload.get("notes") or []
    if notes:
        lines.extend(["", "## Notes", ""])
        for note in notes:
            lines.append(f"- {note}")
    lines.append("")
    DIGEST_MD.write_text("\n".join(lines), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Apply qualitative quality rules across the full sidecar"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=250,
        help="Max suspect schools to review (default 250 ≈ full Hampshire sidecar)",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=1.5,
        help="Minimum suspicion score (default 1.5)",
    )
    parser.add_argument(
        "--provider",
        choices=("none", "auto", "cursor", "openai"),
        default="none",
        help="QA reviewer (default none = free heuristics)",
    )
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Update sidecar only; do not merge into schools-index",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    notes: list[str] = []
    before = analyse_corpus(min_score=args.min_score)
    notes.append(
        f"Before: {before['suspectCount']} suspects across "
        f"{before['recordCount']} records."
    )

    if args.dry_run:
        payload = {
            "ranAt": datetime.now(timezone.utc).isoformat(),
            "dryRun": True,
            "limit": args.limit,
            "minScore": args.min_score,
            "provider": args.provider,
            "before": before,
            "after": before,
            "qa": {
                "reviewed": 0,
                "changedSchools": 0,
                "findingsApplied": 0,
                "learningAdded": 0,
            },
            "merged": False,
            "notes": notes + ["Dry run — no sidecar mutations."],
        }
        write_digest(payload)
        print(json.dumps(payload, indent=2))
        return 0

    qa_cmd = [
        sys.executable,
        str(ROOT / "scripts" / "qa-qualitative.py"),
        "--capture",
        str(DEFAULT_CAPTURE),
        "--learned",
        str(DEFAULT_LEARNED),
        "--digest",
        str(QA_DIGEST_JSON),
        "--limit",
        str(args.limit),
        "--min-score",
        str(args.min_score),
        "--provider",
        args.provider,
    ]
    run(qa_cmd)

    qa_stats = {
        "reviewed": 0,
        "changedSchools": 0,
        "findingsApplied": 0,
        "learningAdded": 0,
        "provider": args.provider,
    }
    if QA_DIGEST_JSON.is_file():
        try:
            qa_payload = json.loads(QA_DIGEST_JSON.read_text(encoding="utf-8"))
            qa_stats = {
                "reviewed": int(qa_payload.get("reviewed") or 0),
                "changedSchools": int(qa_payload.get("changedSchools") or 0),
                "findingsApplied": int(qa_payload.get("findingsApplied") or 0),
                "learningAdded": int(qa_payload.get("learningAdded") or 0),
                "provider": qa_payload.get("provider") or args.provider,
            }
            notes.extend(qa_payload.get("notes") or [])
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            notes.append("Could not parse qualitative-qa-latest.json after QA.")

    merged = False
    if not args.no_merge and int(qa_stats.get("changedSchools") or 0) > 0:
        merge_cmd = [
            sys.executable,
            str(CAPTURE_ROOT / "scripts" / "merge-qualitative.py"),
            "--index",
            str(DEFAULT_INDEX),
            "--capture",
            str(DEFAULT_CAPTURE),
        ]
        run(merge_cmd)
        merged = True
        notes.append("Merged cleaned sidecar into schools-index.")
    elif int(qa_stats.get("changedSchools") or 0) == 0:
        notes.append("No schools changed — merge skipped.")
    else:
        notes.append("Merge skipped (--no-merge).")

    after = analyse_corpus(min_score=args.min_score)
    notes.append(
        f"After: {after['suspectCount']} suspects across {after['recordCount']} records."
    )

    payload = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "dryRun": False,
        "limit": args.limit,
        "minScore": args.min_score,
        "provider": args.provider,
        "before": before,
        "after": after,
        "qa": qa_stats,
        "merged": merged,
        "notes": notes,
    }
    write_digest(payload)
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
