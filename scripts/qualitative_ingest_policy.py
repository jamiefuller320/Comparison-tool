"""Phased defaults for scheduled qualitative website ingest.

Phases (see DEFERRED_IDEAS.md — Qualitative website ingest roadmap):

- **se_tail** — Finish South East + Dorset ready-pack website pools (Hampshire
  seed slot advances when exhausted).
- **london** — Same parallel capture policy on London borough packs as they
  land in ``manifest.json`` (run ``npm run pack:london`` first when pools are
  empty but boroughs are not yet built).
- **maintenance** — Coverage region complete: favour stale re-screens and
  light catch-up capture; no automated expansion beyond the product region.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from seed_scope import (
    DEFAULT_PARALLEL_QUALITATIVE_LAS,
    DEFAULT_PARALLEL_QUALITATIVE_LAS_LONDON,
    PACKS_ROOT_REL,
    SEED_LOCAL_AUTHORITY,
    is_london_borough_local_authority,
    is_seed_local_authority,
    la_slug,
    london_borough_pack_targets,
    normalize_la_name,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
PACKS_ROOT = ROOT / PACKS_ROOT_REL
MANIFEST = PACKS_ROOT / "manifest.json"

INGEST_PHASES = ("se_tail", "london", "maintenance")

INGEST_POLICY_PRESETS: dict[str, dict[str, Any]] = {
    "se_tail": {
        "parallel_las": DEFAULT_PARALLEL_QUALITATIVE_LAS,
        "limit": 60,
        "refresh_limit": 15,
    },
    "london": {
        "parallel_las": DEFAULT_PARALLEL_QUALITATIVE_LAS_LONDON,
        "limit": 60,
        "refresh_limit": 12,
    },
    "maintenance": {
        "parallel_las": DEFAULT_PARALLEL_QUALITATIVE_LAS_LONDON,
        "limit": 15,
        "refresh_limit": 30,
    },
}


def remaining_with_website(index_path: Path, *, la: str, known: set[str]) -> int:
    if not index_path.is_file():
        return 0
    try:
        schools = json.loads(index_path.read_text(encoding="utf-8")).get("schools") or []
    except (OSError, json.JSONDecodeError):
        return 0
    la_norm = normalize_la_name(la)
    n = 0
    for row in schools:
        if row.get("closed"):
            continue
        if la_norm and normalize_la_name(row.get("localAuthority")) != la_norm:
            continue
        urn = str(row.get("urn") or "").strip()
        if not urn or urn in known:
            continue
        if not (row.get("schoolWebsite") or "").strip():
            continue
        n += 1
    return n


def list_capture_targets() -> list[tuple[str, Path]]:
    """Hampshire seed + every ready region pack index."""
    targets: list[tuple[str, Path]] = [(SEED_LOCAL_AUTHORITY, DEFAULT_INDEX)]
    if not MANIFEST.is_file():
        return targets
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return targets
    packs = manifest.get("packs") or {}
    for slug, meta in packs.items():
        if not isinstance(meta, dict) or meta.get("status") != "ready":
            continue
        path = PACKS_ROOT / str(slug) / "schools-index.json"
        if not path.is_file():
            continue
        la = meta.get("localAuthority") or meta.get("la") or str(slug)
        try:
            schools = json.loads(path.read_text(encoding="utf-8")).get("schools") or []
            if schools:
                la = schools[0].get("localAuthority") or la
        except (OSError, json.JSONDecodeError, IndexError, TypeError):
            pass
        if is_seed_local_authority(la):
            continue
        targets.append((str(la), path))
    return targets


def _ready_london_labels(manifest: dict[str, Any]) -> set[str]:
    ready: set[str] = set()
    for _slug, meta in (manifest.get("packs") or {}).items():
        if not isinstance(meta, dict) or meta.get("status") != "ready":
            continue
        la = meta.get("localAuthority") or meta.get("la") or ""
        if is_london_borough_local_authority(la):
            ready.add(normalize_la_name(la))
    return ready


def assess_qualitative_ingest_phase(*, known: set[str]) -> dict[str, Any]:
    """Return phase + remaining counts for digest / policy selection."""
    non_london = 0
    london = 0
    for la, path in list_capture_targets():
        rem = remaining_with_website(path, la=la, known=known)
        if is_london_borough_local_authority(la):
            london += rem
        else:
            non_london += rem

    pending_london = 0
    if MANIFEST.is_file():
        try:
            manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
            ready_london = _ready_london_labels(manifest)
            for la in london_borough_pack_targets():
                if normalize_la_name(la) not in ready_london:
                    pending_london += 1
        except (OSError, json.JSONDecodeError):
            pending_london = len(london_borough_pack_targets())

    if non_london > 0:
        phase = "se_tail"
    elif london > 0 or pending_london > 0:
        phase = "london"
    else:
        phase = "maintenance"

    return {
        "phase": phase,
        "remainingNonLondonWebsites": non_london,
        "remainingLondonWebsites": london,
        "pendingLondonPacks": pending_london,
    }


def resolve_effective_phase(ingest_policy: str, assessment: dict[str, Any]) -> str:
    if ingest_policy == "auto":
        return str(assessment["phase"])
    if ingest_policy not in INGEST_POLICY_PRESETS:
        raise ValueError(f"Unknown ingest policy: {ingest_policy}")
    return ingest_policy


def apply_ingest_policy_defaults(
    args: Any,
    *,
    assessment: dict[str, Any],
    parallel_las_explicit: bool,
) -> tuple[str, list[str]]:
    """Fill unset limit / refresh-limit / parallel-las from the active phase."""
    effective = resolve_effective_phase(args.ingest_policy, assessment)
    preset = INGEST_POLICY_PRESETS[effective]
    notes: list[str] = []

    if getattr(args, "limit", None) is None:
        args.limit = int(preset["limit"])
    if getattr(args, "refresh_limit", None) is None:
        args.refresh_limit = int(preset["refresh_limit"])

    if not parallel_las_explicit:
        args.parallel_las = "|".join(preset["parallel_las"])

    notes.append(
        f"Ingest policy={args.ingest_policy} phase={effective} "
        f"(non-London remaining={assessment['remainingNonLondonWebsites']}, "
        f"London remaining={assessment['remainingLondonWebsites']}, "
        f"pending London packs={assessment['pendingLondonPacks']})."
    )
    if effective == "london" and (
        assessment["remainingLondonWebsites"] == 0
        and assessment["pendingLondonPacks"] > 0
    ):
        notes.append(
            "London phase: borough packs not ready yet — run "
            "`npm run pack:london` (capture will no-op until manifest entries are ready)."
        )
    if effective == "maintenance":
        notes.append(
            "Maintenance phase: coverage-region website ingest complete — "
            "prioritise stale re-screens, qualitative-quality-loop, and "
            "pack-quality / selective Cursor polish (no automated national expansion)."
        )

    return effective, notes
