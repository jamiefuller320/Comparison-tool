#!/usr/bin/env python3
"""Automated SEO coverage loop: assess → expand within page budget → digest.

As ready LA packs grow, school/town SEO landings must not jump to every URN
at once (static Pages HTML/CI cost). This loop keeps Hampshire included and
adds whole ready packs when they fit the school + town page budgets, biased
toward parent interest and packs with unique crawlable signal.

Usage:
  python3 scripts/run-seo-coverage-loop.py --dry-run
  python3 scripts/run-seo-coverage-loop.py --max-new-areas 4
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from pack_interest import (  # noqa: E402
    combine_interest_scores,
    interest_pct_boost,
)
from seed_scope import SEED_LOCAL_AUTHORITY, la_slug  # noqa: E402


def _load_report_mod() -> ModuleType:
    path = SCRIPTS / "report-seo-coverage.py"
    spec = importlib.util.spec_from_file_location("report_seo_coverage", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_report = _load_report_mod()
COVERAGE_PATH = _report.COVERAGE_PATH
collect_report = _report.collect_report
format_markdown = _report.format_markdown
read_coverage = _report.read_coverage

DIGEST_JSON = ROOT / "public" / "data" / "seo-coverage-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "seo-coverage-loop-latest.md"

# Prefer packs that already have crawlable unique copy / outcomes.
MIN_SIGNAL_PCT = 70.0
# Soft readiness: at least one town landing worth publishing.
MIN_TOWN_COUNT = 1


def utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def rank_key(row: dict, interest_by_slug: dict[str, float] | None = None) -> tuple:
    """Lower is better: prefer high signal, high interest, smaller packs (fit budget)."""
    interest = (interest_by_slug or {}).get(row["slug"], 0.0)
    boost = interest_pct_boost(interest)
    effective_gap = max(0.0, 100.0 - float(row.get("signalPct") or 0.0) - boost)
    return (
        effective_gap,
        -float(interest),
        int(row.get("schoolCount") or 0),
        row.get("localAuthority") or row["slug"],
    )


def select_expansions(
    report: dict,
    *,
    max_new_areas: int,
    interest_by_slug: dict[str, float] | None = None,
) -> list[dict]:
    """Pick ready packs to add while school + town budgets allow."""
    if max_new_areas <= 0:
        return []

    remaining_schools = int(report["totals"]["schoolBudgetRemaining"])
    remaining_towns = int(report["totals"]["townBudgetRemaining"])
    candidates = [
        row
        for row in report["candidates"]
        if float(row.get("signalPct") or 0.0) >= MIN_SIGNAL_PCT
        and int(row.get("townCount") or 0) >= MIN_TOWN_COUNT
        and int(row.get("schoolCount") or 0) > 0
    ]
    candidates.sort(key=lambda r: rank_key(r, interest_by_slug))

    selected: list[dict] = []
    for row in candidates:
        if len(selected) >= max_new_areas:
            break
        schools = int(row["schoolCount"])
        towns = int(row["townCount"])
        if schools > remaining_schools or towns > remaining_towns:
            continue
        selected.append(row)
        remaining_schools -= schools
        remaining_towns -= towns
    return selected


def write_coverage(
    coverage: dict,
    *,
    included_slugs: list[str],
    report_after: dict,
    added: list[dict],
) -> None:
    seed = la_slug(SEED_LOCAL_AUTHORITY)
    slugs = list(dict.fromkeys([seed, *included_slugs]))
    payload = {
        "version": coverage.get("version", 1),
        "generatedAt": utc_now_iso(),
        "pageBudget": coverage["pageBudget"],
        "policy": coverage["policy"],
        "includedAreaSlugs": slugs,
        "stats": {
            "schoolPages": report_after["totals"]["schoolPages"],
            "townPages": report_after["totals"]["townPages"],
            "townHubs": report_after["totals"]["townHubs"],
            "schoolBudgetUsedPct": report_after["totals"]["schoolBudgetUsedPct"],
            "addedThisRun": [r["slug"] for r in added],
        },
    }
    COVERAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    COVERAGE_PATH.write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )


def write_digest(
    *,
    before: dict,
    after: dict,
    added: list[dict],
    dry_run: bool,
    interest_by_slug: dict[str, float],
) -> None:
    digest = {
        "generatedAt": utc_now_iso(),
        "dryRun": dry_run,
        "before": before["totals"],
        "after": after["totals"],
        "added": [
            {
                "slug": r["slug"],
                "localAuthority": r["localAuthority"],
                "schoolCount": r["schoolCount"],
                "townCount": r["townCount"],
                "signalPct": r["signalPct"],
                "interestScore": interest_by_slug.get(r["slug"], 0.0),
            }
            for r in added
        ],
        "includedAreaSlugs": after["includedAreaSlugs"],
        "pageBudget": after["pageBudget"],
    }
    DIGEST_JSON.write_text(json.dumps(digest, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# SEO coverage loop",
        "",
        f"- Generated: `{digest['generatedAt']}`",
        f"- Dry run: **{dry_run}**",
        f"- Added areas: **{len(added)}**"
        + (
            f" ({', '.join(r['localAuthority'] for r in added)})"
            if added
            else " (none — budget full or no ready candidates)"
        ),
        "",
        "## Totals",
        "",
        "| Metric | Before | After | Budget |",
        "| --- | ---: | ---: | ---: |",
        f"| School pages | {before['totals']['schoolPages']} | {after['totals']['schoolPages']} | {after['pageBudget']['maxSchoolPages']} |",
        f"| Town pages | {before['totals']['townPages']} | {after['totals']['townPages']} | {after['pageBudget']['maxTownPages']} |",
        f"| Town hubs | {before['totals']['townHubs']} | {after['totals']['townHubs']} | — |",
        "",
        format_markdown(after),
    ]
    DIGEST_MD.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def run(
    *,
    max_new_areas: int = 4,
    dry_run: bool = False,
    skip_interest: bool = False,
) -> dict:
    coverage = read_coverage()
    before = collect_report(coverage)

    interest_by_slug: dict[str, float] = {}
    if not skip_interest:
        try:
            interest_by_slug = combine_interest_scores()
        except Exception as exc:  # noqa: BLE001 — soft-fail like pack loop
            print(f"Interest weighting unavailable ({exc}); ranking by signal only.")

    added = select_expansions(
        before,
        max_new_areas=max_new_areas,
        interest_by_slug=interest_by_slug,
    )

    new_slugs = list(coverage["includedAreaSlugs"])
    for row in added:
        if row["slug"] not in new_slugs:
            new_slugs.append(row["slug"])

    projected = dict(coverage)
    projected["includedAreaSlugs"] = new_slugs
    after = collect_report(projected)

    if not dry_run:
        write_coverage(
            coverage,
            included_slugs=new_slugs,
            report_after=after,
            added=added,
        )
    write_digest(
        before=before,
        after=after,
        added=added,
        dry_run=dry_run,
        interest_by_slug=interest_by_slug,
    )

    print(
        f"SEO coverage loop: added {len(added)} area(s); "
        f"schools {before['totals']['schoolPages']} → {after['totals']['schoolPages']} "
        f"/ {after['pageBudget']['maxSchoolPages']}"
        + (" [dry-run]" if dry_run else "")
    )
    for row in added:
        print(
            f"  + {row['localAuthority']} ({row['slug']}): "
            f"{row['schoolCount']} schools, {row['townCount']} towns, "
            f"signal {row['signalPct']}%"
        )
    return {"added": added, "before": before, "after": after}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--max-new-areas",
        type=int,
        default=4,
        help="Max ready packs to add this run (default 4)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Write digest only; do not update seo-coverage.json",
    )
    parser.add_argument(
        "--skip-interest",
        action="store_true",
        help="Ignore pack_interest scores (tests / offline)",
    )
    args = parser.parse_args(argv)
    run(
        max_new_areas=args.max_new_areas,
        dry_run=args.dry_run,
        skip_interest=args.skip_interest,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
