#!/usr/bin/env python3
"""Assess SEO landing coverage vs ready pack data volumes.

Reports how many school/town pages the current seo-coverage.json would
publish, how much page budget remains, and which ready packs are next
candidates. Used by `run-seo-coverage-loop.py` and soft-launch ops.

Usage:
  python3 scripts/report-seo-coverage.py
  python3 scripts/report-seo-coverage.py --json
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import SEED_LOCAL_AUTHORITY, la_slug  # noqa: E402

COVERAGE_PATH = ROOT / "public" / "data" / "seo-coverage.json"
MANIFEST_PATH = ROOT / "public" / "data" / "packs" / "manifest.json"
SEED_INDEX = ROOT / "public" / "data" / "schools-index.json"

DEFAULT_MAX_SCHOOL_PAGES = 1500
DEFAULT_MAX_TOWN_PAGES = 80
DEFAULT_TOWN_MIN = 8


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_coverage(path: Path = COVERAGE_PATH) -> dict:
    seed = la_slug(SEED_LOCAL_AUTHORITY)
    if not path.exists():
        return {
            "version": 1,
            "generatedAt": None,
            "pageBudget": {
                "maxSchoolPages": DEFAULT_MAX_SCHOOL_PAGES,
                "maxTownPages": DEFAULT_MAX_TOWN_PAGES,
            },
            "policy": {
                "seedAlwaysIncluded": True,
                "townMinSchools": DEFAULT_TOWN_MIN,
            },
            "includedAreaSlugs": [seed],
        }
    raw = _load_json(path)
    slugs = list(raw.get("includedAreaSlugs") or [seed])
    if raw.get("policy", {}).get("seedAlwaysIncluded", True) and seed not in slugs:
        slugs.insert(0, seed)
    budget = raw.get("pageBudget") or {}
    policy = raw.get("policy") or {}
    return {
        "version": raw.get("version", 1),
        "generatedAt": raw.get("generatedAt"),
        "pageBudget": {
            "maxSchoolPages": int(
                budget.get("maxSchoolPages") or DEFAULT_MAX_SCHOOL_PAGES
            ),
            "maxTownPages": int(budget.get("maxTownPages") or DEFAULT_MAX_TOWN_PAGES),
        },
        "policy": {
            "seedAlwaysIncluded": bool(policy.get("seedAlwaysIncluded", True)),
            "townMinSchools": int(policy.get("townMinSchools") or DEFAULT_TOWN_MIN),
        },
        "includedAreaSlugs": list(dict.fromkeys(slugs)),
        "stats": raw.get("stats"),
    }


def _open_schools(index_path: Path) -> list[dict]:
    if not index_path.exists():
        return []
    data = _load_json(index_path)
    return [s for s in data.get("schools") or [] if not s.get("closed")]


def area_index_path(slug: str) -> Path:
    seed = la_slug(SEED_LOCAL_AUTHORITY)
    if slug == seed:
        return SEED_INDEX
    return ROOT / "public" / "data" / "packs" / slug / "schools-index.json"


def town_stats(schools: list[dict], *, min_schools: int) -> dict:
    by_town: dict[str, list[dict]] = defaultdict(list)
    for school in schools:
        town = (school.get("town") or "").strip()
        if town:
            by_town[town].append(school)
    towns = [
        {"name": name, "schoolCount": len(rows)}
        for name, rows in by_town.items()
        if len(rows) >= min_schools
    ]
    towns.sort(key=lambda t: (-t["schoolCount"], t["name"]))
    with_signal = sum(
        1
        for s in schools
        if s.get("ofstedOverall")
        or s.get("rwmExpected") is not None
        or s.get("att8Average") is not None
        or (s.get("inspectionPrecis") or "").strip()
    )
    with_precis = sum(
        1 for s in schools if (s.get("inspectionPrecis") or "").strip()
    )
    return {
        "schoolCount": len(schools),
        "townCount": len(towns),
        "schoolsInTownPages": sum(t["schoolCount"] for t in towns),
        "withSignal": with_signal,
        "withPrecis": with_precis,
        "signalPct": round(100.0 * with_signal / len(schools), 1) if schools else 0.0,
        "precisPct": round(100.0 * with_precis / len(schools), 1) if schools else 0.0,
        "towns": towns,
    }


def assess_area(slug: str, local_authority: str, *, min_schools: int) -> dict:
    schools = _open_schools(area_index_path(slug))
    stats = town_stats(schools, min_schools=min_schools)
    return {
        "slug": slug,
        "localAuthority": local_authority,
        "isSeed": slug == la_slug(SEED_LOCAL_AUTHORITY),
        **stats,
    }


def list_ready_pack_rows(manifest: dict) -> list[dict]:
    packs = manifest.get("packs") or {}
    rows = []
    for entry in packs.values():
        if entry.get("status") != "ready" or not entry.get("slug"):
            continue
        rows.append(
            {
                "slug": entry["slug"],
                "localAuthority": entry.get("localAuthority") or entry["slug"],
            }
        )
    rows.sort(key=lambda r: r["localAuthority"])
    return rows


def collect_report(coverage: dict | None = None) -> dict:
    coverage = coverage or read_coverage()
    min_schools = coverage["policy"]["townMinSchools"]
    included = list(coverage["includedAreaSlugs"])
    seed = la_slug(SEED_LOCAL_AUTHORITY)

    manifest = _load_json(MANIFEST_PATH) if MANIFEST_PATH.exists() else {"packs": {}}
    ready = list_ready_pack_rows(manifest)

    included_rows: list[dict] = []
    for slug in included:
        if slug == seed:
            la = SEED_LOCAL_AUTHORITY
        else:
            match = next((r for r in ready if r["slug"] == slug), None)
            la = match["localAuthority"] if match else slug
        included_rows.append(assess_area(slug, la, min_schools=min_schools))

    included_set = set(included)
    candidate_rows = [
        assess_area(r["slug"], r["localAuthority"], min_schools=min_schools)
        for r in ready
        if r["slug"] not in included_set and r["slug"] != seed
    ]

    school_pages = sum(r["schoolCount"] for r in included_rows)
    town_pages = sum(r["townCount"] for r in included_rows)
    town_hubs = sum(1 for r in included_rows if r["townCount"] > 0)
    max_schools = coverage["pageBudget"]["maxSchoolPages"]
    max_towns = coverage["pageBudget"]["maxTownPages"]

    return {
        "generatedFromCoverageAt": coverage.get("generatedAt"),
        "pageBudget": coverage["pageBudget"],
        "policy": coverage["policy"],
        "includedAreaSlugs": included,
        "included": included_rows,
        "candidates": candidate_rows,
        "totals": {
            "schoolPages": school_pages,
            "townPages": town_pages,
            "townHubs": town_hubs,
            "schoolBudgetRemaining": max(0, max_schools - school_pages),
            "townBudgetRemaining": max(0, max_towns - town_pages),
            "schoolBudgetUsedPct": round(100.0 * school_pages / max_schools, 1)
            if max_schools
            else 0.0,
        },
    }


def format_markdown(report: dict) -> str:
    totals = report["totals"]
    budget = report["pageBudget"]
    lines = [
        "# SEO coverage report",
        "",
        f"- School pages: **{totals['schoolPages']}** / {budget['maxSchoolPages']}"
        f" ({totals['schoolBudgetUsedPct']}% · {totals['schoolBudgetRemaining']} remaining)",
        f"- Town pages: **{totals['townPages']}** / {budget['maxTownPages']}"
        f" ({totals['townBudgetRemaining']} remaining)",
        f"- Town hubs: **{totals['townHubs']}**",
        f"- Town min schools: {report['policy']['townMinSchools']}",
        "",
        "## Included areas",
        "",
        "| Area | Schools | Towns ≥min | Signal % | Precis % |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for row in report["included"]:
        lines.append(
            f"| {row['localAuthority']} | {row['schoolCount']} | {row['townCount']} "
            f"| {row['signalPct']} | {row['precisPct']} |"
        )
    lines.extend(["", "## Candidate packs (not yet in coverage)", ""])
    if not report["candidates"]:
        lines.append("_None — every ready pack is already included._")
    else:
        lines.extend(
            [
                "| Area | Schools | Towns ≥min | Signal % | Precis % |",
                "| --- | ---: | ---: | ---: | ---: |",
            ]
        )
        for row in sorted(
            report["candidates"],
            key=lambda r: (-r["signalPct"], r["schoolCount"], r["localAuthority"]),
        ):
            lines.append(
                f"| {row['localAuthority']} | {row['schoolCount']} | {row['townCount']} "
                f"| {row['signalPct']} | {row['precisPct']} |"
            )
    lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print machine JSON")
    args = parser.parse_args(argv)
    report = collect_report()
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(format_markdown(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
