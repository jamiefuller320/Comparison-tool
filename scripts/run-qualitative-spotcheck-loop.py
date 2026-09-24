#!/usr/bin/env python3
"""Continuous improvement: source-vs-site qualitative fidelity spot-check.

Periodically samples a small set of published qualitative shards, fetches the
live school website (and a few cited pages), and compares parent-facing depth
against the human fidelity bar (chrome pollution, PDF junk, overclaim,
possible underclaim). Writes digests beside the other qualitative loops and
emits chrome candidates for ``qa:human-flags``.

Does **not** mutate extractor internals — safe to run alongside chrome/PDF
polish PRs. Coverage stays in ``loop:qualitative``; corpus cleanup stays in
``loop:qualitative-quality``.

Usage:
  python3 scripts/run-qualitative-spotcheck-loop.py --dry-run
  python3 scripts/run-qualitative-spotcheck-loop.py --sample-size 7
  python3 scripts/run-qualitative-spotcheck-loop.py --urn 147519 --urn 100598
  python3 scripts/run-qualitative-spotcheck-loop.py --record-flags
  python3 scripts/run-qualitative-spotcheck-loop.py --strict
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from qualitative_spotcheck import (  # noqa: E402
    DEFAULT_MAX_PAGES,
    DEFAULT_SAMPLE_SIZE,
    run_spotcheck,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sample-size",
        type=int,
        default=DEFAULT_SAMPLE_SIZE,
        help=f"Schools to spot-check (default {DEFAULT_SAMPLE_SIZE})",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="RNG seed (default: stable hash of UTC date)",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=DEFAULT_MAX_PAGES,
        help=f"Max HTML pages to fetch per school (default {DEFAULT_MAX_PAGES})",
    )
    parser.add_argument(
        "--urn",
        action="append",
        default=[],
        help="Force-include URN (repeatable); with only these when --only-listed",
    )
    parser.add_argument(
        "--only-listed",
        action="store_true",
        help="Spot-check only the --urn list (no random fill)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Select sample + write digest skeleton; no live fetches",
    )
    parser.add_argument(
        "--record-flags",
        action="store_true",
        help="Also append chrome candidates into learned-qa-patterns.json",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 when any school verdict is fail (CI optional gate)",
    )
    args = parser.parse_args(argv)

    only = list(args.urn) if args.only_listed and args.urn else None
    prefer = list(args.urn) if args.urn and not args.only_listed else None

    payload = run_spotcheck(
        sample_size=max(1, args.sample_size),
        seed=args.seed,
        max_pages=max(1, args.max_pages),
        only_urns=only,
        prefer_urns=prefer,
        dry_run=args.dry_run,
        record_flags=args.record_flags,
        strict=args.strict,
    )
    print(json.dumps(payload, indent=2, ensure_ascii=False))

    if args.strict and int(payload.get("failCount") or 0) > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
