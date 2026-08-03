#!/usr/bin/env python3
"""Unit tests for pack quality loop target selection (no network)."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def load_loop():
    path = SCRIPTS / "run-pack-quality-loop.py"
    spec = importlib.util.spec_from_file_location("pack_quality_loop", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
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
    mod = load_loop()
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

    # Large ISI gap sorts ahead of equal indie% with smaller gap when pct ties…
    # Weak A 40% vs Weak B 50% — A first. Good.

    # Pack above indie bar but with ISI gap still has headroom.
    isi_gap_only = row("ISI Gap", "isi-gap", indie_n=10, indie_precis=9, isi=5)
    assert mod.has_polish_headroom(isi_gap_only)

    snap = mod.snapshot_row(rows[1])
    assert snap["independentPrecis"] == "4/10"
    assert snap["isiUrls"] == "2/10"
    assert snap["isiGap"] == 8

    print("test-pack-quality-loop: ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
