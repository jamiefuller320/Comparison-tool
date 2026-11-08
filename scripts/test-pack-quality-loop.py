#!/usr/bin/env python3
"""Unit tests for pack quality loop target selection + interest weighting."""

from __future__ import annotations

import importlib.util
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def load_mod(name: str, filename: str):
    path = SCRIPTS / filename
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    # Ensure sibling imports (seed_scope / pack_interest) resolve.
    if str(SCRIPTS) not in sys.path:
        sys.path.insert(0, str(SCRIPTS))
    spec.loader.exec_module(mod)
    return mod


def row(
    name: str,
    slug: str,
    *,
    indie_n: int,
    indie_precis: int,
    isi: int,
    school_pct: float = 90.0,
) -> dict:
    return {
        "localAuthority": name,
        "slug": slug,
        "precisPct": school_pct,
        "independentCount": indie_n,
        "independentWithIsiUrl": isi,
        "independentPrecis": {
            "n": indie_n,
            "withPrecis": indie_precis,
            "pct": round(100 * indie_precis / indie_n, 1) if indie_n else 0.0,
        },
        "ey": {"pct": 80.0},
        "childminders": {"pct": 70.0},
        "softLaunchPass": True,
    }


def precis_row(
    name: str,
    slug: str,
    *,
    pct: float,
    missing: int,
    sitemap: bool,
    indie_n: int = 4,
    indie_precis: int = 0,
    isi: int = 0,
) -> dict:
    base = row(
        name,
        slug,
        indie_n=indie_n,
        indie_precis=indie_precis,
        isi=isi,
        school_pct=pct,
    )
    base["openPrecisPct"] = pct
    base["openMissingPrecis"] = missing
    base["openSchoolCount"] = missing + 40
    base["openWithPrecis"] = 40
    base["sitemapPrecis"] = sitemap
    return base


