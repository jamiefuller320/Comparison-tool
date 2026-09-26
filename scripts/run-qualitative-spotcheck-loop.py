#!/usr/bin/env python3
"""Continuous improvement: source-vs-site qualitative fidelity spot-check.

Runs **after** the daily quality apply (coverage → quality → spot-check).
Samples a **fixed small set** of published shards (~7 by default; hard-capped),
fetches live school HTML, and compares parent-facing depth against the human
fidelity bar (chrome pollution, PDF junk, overclaim, possible underclaim).

Safe chrome / PDF / nav phrases auto-integrate into ``learned-qa-patterns.json``
so the **next** quality apply can strip them corpus-wide. Ethos underclaim and
ambiguous candidates stay human-gated (``qa:human-flags``).

Does **not** mutate extractor internals. Coverage stays in ``loop:qualitative``;
corpus cleanup stays in ``loop:qualitative-quality``.

Usage:
  python3 scripts/run-qualitative-spotcheck-loop.py --dry-run
  python3 scripts/run-qualitative-spotcheck-loop.py --sample-size 7
  python3 scripts/run-qualitative-spotcheck-loop.py --urn 147519 --urn 100598
  python3 scripts/run-qualitative-spotcheck-loop.py --no-auto-learn
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
    MAX_SAMPLE_SIZE,
    run_spotcheck,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sample-size",
        type=int,
        default=DEFAULT_SAMPLE_SIZE,
        help=(
            f"Schools to spot-check (default {DEFAULT_SAMPLE_SIZE}; "
            f"hard-capped at {MAX_SAMPLE_SIZE} — does not grow with corpus size)"
        ),
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
        "--auto-learn",
        dest="auto_learn",
        action="store_true",
        default=True,
        help=(
            "Record safe chrome/PDF/nav candidates into learned-qa-patterns.json "
            "(default on)"
        ),
    )
    parser.add_argument(
        "--no-auto-learn",
        dest="auto_learn",
        action="store_false",
        help="Digest + candidate files only; do not write the learned store",
    )
    parser.add_argument(
        "--record-flags",
        action="store_true",
        help=(
            "Also record human-gated chrome candidates (aggressive; "
            "ethos/underclaim still never auto-learn)"
        ),
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 when any school verdict is fail (CI optional gate)",
    )
    args = parser.parse_args(argv)

    only = list(args.urn) if args.only_listed and args.urn else None
    prefer = list(args.urn) if args.urn and not args.only_listed else None
    sample_size = max(1, min(int(args.sample_size), MAX_SAMPLE_SIZE))

    payload = run_spotcheck(
        sample_size=sample_size,
        seed=args.seed,
        max_pages=max(1, args.max_pages),
        only_urns=only,
        prefer_urns=prefer,
        dry_run=args.dry_run,
        auto_learn=bool(args.auto_learn),
        record_flags=args.record_flags,
        strict=args.strict,
    )
    print(json.dumps(payload, indent=2, ensure_ascii=False))

    if args.strict and int(payload.get("failCount") or 0) > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
