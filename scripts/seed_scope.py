"""Seed geography and on-demand local-authority helpers.

Shared with `src/lib/seedScope.ts` / `src/lib/laPacks.ts`.
Hampshire remains the maintained seed; other LAs build into
`public/data/packs/{slug}/`.
"""

from __future__ import annotations

import re
from typing import Any

# Matches school localAuthority / DfE LA labels in the harvested index
# (Hampshire County Council area — not Southampton or Portsmouth unitaries).
SEED_LOCAL_AUTHORITY = "Hampshire"

PACKS_ROOT_REL = "public/data/packs"


def normalize_la_name(name: str | None) -> str:
    if not name:
        return ""
    return re.sub(r"\s+", " ", name.strip())


def la_slug(name: str | None) -> str:
    """Filesystem / URL slug for an LA pack directory."""
    text = normalize_la_name(name).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "unknown"


def is_seed_local_authority(name: str | None) -> bool:
    return is_local_authority(name, SEED_LOCAL_AUTHORITY)


def is_local_authority(name: str | None, target: str | None) -> bool:
    if not name or not target:
        return False
    return normalize_la_name(name).lower() == normalize_la_name(target).lower()


def filter_schools_to_la(
    schools: list[dict[str, Any]],
    local_authority: str,
) -> list[dict[str, Any]]:
    """Keep only establishments in the named local authority."""
    return [
        s
        for s in schools
        if is_local_authority(s.get("localAuthority"), local_authority)
    ]


def filter_schools_to_seed_la(schools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return filter_schools_to_la(schools, SEED_LOCAL_AUTHORITY)


def trim_la_benchmarks_for(
    local_authorities: dict[str, Any] | None,
    local_authority: str,
) -> dict[str, Any]:
    """Keep England-level companion benches for one LA only."""
    if not local_authorities:
        return {}
    kept: dict[str, Any] = {}
    for name, metrics in local_authorities.items():
        if is_local_authority(name, local_authority):
            kept[name] = metrics
    return kept


def trim_la_benchmarks(
    local_authorities: dict[str, Any] | None,
) -> dict[str, Any]:
    return trim_la_benchmarks_for(local_authorities, SEED_LOCAL_AUTHORITY)


def pack_rel_dir(local_authority: str) -> str:
    return f"{PACKS_ROOT_REL}/{la_slug(local_authority)}"


def resolve_la_from_ees_meta(
    meta: dict[str, Any],
    local_authority: str,
) -> dict[str, str] | None:
    """
    Resolve a DfE Explore Education Statistics LA option from dataset meta.

    Returns {id, label, code, oldCode} or None if the label does not match.
    """
    target = normalize_la_name(local_authority).lower()
    if not target:
        return None
    for loc in meta.get("locations") or []:
        code = (loc.get("level") or {}).get("code")
        if code != "LA":
            continue
        for opt in loc.get("options") or []:
            label = normalize_la_name(opt.get("label"))
            if label.lower() == target:
                return {
                    "id": str(opt.get("id") or ""),
                    "label": label,
                    "code": str(opt.get("code") or ""),
                    "oldCode": str(opt.get("oldCode") or ""),
                }
    return None
