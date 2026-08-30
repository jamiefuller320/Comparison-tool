#!/usr/bin/env python3
"""Unit tests for parallel stream LA advancement."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

_SPEC = importlib.util.spec_from_file_location(
    "run_qualitative_loop",
    SCRIPTS / "run-qualitative-loop.py",
)
assert _SPEC and _SPEC.loader
_MOD = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MOD)
select_parallel_stream_targets = _MOD.select_parallel_stream_targets


def test_keeps_preferred_while_work_remains() -> None:
    catalog = [
        ("Hampshire", Path("seed.json")),
        ("Dorset", Path("dorset.json")),
        ("East Sussex", Path("east.json")),
        ("Kent", Path("kent.json")),
    ]
    remaining = {"Hampshire": 10, "Dorset": 5, "East Sussex": 3, "Kent": 100}

    streams, notes = select_parallel_stream_targets(
        ["Hampshire", "Dorset", "East Sussex"],
        known=set(),
        advance=True,
        resolve_index=lambda la: (la, Path(f"{la}.json")),
        remaining_fn=lambda path, la, known: remaining[la],
        all_targets=catalog,
    )
    assert [s[0] for s in streams] == ["Hampshire", "Dorset", "East Sussex"]
    assert notes == []


def test_advances_only_exhausted_slots() -> None:
    catalog = [
        ("Hampshire", Path("seed.json")),
        ("Dorset", Path("dorset.json")),
        ("East Sussex", Path("east.json")),
        ("Kent", Path("kent.json")),
        ("Surrey", Path("surrey.json")),
    ]
    remaining = {
        "Hampshire": 0,
        "Dorset": 12,
        "East Sussex": 0,
        "Kent": 80,
        "Surrey": 50,
    }

    streams, notes = select_parallel_stream_targets(
        ["Hampshire", "Dorset", "East Sussex"],
        known=set(),
        advance=True,
        resolve_index=lambda la: (la, Path(f"{la}.json")),
        remaining_fn=lambda path, la, known: remaining[la],
        all_targets=catalog,
    )
    las = [s[0] for s in streams]
    assert las[0] == "Kent"
    assert las[1] == "Dorset"
    assert las[2] == "Surrey"
    assert any("preferred=Hampshire" in n and "Kent" in n for n in notes)
    assert any("preferred=East Sussex" in n and "Surrey" in n for n in notes)


def test_no_advance_keeps_exhausted_preferred() -> None:
    catalog = [
        ("Hampshire", Path("seed.json")),
        ("Kent", Path("kent.json")),
    ]
    remaining = {"Hampshire": 0, "Kent": 40}
    streams, notes = select_parallel_stream_targets(
        ["Hampshire"],
        known=set(),
        advance=False,
        resolve_index=lambda la: (la, Path(f"{la}.json")),
        remaining_fn=lambda path, la, known: remaining[la],
        all_targets=catalog,
    )
    assert [s[0] for s in streams] == ["Hampshire"]
    assert streams[0][2] == 0
    assert notes == []


def test_exhausted_fallback_when_nothing_left() -> None:
    catalog = [
        ("Hampshire", Path("seed.json")),
        ("Dorset", Path("dorset.json")),
    ]
    remaining = {"Hampshire": 0, "Dorset": 0}
    streams, notes = select_parallel_stream_targets(
        ["Hampshire", "Dorset"],
        known=set(),
        advance=True,
        resolve_index=lambda la: (la, Path(f"{la}.json")),
        remaining_fn=lambda path, la, known: remaining[la],
        all_targets=catalog,
    )
    assert [s[0] for s in streams] == ["Hampshire", "Dorset"]
    assert all("no replacement" in n for n in notes)


def main() -> int:
    test_keeps_preferred_while_work_remains()
    test_advances_only_exhausted_slots()
    test_no_advance_keeps_exhausted_preferred()
    test_exhausted_fallback_when_nothing_left()
    print("OK select_parallel_stream_targets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
