#!/usr/bin/env python3
"""Attach Cursor/OpenAI/deterministic narratives to an existing capture sidecar.

Reuses scanned evidence in output/qualitative-capture.json — no website re-crawl.

Usage:
  pip install -r requirements-data.txt
  CURSOR_API_KEY=crsr_... python3 scripts/synthesize-qualitative.py --limit 2
  # Selective: only schools with enough evidence, only areas missing narratives
  python3 scripts/synthesize-qualitative.py --provider none --only-missing --min-documented-areas 2
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
DEFAULT_CAPTURE = ROOT / "output" / "qualitative-capture.json"
DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Synthesize parent narratives onto an existing qualitative capture sidecar."
    )
    parser.add_argument("--capture", type=Path, default=DEFAULT_CAPTURE)
    parser.add_argument("--index", type=Path, default=DEFAULT_INDEX)
    parser.add_argument("--limit", type=int, default=0, help="0 = all eligible records")
    parser.add_argument("--urn", action="append", default=[], help="Only these URNs (repeatable)")
    parser.add_argument(
        "--provider",
        choices=("auto", "cursor", "openai", "none"),
        default="none",
        help="none = free deterministic (default); cursor/auto/openai = paid polish",
    )
    parser.add_argument("--model", default="")
    parser.add_argument(
        "--only-missing",
        action="store_true",
        help="Skip schools/areas that already have narrativeSummary",
    )
    parser.add_argument(
        "--min-documented-areas",
        type=int,
        default=-1,
        help=(
            "Require this many evidenced areas before synthesizing a school. "
            "Default: 2 for provider=none, 4 for paid providers."
        ),
    )
    parser.add_argument(
        "--min-signals",
        type=int,
        default=1,
        help="Min signals (or any offerings) for an area to count as documented",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore selective gates (still respects --urn/--limit)",
    )
    parser.add_argument("--no-merge", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    sys.path.insert(0, str(CAPTURE_ROOT))
    from school_capture.analysis.synthesis import synthesize_record
    from school_capture.models import QualitativeCaptureIndex
    from school_capture.synth_policy import (
        DEFAULT_CURSOR_MIN_DOCUMENTED_AREAS,
        DEFAULT_MIN_DOCUMENTED_AREAS,
        documented_area_count,
        evidence_priority,
        record_needs_synthesis,
    )

    if not args.capture.is_file():
        print(f"Missing capture sidecar: {args.capture}", file=sys.stderr)
        return 1

    # Coverage-first / min-cost: paid providers need richer evidence.
    paid = args.provider in {"auto", "cursor", "openai"}
    min_documented = args.min_documented_areas
    if min_documented < 0:
        min_documented = (
            DEFAULT_CURSOR_MIN_DOCUMENTED_AREAS
            if paid
            else DEFAULT_MIN_DOCUMENTED_AREAS
        )

    payload = json.loads(args.capture.read_text(encoding="utf-8"))
    index = QualitativeCaptureIndex.from_dict(payload)
    records = list(index.records)

    if args.urn:
        wanted = {str(u).strip() for u in args.urn}
        records = [r for r in records if r.urn in wanted]

    skipped_thin = 0
    skipped_done = 0
    selected = []
    for record in records:
        if args.force:
            selected.append(record)
            continue
        if not record_needs_synthesis(
            record,
            only_missing=args.only_missing,
            min_documented_areas=min_documented,
            min_signals=args.min_signals,
        ):
            # Distinguish thin vs already complete for ops stats
            documented = documented_area_count(
                record, min_signals=args.min_signals
            )
            if documented < min_documented:
                skipped_thin += 1
            else:
                skipped_done += 1
            continue
        selected.append(record)

    # Richest schools first so a small Cursor budget buys the most quality.
    selected.sort(key=lambda r: evidence_priority(r, min_signals=args.min_signals))

    if args.limit and args.limit > 0:
        selected = selected[: args.limit]

    if not selected:
        print(
            "No capture records selected "
            f"(thin={skipped_thin}, already-complete={skipped_done}).",
            file=sys.stderr,
        )
        return 0

    use_llm = args.provider != "none"
    model = args.model or None
    print(
        f"Synthesizing {len(selected)} school(s) with provider={args.provider} "
        f"(skipped thin={skipped_thin}, done={skipped_done})",
        file=sys.stderr,
    )

    updated: dict[str, object] = {}
    method_counts: dict[str, int] = {}
    for i, record in enumerate(selected, 1):
        print(f"[{i}/{len(selected)}] {record.urn} {record.name}", file=sys.stderr)
        out = synthesize_record(
            record,
            use_llm=use_llm,
            provider=args.provider,  # type: ignore[arg-type]
            model=model,
            cwd=str(ROOT),
            only_missing=bool(args.only_missing),
            preserve_llm=True,
        )
        updated[out.urn] = out
        for area in out.areas:
            key = area.synthesisMethod or "none"
            method_counts[key] = method_counts.get(key, 0) + 1

    new_records = []
    for record in index.records:
        replacement = updated.get(record.urn)
        new_records.append(replacement if replacement is not None else record)
    index.records = new_records
    index.schoolCount = len(new_records)
    index.stats = {
        **(index.stats or {}),
        "synthesizedSchools": len(updated),
        "synthesisMethods": method_counts,
        "synthesisProvider": args.provider,
        "skippedThin": skipped_thin,
        "skippedAlreadyComplete": skipped_done,
        "onlyMissing": bool(args.only_missing),
        "minDocumentedAreas": min_documented,
        "cursorKeyPresent": bool(os.environ.get("CURSOR_API_KEY")),
        "openaiKeyPresent": bool(os.environ.get("OPENAI_API_KEY")),
    }

    if args.dry_run:
        print(json.dumps(index.stats, indent=2))
        return 0

    args.capture.parent.mkdir(parents=True, exist_ok=True)
    args.capture.write_text(
        json.dumps(index.to_dict(), indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {args.capture}", file=sys.stderr)

    # Close the loop: citation-validated Cursor/OpenAI URLs → discovery lexicon.
    try:
        from school_capture.citation_learning import apply_citation_learning

        learn_stats = apply_citation_learning(args.capture)
        index.stats["citationLearning"] = learn_stats
        print(
            "Citation learning: "
            f"{learn_stats.get('citationEvents', 0)} cited URLs → "
            f"{learn_stats.get('termCount', 0)} terms",
            file=sys.stderr,
        )
    except Exception as exc:  # noqa: BLE001 — learning must not fail the synth write
        index.stats["citationLearningError"] = str(exc)[:200]
        print(f"Citation learning skipped: {exc}", file=sys.stderr)

    print(json.dumps(index.stats, indent=2))

    if args.no_merge:
        return 0

    merge_cmd = [
        sys.executable,
        str(CAPTURE_ROOT / "scripts" / "merge-qualitative.py"),
        "--index",
        str(args.index),
        "--capture",
        str(args.capture),
    ]
    print("Merging:", " ".join(merge_cmd), file=sys.stderr)
    subprocess.run(merge_cmd, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
