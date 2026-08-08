#!/usr/bin/env python3
"""Qualitative evidence QA: heuristic pre-screen + optional Cursor/OpenAI review.

Ranks the worst schools, strips clear junk, and learns confirmed junk phrases
into output/learned-qa-patterns.json so later captures inherit the fix.

Usage:
  python3 scripts/qa-qualitative.py --limit 8
  CURSOR_API_KEY=… python3 scripts/qa-qualitative.py --limit 5 --provider cursor
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
sys.path.insert(0, str(CAPTURE_ROOT))

from school_capture.qa_pipeline import run_qualitative_qa  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="QA qualitative website evidence")
    parser.add_argument(
        "--capture",
        type=Path,
        default=ROOT / "output" / "qualitative-capture.json",
    )
    parser.add_argument(
        "--digest",
        type=Path,
        default=ROOT / "public" / "data" / "packs" / "qualitative-qa-latest.json",
    )
    parser.add_argument(
        "--queue",
        type=Path,
        default=ROOT / "output" / "qualitative-qa-queue.json",
    )
    parser.add_argument(
        "--learned",
        type=Path,
        default=ROOT / "output" / "learned-qa-patterns.json",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=8,
        help="Max suspect schools to review (default 8)",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=2.0,
        help="Minimum suspicion score to review",
    )
    parser.add_argument(
        "--provider",
        choices=("none", "auto", "cursor", "openai"),
        default="none",
        help="Agent reviewer (default none = free heuristics only)",
    )
    parser.add_argument("--model", default="", help="Optional model override")
    parser.add_argument(
        "--no-apply",
        action="store_true",
        help="Report only; do not mutate the capture sidecar",
    )
    parser.add_argument(
        "--no-learn",
        action="store_true",
        help="Do not append confirmed junk phrases to the learned store",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    env_provider = args.provider
    result = run_qualitative_qa(
        capture_path=args.capture,
        digest_path=args.digest,
        queue_path=args.queue,
        learned_path=args.learned,
        limit=max(0, args.limit),
        min_score=float(args.min_score),
        provider=env_provider,
        model=args.model or None,
        apply=not args.no_apply,
        learn=not args.no_learn,
        dry_run=args.dry_run,
        cwd=str(ROOT),
    )
    print(json.dumps(result.to_dict(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
