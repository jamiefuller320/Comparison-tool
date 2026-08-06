#!/usr/bin/env python3
"""CLI for the experimental qualitative data capture engine."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from school_capture.engine import CaptureEngine  # noqa: E402
from school_capture.index_loader import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    filter_schools,
    load_schools_index,
    resolve_comparison_tool_index,
)
from school_capture.learned_terms import (  # noqa: E402
    build_from_capture_file,
    load_learned_term_counts,
    load_learned_terms,
    save_learned_terms,
)
from school_capture.models import QualitativeCaptureRecord, SchoolInput, today_iso  # noqa: E402
from school_capture.page_cache import select_stale_urns  # noqa: E402
from school_capture.sidecar import (  # noqa: E402
    existing_urns,
    load_capture_index,
    save_progress,
    upsert_records,
)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=(
            "Experimental qualitative capture for schoolcompass.uk — "
            "curriculum, enrichment, ethos and related areas from "
            "school websites, local news, and social media."
        )
    )
    p.add_argument(
        "--comparison-tool",
        type=Path,
        help="Path to Comparison-tool repo root (for schools-index.json)",
    )
    p.add_argument(
        "--index",
        type=Path,
        help="Direct path to schools-index.json (overrides --comparison-tool)",
    )
    p.add_argument("--la", default=SEED_LOCAL_AUTHORITY, help="Filter to local authority")
    p.add_argument("--urn", help="Capture a single school by URN")
    p.add_argument("--limit", type=int, default=5, help="Max schools to process")
    p.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Skip the first N schools after filtering (batch resume)",
    )
    p.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip URNs already present in the output sidecar",
    )
    p.add_argument(
        "--refresh-stale-days",
        type=int,
        default=0,
        help=(
            "Also re-screen existing captures older than N days using "
            "ETag/Last-Modified/content-hash (0 = off)"
        ),
    )
    p.add_argument(
        "--refresh-limit",
        type=int,
        default=0,
        help="Max stale schools to re-screen when --refresh-stale-days > 0",
    )
    p.add_argument(
        "--progress",
        type=Path,
        default=Path("output/qualitative-progress.json"),
        help="Write batch progress metadata (URN cursor) after each run",
    )
    p.add_argument(
        "--require-website",
        action="store_true",
        help="Skip schools without a schoolWebsite URL",
    )
    p.add_argument(
        "--output",
        type=Path,
        default=Path("output/qualitative-capture.json"),
        help="Output sidecar index path",
    )
    p.add_argument(
        "--fixture",
        type=Path,
        help="Run against a JSON fixture of SchoolInput records (offline dev)",
    )
    p.add_argument(
        "--no-news",
        action="store_true",
        help="Disable local news adapter (faster, website-only)",
    )
    p.add_argument(
        "--no-social",
        action="store_true",
        help="Disable social media adapter",
    )
    p.add_argument(
        "--no-documents",
        action="store_true",
        help="Disable school document (PDF) extraction",
    )
    p.add_argument(
        "--learned-terms",
        type=Path,
        default=Path("output/learned-url-terms.json"),
        help="Read/write cross-school learned URL terms (disable with --no-learned-terms)",
    )
    p.add_argument(
        "--no-learned-terms",
        action="store_true",
        help="Disable learned cross-school URL term boosting",
    )
    p.add_argument(
        "--no-hub-spoke",
        action="store_true",
        help="Disable hub-and-spoke discovery (homepage links only)",
    )
    p.add_argument(
        "--synthesize",
        action="store_true",
        help=(
            "Generate parent-facing narrative summaries "
            "(Cursor SDK when CURSOR_API_KEY is set; else OpenAI; else deterministic)"
        ),
    )
    p.add_argument(
        "--synthesize-provider",
        choices=("auto", "cursor", "openai", "none"),
        default="auto",
        help="LLM provider for --synthesize (default: auto = Cursor, then OpenAI)",
    )
    p.add_argument(
        "--synthesize-model",
        default="",
        help=(
            "Model id for --synthesize "
            "(default: composer-2.5 for Cursor, gpt-4o-mini for OpenAI)"
        ),
    )
    return p


def load_schools(args: argparse.Namespace) -> list[SchoolInput]:
    if args.fixture:
        payload = json.loads(args.fixture.read_text(encoding="utf-8"))
        rows = payload if isinstance(payload, list) else payload.get("schools") or []
        filtered = [SchoolInput.from_dict(r) for r in rows]
    else:
        if args.index:
            index_path = args.index
        elif args.comparison_tool:
            index_path = resolve_comparison_tool_index(args.comparison_tool)
        else:
            raise SystemExit("Provide --comparison-tool, --index, or --fixture")

        schools = load_schools_index(index_path)
        filtered = filter_schools(
            schools,
            la=args.la if not args.urn else None,
            urn=args.urn,
            require_website=args.require_website,
        )

    by_urn = {s.urn: s for s in filtered if s.urn}
    refresh_days = max(0, int(args.refresh_stale_days or 0))
    refresh_limit = max(0, int(args.refresh_limit or 0))
    stale_targets: list[SchoolInput] = []

    # Stale refresh is an additive queue used with --skip-existing coverage mode.
    if (
        args.skip_existing
        and refresh_days > 0
        and refresh_limit > 0
        and not args.urn
    ):
        index = load_capture_index(args.output)
        if index:
            stale_urns = select_stale_urns(
                index.records,
                stale_days=refresh_days,
                limit=refresh_limit,
            )
            stale_targets = [by_urn[u] for u in stale_urns if u in by_urn]
            if stale_targets:
                print(
                    f"Refresh-stale: queued {len(stale_targets)} school(s) "
                    f"older than {refresh_days} day(s)",
                    file=sys.stderr,
                )

    if args.skip_existing:
        known = existing_urns(args.output)
        keep = {s.urn for s in stale_targets}
        if known:
            before = len(filtered)
            filtered = [
                s for s in filtered if s.urn not in known or s.urn in keep
            ]
            print(
                f"Skip-existing: dropped {before - len(filtered)} already-captured URN(s)",
                file=sys.stderr,
            )
        # Offset/limit apply to new coverage slots; stale refreshes are additive.
        stale_urn_set = {s.urn for s in stale_targets}
        new_schools = [s for s in filtered if s.urn not in stale_urn_set]
        offset = max(0, int(args.offset or 0))
        if offset:
            new_schools = new_schools[offset:]
        limit = max(0, int(args.limit or 0))
        if limit:
            new_schools = new_schools[:limit]
        return new_schools + stale_targets

    offset = max(0, int(args.offset or 0))
    if offset:
        filtered = filtered[offset:]
    limit = max(0, int(args.limit or 0))
    if limit:
        filtered = filtered[:limit]
    return filtered


def prior_by_urn(output: Path) -> dict[str, QualitativeCaptureRecord]:
    index = load_capture_index(output)
    if not index:
        return {}
    return {r.urn: r for r in index.records if r.urn}


def build_engine(args: argparse.Namespace) -> CaptureEngine:
    from school_capture.sources import (
        LocalNewsAdapter,
        SchoolDocumentsAdapter,
        SchoolWebsiteAdapter,
        SocialMediaAdapter,
    )

    # Boosts (IDF) score URL discovery; raw counts are what we mutate/persist.
    # Never load boosts into the engine store — that used to corrupt the lexicon.
    boosts = None if args.no_learned_terms else load_learned_terms(args.learned_terms)
    counts = (
        None if args.no_learned_terms else load_learned_term_counts(args.learned_terms)
    )
    website = SchoolWebsiteAdapter(
        learned_terms=boosts,
        hub_spoke=not args.no_hub_spoke,
    )
    adapters: list = [website]
    if not args.no_documents:
        adapters.append(SchoolDocumentsAdapter(website_adapter=website))
    if not args.no_news:
        adapters.append(LocalNewsAdapter())
    if not args.no_social:
        adapters.append(SocialMediaAdapter())
    return CaptureEngine(adapters=adapters, learned_terms=counts)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    schools = load_schools(args)
    if not schools:
        print("No schools matched filters.", file=sys.stderr)
        return 1

    engine = build_engine(args)
    priors = prior_by_urn(args.output)
    records = []
    failures = 0
    for school in schools:
        prior = priors.get(school.urn)
        mode = "refresh" if prior else "capture"
        print(f"Capturing {school.urn} {school.name} ({mode})...", file=sys.stderr)
        try:
            record = engine.capture_school(school, prior=prior)
        except Exception as exc:  # noqa: BLE001 — keep batch moving; log and continue
            failures += 1
            print(
                f"  FAILED {school.urn}: {type(exc).__name__}: {exc}",
                file=sys.stderr,
            )
            continue
        if args.synthesize:
            from school_capture.analysis.synthesis import synthesize_record

            model = args.synthesize_model or None
            record = synthesize_record(
                record,
                use_llm=True,
                provider=args.synthesize_provider,
                model=model,
            )
        records.append(record)
        priors[school.urn] = record
        # Persist after each school so IncompleteRead / kills don't lose the batch.
        index = upsert_records(
            args.output,
            [record],
            stats={
                "la": args.la,
                "lastUrn": school.urn,
                "batchSize": len(records),
                "failures": failures,
                "offset": int(args.offset or 0),
                "skipExisting": bool(args.skip_existing),
                "refreshStaleDays": int(args.refresh_stale_days or 0),
                "refreshLimit": int(args.refresh_limit or 0),
                "updatedAt": today_iso(),
            },
        )
        if args.progress:
            save_progress(
                args.progress,
                {
                    "la": args.la,
                    "updatedAt": today_iso(),
                    "sidecarRecords": index.schoolCount,
                    "lastBatchUrns": [r.urn for r in records],
                    "lastBatchSize": len(records),
                    "failures": failures,
                    "processedUrns": sorted({r.urn for r in index.records}),
                    "processedCount": index.schoolCount,
                },
            )

    if not records:
        print(
            f"No successful captures ({failures} failure(s)).",
            file=sys.stderr,
        )
        return 1

    if not args.no_learned_terms and args.output.is_file():
        # Authoritative rebuild from the full sidecar (counts + DF across schools).
        # Survives partial batches and avoids treating IDF boosts as raw counts.
        rebuilt, df, n_schools = build_from_capture_file(args.output)
        boosts = save_learned_terms(
            rebuilt,
            args.learned_terms,
            min_count=2,
            df=df,
            school_count=n_schools,
        )
        print(
            f"Updated learned URL terms "
            f"({len(boosts)} boosts from {len(rebuilt)} counts across {n_schools} schools)",
            file=sys.stderr,
        )

    print(
        f"Captured {len(records)} school(s), {failures} failure(s) → {args.output}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
