#!/usr/bin/env python3
"""Unit tests for SEO coverage report + budgeted expansion selection."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def load_mod(name: str, filename: str):
    path = SCRIPTS / filename
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    if str(SCRIPTS) not in sys.path:
        sys.path.insert(0, str(SCRIPTS))
    spec.loader.exec_module(mod)
    return mod


def candidate(
    name: str,
    slug: str,
    *,
    schools: int,
    towns: int,
    signal: float,
) -> dict:
    return {
        "slug": slug,
        "localAuthority": name,
        "isSeed": False,
        "schoolCount": schools,
        "townCount": towns,
        "signalPct": signal,
        "precisPct": signal,
        "withSignal": schools,
        "withPrecis": schools,
        "schoolsInTownPages": schools,
        "towns": [],
    }


def main() -> int:
    report_mod = load_mod("report_seo_coverage", "report-seo-coverage.py")
    loop = load_mod("seo_coverage_loop", "run-seo-coverage-loop.py")

    # --- read_coverage defaults ---
    with tempfile.TemporaryDirectory() as tmp:
        missing = Path(tmp) / "missing.json"
        cov = report_mod.read_coverage(missing)
        assert cov["includedAreaSlugs"] == ["hampshire"], cov
        assert cov["pageBudget"]["maxSchoolPages"] == 1500
        assert cov["policy"]["townMinSchools"] == 8

        path = Path(tmp) / "seo-coverage.json"
        path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "pageBudget": {"maxSchoolPages": 900, "maxTownPages": 40},
                    "policy": {"seedAlwaysIncluded": True, "townMinSchools": 8},
                    "includedAreaSlugs": ["southampton"],
                }
            ),
            encoding="utf-8",
        )
        cov2 = report_mod.read_coverage(path)
        assert cov2["includedAreaSlugs"][0] == "hampshire"
        assert "southampton" in cov2["includedAreaSlugs"]
        assert cov2["pageBudget"]["maxSchoolPages"] == 900

    # --- select_expansions respects budget + signal floor ---
    before = {
        "candidates": [
            candidate("Thin", "thin", schools=40, towns=2, signal=40.0),
            candidate("Big", "big", schools=800, towns=20, signal=95.0),
            candidate("Isle of Wight", "isle-of-wight", schools=51, towns=2, signal=100.0),
            candidate("Portsmouth", "portsmouth", schools=65, towns=2, signal=100.0),
            candidate("Reading", "reading", schools=72, towns=1, signal=95.0),
            candidate("No Towns", "no-towns", schools=30, towns=0, signal=99.0),
        ],
        "totals": {
            "schoolBudgetRemaining": 200,
            "townBudgetRemaining": 10,
        },
    }
    selected = loop.select_expansions(before, max_new_areas=4)
    slugs = [r["slug"] for r in selected]
    assert "thin" not in slugs, slugs
    assert "big" not in slugs, slugs  # does not fit remaining school budget
    assert "no-towns" not in slugs, slugs
    assert "isle-of-wight" in slugs
    assert "portsmouth" in slugs
    # 51+65+72 = 188 <= 200; reading should fit too if max allows
    assert "reading" in slugs
    assert sum(r["schoolCount"] for r in selected) <= 200

    # Interest can promote a slightly lower-signal pack earlier among peers.
    peers = {
        "candidates": [
            candidate("A", "a", schools=50, towns=2, signal=92.0),
            candidate("B", "b", schools=50, towns=2, signal=90.0),
        ],
        "totals": {"schoolBudgetRemaining": 200, "townBudgetRemaining": 10},
    }
    boosted = loop.select_expansions(
        peers, max_new_areas=1, interest_by_slug={"b": 5.0, "a": 0.0}
    )
    assert boosted[0]["slug"] == "b", [r["slug"] for r in boosted]

    # Cap max_new_areas
    capped = loop.select_expansions(before, max_new_areas=1)
    assert len(capped) == 1

    # Live report should at least see Hampshire when data is present.
    live = report_mod.collect_report()
    assert live["totals"]["schoolPages"] >= 500
    assert "hampshire" in live["includedAreaSlugs"]
    assert live["totals"]["schoolBudgetRemaining"] >= 0

    print("PASS test-seo-coverage-loop")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
