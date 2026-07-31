"""Seed geography and on-demand local-authority helpers.

Shared with `src/lib/seedScope.ts` / `src/lib/laPacks.ts`.
Hampshire remains the maintained seed; other LAs build into
`public/data/packs/{slug}/`.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

# Matches school localAuthority / DfE LA labels in the harvested index
# (Hampshire County Council area — not Southampton or Portsmouth unitaries).
SEED_LOCAL_AUTHORITY = "Hampshire"

PACKS_ROOT_REL = "public/data/packs"

# Product coverage region: ONS South East LAs (packs) + Dorset / BCP by request.
# Hampshire remains the maintained root — it is listed for membership checks only
# and must not be built as an on-demand pack.
SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES: tuple[str, ...] = (
    "Bracknell Forest",
    "Brighton and Hove",
    "Buckinghamshire",
    "East Sussex",
    "Hampshire",
    "Isle of Wight",
    "Kent",
    "Medway",
    "Milton Keynes",
    "Oxfordshire",
    "Portsmouth",
    "Reading",
    "Slough",
    "Southampton",
    "Surrey",
    "West Berkshire",
    "West Sussex",
    "Windsor and Maidenhead",
    "Wokingham",
    # ONS South West — included for contiguous coastal coverage with Hampshire.
    "Dorset",
    "Bournemouth, Christchurch and Poole",
)

# Build order for batch pack harvest (Hampshire omitted — maintained root).
SOUTHEAST_PLUS_DORSET_PACK_BUILD_ORDER: tuple[str, ...] = (
    "Southampton",
    "Portsmouth",
    "Dorset",
    "Bournemouth, Christchurch and Poole",
    "Surrey",
    "West Sussex",
    "East Sussex",
    "Brighton and Hove",
    "Kent",
    "Medway",
    "Isle of Wight",
    "West Berkshire",
    "Reading",
    "Wokingham",
    "Bracknell Forest",
    "Windsor and Maidenhead",
    "Slough",
    "Buckinghamshire",
    "Milton Keynes",
    "Oxfordshire",
)


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


def is_southeast_plus_dorset_local_authority(name: str | None) -> bool:
    if not name:
        return False
    target = normalize_la_name(name).lower()
    return any(
        normalize_la_name(la).lower() == target
        for la in SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES
    )


def southeast_plus_dorset_pack_targets(*, include_ready: bool = False) -> list[str]:
    """LA labels to build as packs (excludes Hampshire maintained root)."""
    return [
        la
        for la in SOUTHEAST_PLUS_DORSET_PACK_BUILD_ORDER
        if not is_seed_local_authority(la)
    ]


# Ofsted childcare MI sometimes uses "&" where DfE/EES uses "and".
_LA_NAME_ALIASES: dict[str, tuple[str, ...]] = {
    "bournemouth, christchurch and poole": (
        "Bournemouth, Christchurch and Poole",
        "Bournemouth, Christchurch & Poole",
    ),
}


def la_name_match_keys(name: str | None) -> set[str]:
    """Normalized keys that should count as the same local authority."""
    base = normalize_la_name(name)
    if not base:
        return set()
    keys = {base.lower(), base.lower().replace(" & ", " and ")}
    for canonical, aliases in _LA_NAME_ALIASES.items():
        alias_keys = {normalize_la_name(a).lower() for a in aliases}
        alias_keys.add(canonical)
        if keys & alias_keys:
            keys |= alias_keys
    return keys


def is_local_authority(name: str | None, target: str | None) -> bool:
    if not name or not target:
        return False
    return bool(la_name_match_keys(name) & la_name_match_keys(target))


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


def resolve_index_bundle(
    index_arg: str | Path,
    root: Path,
) -> dict[str, Any]:
    """Resolve schools-index.json and sibling pack/root artefact paths.

    Returns keys: index, directory, summary, is_root.
    """
    index_path = Path(index_arg)
    if not index_path.is_absolute():
        index_path = root / index_path
    root_index = (root / "public" / "data" / "schools-index.json").resolve()
    return {
        "index": index_path,
        "directory": index_path.with_name("schools-directory.json"),
        "summary": index_path.with_name("harvest-summary.json"),
        "is_root": index_path.resolve() == root_index,
    }


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
