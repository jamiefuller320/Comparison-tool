#!/usr/bin/env python3
"""Smoke tests for Hampshire-scoped KS4 sector benches."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))

from sector_benches import (  # noqa: E402
    ks4_benchmark_block,
    recompute_index_sector_benches,
)


def main() -> int:
    block = ks4_benchmark_block(
        [
            {"sector": "state", "att8Average": 40},
            {"sector": "state", "att8Average": 50},
            {"sector": "independent", "att8Average": 30},
        ],
        sector="state",
        ks4_year="2024/2025",
        ks5_year="2024/2025",
    )
    if block["att8Average"] != 45.0 or block["schoolCount"] != 2:
        print("FAIL state mean", block)
        return 1

    index_path = ROOT / "public" / "data" / "schools-index.json"
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    if payload.get("maintainedScope") != "Hampshire":
        print("SKIP: index is not Hampshire-maintained")
        return 0

    recompute_index_sector_benches(payload)
    state = payload["benchmarks"]["stateKs4"]
    indie = payload["benchmarks"]["independent"]
    if state.get("schoolCount", 0) > 500:
        print("FAIL state KS4 mean still looks national", state)
        return 1
    if indie.get("schoolCount", 0) > 100:
        print("FAIL indie KS4 mean still looks national", indie)
        return 1
    if payload["stats"].get("infantOrNurseryCount", 0) > 500:
        print("FAIL infant count still looks national", payload["stats"])
        return 1

    print(
        f"sector benches ok (state Att8 {state.get('att8Average')} n={state.get('schoolCount')}; "
        f"indie {indie.get('att8Average')} n={indie.get('schoolCount')})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
