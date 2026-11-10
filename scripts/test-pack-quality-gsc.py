#!/usr/bin/env python3
"""Unit tests for GSC-backed pack-quality précis targeting."""

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
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def precis_row(
    mod,
    name: str,
    slug: str,
    *,
    pct: float,
    missing: int,
    sitemap: bool,
) -> dict:
    return {
        "localAuthority": name,
        "slug": slug,
        "openPrecisPct": pct,
        "openMissingPrecis": missing,
        "openSchoolCount": missing + 40,
        "openWithPrecis": 40,
        "sitemapPrecis": sitemap,
        "independentPrecis": {"n": 4, "withPrecis": 0, "pct": 0.0},
        "independentCount": 4,
        "independentWithIsiUrl": 0,
    }


def main() -> int:
    gsc = load_mod("pack_quality_gsc", "pack_quality_gsc.py")
    loop = load_mod("pack_quality_loop", "run-pack-quality-loop.py")

    fixture = {
        "status": "ok",
        "pages": [
            {
                "path": "/schools/130921/",
                "pageKind": "school",
                "urn": "130921",
                "area": "greenwich",
                "position": 9.0,
                "impressions": 92,
                "hasPrecis": False,
            },
            {
                "path": "/schools/999001/",
                "pageKind": "school",
                "urn": "999001",
                "area": "greenwich",
                "position": 3.0,
                "impressions": 50,
                "hasPrecis": False,
            },
            {
                "path": "/schools/999002/",
                "pageKind": "school",
                "urn": "999002",
                "area": "barnet",
                "position": 12.0,
                "impressions": 10,
                "hasPrecis": False,
            },
            {
                "path": "/towns/foo/",
                "pageKind": "town",
                "position": 8.0,
                "hasPrecis": False,
            },
            {
                "path": "/schools/888/",
                "pageKind": "school",
                "urn": "888",
                "area": "greenwich",
                "position": 8.0,
                "impressions": 5,
                "hasPrecis": True,
            },
        ],
    }

    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "search-console-latest.json"
        path.write_text(json.dumps(fixture), encoding="utf-8")
        targeting = gsc.load_gsc_precis_targeting(path)
        assert targeting.active
        assert targeting.school_count == 2
        assert targeting.by_urn["130921"]["impressions"] == 92
        assert gsc.priority_urns_for_area(targeting, "greenwich") == ["130921"]

        bad = Path(tmp) / "bad.json"
        bad.write_text('{"status": "skipped"}', encoding="utf-8")
        assert not gsc.load_gsc_precis_targeting(bad).active
        assert gsc.load_gsc_precis_targeting(Path(tmp) / "missing.json").school_count == 0

    gaps = [
        precis_row(loop, "Barnet", "barnet", pct=33.5, missing=111, sitemap=True),
        precis_row(loop, "Greenwich", "greenwich", pct=80.0, missing=10, sitemap=True),
        precis_row(loop, "Croydon", "croydon", pct=37.3, missing=96, sitemap=True),
    ]
    gaps = gsc.annotate_pack_rows_for_gsc(gaps, targeting)
    assert gaps[1]["gscPrecisOpportunity"] == 1
    assert gaps[0]["gscPrecisOpportunity"] == 1

    without_gsc = loop.select_precis_targets(gaps, max_packs=2, gsc_active=False)
    assert [r["slug"] for r in without_gsc] == ["barnet", "croydon"]

    with_gsc = loop.select_precis_targets(gaps, max_packs=2, gsc_active=True)
    assert [r["slug"] for r in with_gsc] == ["greenwich", "barnet"], [
        r["slug"] for r in with_gsc
    ]

    # Stall rotation still beats a fresh GSC pack when the GSC pack has rotated.
    rotated = loop.select_precis_targets(
        gaps,
        max_packs=2,
        stall_runs={"greenwich": 2},
        gsc_active=True,
    )
    assert [r["slug"] for r in rotated] == ["barnet", "croydon"]

    print("test-pack-quality-gsc: ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
