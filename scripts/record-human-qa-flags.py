#!/usr/bin/env python3
"""Record human-confirmed junk phrases into qualitative ingest gates.

Bridges maintainer / content-review flags into the same store the automated
QA loop uses (`output/learned-qa-patterns.json`), so the next
`loop:qualitative-quality` / crawl drops matching chrome without a recrawl
of the whole corpus.

Does **not** scrape private shortlists. Feed phrases you have already
judged junk (content-review lab, data-challenge notes, or manual review).

Examples:
  python3 scripts/record-human-qa-flags.py --phrase "Cookie settings" --class nav
  python3 scripts/record-human-qa-flags.py --jsonl output/human-qa-flags.jsonl
  echo '{"phrase":"Skip to main content","junkClass":"nav"}' \\
    | python3 scripts/record-human-qa-flags.py --stdin-jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / "tools" / "school-capture"
if str(CAPTURE) not in sys.path:
    sys.path.insert(0, str(CAPTURE))

from school_capture.learned_qa_patterns import (  # noqa: E402
    record_qa_learning_events,
)


def load_jsonl(path: Path) -> list[dict[str, str]]:
    events: list[dict[str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict) and row.get("phrase"):
            events.append(
                {
                    "phrase": str(row["phrase"]),
                    "junkClass": str(
                        row.get("junkClass") or row.get("class") or "human"
                    ),
                }
            )
    return events


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phrase", action="append", default=[], help="Junk phrase")
    parser.add_argument(
        "--class",
        dest="junk_class",
        default="human",
        help="Junk class tag (default: human)",
    )
    parser.add_argument("--jsonl", type=Path, help="Read events from JSONL file")
    parser.add_argument(
        "--stdin-jsonl",
        action="store_true",
        help="Read JSONL events from stdin",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print events without writing learned-qa-patterns.json",
    )
    args = parser.parse_args()

    events: list[dict[str, str]] = []
    for phrase in args.phrase:
        events.append({"phrase": phrase, "junkClass": args.junk_class})
    if args.jsonl:
        events.extend(load_jsonl(args.jsonl))
    if args.stdin_jsonl:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(row, dict) and row.get("phrase"):
                events.append(
                    {
                        "phrase": str(row["phrase"]),
                        "junkClass": str(
                            row.get("junkClass") or row.get("class") or args.junk_class
                        ),
                    }
                )

    if not events:
        print("No phrases provided", file=sys.stderr)
        return 1

    if args.dry_run:
        print(json.dumps({"events": events}, indent=2))
        return 0

    result = record_qa_learning_events(events)
    print(
        json.dumps(
            {
                "added": result.get("added"),
                "phraseCount": result.get("phraseCount"),
                "eventCount": result.get("eventCount"),
                "updatedAt": result.get("updatedAt"),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