def main() -> int:
    mod = load_mod("pack_quality_loop", "run-pack-quality-loop.py")
    interest = load_mod("pack_interest", "pack_interest.py")

    rows = [
        row("Hampshire", "hampshire", indie_n=70, indie_precis=52, isi=37),
        row("Weak A", "weak-a", indie_n=10, indie_precis=4, isi=2),
        row("Weak B", "weak-b", indie_n=20, indie_precis=10, isi=5),
        row("Weak C", "weak-c", indie_n=8, indie_precis=5, isi=3),
        row("Strong Pack", "strong-pack", indie_n=12, indie_precis=11, isi=11),
        row("No Indies", "no-indies", indie_n=0, indie_precis=0, isi=0),
    ]

    assert not mod.has_polish_headroom(rows[4])
    assert mod.has_polish_headroom(rows[1])

    # Live sitemap order (open schools): Barnet, Croydon, Southwark, Bromley,
    # Enfield, then Ealing (tied on % with a larger gap than Wandsworth).
    # Wiltshire is off the sitemap and comes after every sitemap gap.
    # A weak indie pack such as Newham does not jump the queue.
    gaps = [
        precis_row("Hampshire", "hampshire", pct=10.0, missing=78, sitemap=True),
        precis_row("Barnet", "barnet", pct=33.5, missing=111, sitemap=True),
        precis_row("Croydon", "croydon", pct=37.3, missing=96, sitemap=True),
        precis_row("Southwark", "southwark", pct=50.0, missing=58, sitemap=True),
        precis_row("Bromley", "bromley", pct=50.4, missing=58, sitemap=True),
        precis_row("Enfield", "enfield", pct=51.4, missing=52, sitemap=True),
        precis_row("Ealing", "ealing", pct=51.8, missing=54, sitemap=True),
        precis_row("Wandsworth", "wandsworth", pct=51.8, missing=53, sitemap=True),
        precis_row("Newham", "newham", pct=92.5, missing=8, sitemap=True),
        precis_row("Wiltshire", "wiltshire", pct=21.4, missing=206, sitemap=False),
        precis_row("Surrey", "surrey", pct=93.1, missing=35, sitemap=False),
        precis_row("Full", "full", pct=100.0, missing=0, sitemap=True),
    ]
    selected = mod.select_precis_targets(gaps, max_packs=6)
    names = [r["localAuthority"] for r in selected]
    assert names == [
        "Barnet",
        "Croydon",
        "Southwark",
        "Bromley",
        "Enfield",
        "Ealing",
    ], names
    assert "Hampshire" not in names
    assert "Wiltshire" not in names
    assert "Newham" not in names
    assert "Surrey" not in names

    wider = [r["localAuthority"] for r in mod.select_precis_targets(gaps, max_packs=9)]
    assert wider[6] == "Wandsworth", wider
    assert wider[7] == "Newham", wider
    assert wider[8] == "Wiltshire", wider
    assert "Surrey" not in wider

    # Interest must not pull a high-coverage sitemap pack ahead of a worse gap.
    boosted = mod.select_targets(
        gaps,
        max_packs=2,
        interest_by_slug={"newham": 50.0, "wiltshire": 50.0},
    )
    assert [r["localAuthority"] for r in boosted] == ["Barnet", "Croydon"]

    # One stuck run is not enough to rotate. Two is.
    still = mod.select_precis_targets(
        gaps, max_packs=1, stall_runs={"barnet": 1}
    )
    assert [r["slug"] for r in still] == ["barnet"]
    rotated = mod.select_precis_targets(
        gaps, max_packs=6, stall_runs={"barnet": 2, "croydon": 2}
    )
    rotated_names = [r["localAuthority"] for r in rotated]
    assert rotated_names[:4] == ["Southwark", "Bromley", "Enfield", "Ealing"], (
        rotated_names
    )
    assert "Barnet" not in rotated_names
    assert "Croydon" not in rotated_names
    assert rotated_names[4:] == ["Wandsworth", "Newham"], rotated_names

    # When every sitemap gap has stalled, Wiltshire takes the window first.
    stalled = {
        r["slug"]: 2 for r in gaps if r.get("sitemapPrecis") and r["slug"] != "hampshire"
    }
    wiltshire_first = mod.select_precis_targets(
        gaps, max_packs=1, stall_runs=stalled
    )
    assert [r["slug"] for r in wiltshire_first] == ["wiltshire"]

    # Among already-rotated packs, the lower stall is tried first.
    both = mod.select_precis_targets(
        gaps,
        max_packs=1,
        stall_runs={**stalled, "wiltshire": 3, "barnet": 2},
    )
    assert [r["slug"] for r in both] == ["barnet"]

    stats = mod.open_precis_stats(
        [
            {"closed": True, "inspectionPrecis": ""},
            {"inspectionPrecis": "Pupils enjoy school."},
            {"inspectionPrecis": "  "},
        ]
    )
    assert stats["openSchoolCount"] == 2
    assert stats["openWithPrecis"] == 1
    assert stats["openMissingPrecis"] == 1
    assert stats["openPrecisPct"] == 50.0

    assert mod.precis_metrics_unchanged(
        {"openMissingPrecis": 10, "isiUrls": "1/2", "independentPrecis": "0/2"},
        {"openMissingPrecis": 10, "isiUrls": "1/2", "independentPrecis": "0/2"},
    )
    assert not mod.precis_metrics_unchanged(
        {"openMissingPrecis": 10, "isiUrls": "1/2", "independentPrecis": "0/2"},
        {"openMissingPrecis": 9, "isiUrls": "1/2", "independentPrecis": "0/2"},
    )
    assert not mod.precis_metrics_unchanged(
        {"openMissingPrecis": 10, "isiUrls": "1/2", "independentPrecis": "0/2"},
        {"openMissingPrecis": 10, "isiUrls": "2/2", "independentPrecis": "0/2"},
    )

    kept = mod.update_stall_runs(
        {"barnet": 1, "croydon": 2},
        targeted_slugs=["barnet", "southwark"],
        stuck_slugs=["barnet", "southwark"],
    )
    assert kept["barnet"] == 2  # second stuck run; rotates on the next selection
    assert kept["croydon"] == 2  # not targeted, so the rotation holds
    assert kept["southwark"] == 1
    cleared = mod.update_stall_runs(
        kept,
        targeted_slugs=["barnet"],
        stuck_slugs=[],
    )
    assert "barnet" not in cleared
    assert cleared["croydon"] == 2

    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        coverage = Path(tmp) / "seo-coverage.json"
        coverage.write_text(
            '{"pageBudget": {"maxSchoolPages": 9000}, '
            '"includedAreaSlugs": ["barnet", "croydon"]}',
            encoding="utf-8",
        )
        assert mod.load_sitemap_slugs(coverage) == {"barnet", "croydon"}

    assert mod.STALL_BEFORE_ROTATE == 2
    assert mod.precis_priority_tier(gaps[1]) == 0  # Barnet
    assert mod.precis_priority_tier(gaps[9]) == 1  # Wiltshire
    assert mod.precis_priority_tier(gaps[10]) is None  # Surrey
    assert mod.precis_priority_tier(gaps[11]) is None  # nothing missing

    # Pack above indie bar but with ISI gap still has headroom.
    isi_gap_only = row("ISI Gap", "isi-gap", indie_n=10, indie_precis=9, isi=5)
    assert mod.has_polish_headroom(isi_gap_only)

    snap = mod.snapshot_row(rows[1], interest_by_slug={"weak-a": 2.5})
    assert snap["independentPrecis"] == "4/10"
    assert snap["isiUrls"] == "2/10"
    assert snap["isiGap"] == 8
    assert snap["interestScore"] == 2.5
    assert snap["interestBoostPct"] == 10.0

    # --- pack_interest helpers ---
    now = datetime(2026, 8, 19, tzinfo=timezone.utc)
    manifest_scores = interest.scores_from_manifest(
        {
            "packs": {
                "surrey": {
                    "localAuthority": "Surrey",
                    "status": "ready",
                    "requestedAt": "2026-08-18T12:00:00Z",
                },
                "kent": {
                    "localAuthority": "Kent",
                    "status": "ready",
                    "requestedAt": "2026-06-01T12:00:00Z",
                },
            }
        },
        now=now,
    )
    assert manifest_scores["surrey"] > manifest_scores["kent"]

    log_scores = interest.scores_from_interest_log(
        [
            {
                "kind": "la-pack",
                "localAuthority": "Surrey",
                "at": "2026-08-18T10:00:00Z",
            },
            {
                "kind": "missing-school",
                "localAuthority": "Kent",
                "school": "Some School",
                "at": "2026-08-18T11:00:00Z",
            },
        ],
        now=now,
    )
    assert log_scores["surrey"] >= interest.WEIGHT_LA_PACK_REQUEST * 0.5
    assert log_scores["kent"] >= interest.WEIGHT_MISSING_SCHOOL * 0.5

    assert interest.las_from_page_url(
        "https://schoolcompass.uk/areas/surrey/towns/guildford/"
    ) == ["surrey"]
    assert interest.las_from_page_url("https://schoolcompass.uk/") == []

    fb_scores = interest.scores_from_feedback_rows(
        [
            {
                "requestedAt": "2026-08-18T12:00:00Z",
                "pageUrl": "https://schoolcompass.uk/areas/oxfordshire/",
                "shortlistLas": ["Surrey", "Hampshire"],
            }
        ],
        now=now,
    )
    assert "oxfordshire" in fb_scores
    assert "surrey" in fb_scores
    assert "hampshire" not in fb_scores  # seed excluded from shortlist boost

    assert interest.interest_pct_boost(0) == 0.0
    assert interest.interest_pct_boost(1) == 4.0
    assert interest.interest_pct_boost(10) == interest.INTEREST_PCT_BOOST_CAP

    print("test-pack-quality-loop: ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
