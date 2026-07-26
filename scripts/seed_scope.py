"""Seed geography for the economic initial scope (shared with src/lib/seedScope.ts)."""

from __future__ import annotations

from typing import Any

# Matches school localAuthority / DfE LA labels in the harvested index
# (Hampshire County Council area — not Southampton or Portsmouth unitaries).
SEED_LOCAL_AUTHORITY = "Hampshire"


def is_seed_local_authority(name: str | None) -> bool:
    if not name:
        return False
    return name.strip().lower() == SEED_LOCAL_AUTHORITY.lower()


def filter_schools_to_seed_la(schools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only establishments in the seed local authority."""
    return [s for s in schools if is_seed_local_authority(s.get("localAuthority"))]


def trim_la_benchmarks(
    local_authorities: dict[str, Any] | None,
) -> dict[str, Any]:
    """Keep England-level companion benches for the seed LA only."""
    if not local_authorities:
        return {}
    kept: dict[str, Any] = {}
    for name, metrics in local_authorities.items():
        if is_seed_local_authority(name):
            kept[name] = metrics
    return kept