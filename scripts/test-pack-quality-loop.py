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

    selected = mod.select_targets(rows, max_packs=2)
    names = [r["localAuthority"] for r in selected]
    assert names == ["Weak A", "Weak B"], names
    assert "Hampshire" not in names
    assert "Strong Pack" not in names
    assert "No Indies" not in names
    assert not mod.has_polish_headroom(rows[4])
    assert mod.has_polish_headroom(rows[1])

    # Interest can promote a slightly stronger pack ahead of a weaker untouched one.
    # Weak A = 40%, Weak B = 50%, Weak C = 62.5%. Boost on Weak B (score 5 → 18% cap)
    # makes effective 50-18=32 < 40, so Weak B sorts first.
    boosted = mod.select_targets(
        rows,
        max_packs=2,
        interest_by_slug={"weak-b": 5.0, "weak-a": 0.0},
    )
    boosted_names = [r["localAuthority"] for r in boosted]
    assert boosted_names[0] == "Weak B", boosted_names
    assert "Weak A" in boosted_names

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
