"""Helpers for upserting qualitative capture sidecars and progress files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from school_capture.models import (
    ENGINE_VERSION,
    QualitativeCaptureIndex,
    QualitativeCaptureRecord,
    today_iso,
)


def load_capture_index(path: Path) -> QualitativeCaptureIndex | None:
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return QualitativeCaptureIndex.from_dict(payload)


def existing_urns(path: Path) -> set[str]:
    index = load_capture_index(path)
    if not index:
        return set()
    return {r.urn for r in index.records if r.urn}


def upsert_records(
    path: Path,
    records: list[QualitativeCaptureRecord],
    *,
    stats: dict[str, Any] | None = None,
) -> QualitativeCaptureIndex:
    """Merge records by URN into an existing sidecar (or create a new one)."""
    existing = load_capture_index(path)
    by_urn: dict[str, QualitativeCaptureRecord] = {}
    if existing:
        for record in existing.records:
            by_urn[record.urn] = record
    for record in records:
        by_urn[record.urn] = record

    merged_stats = dict(existing.stats if existing else {})
    if stats:
        merged_stats.update(stats)

    index = QualitativeCaptureIndex(
        generatedAt=today_iso(),
        engineVersion=ENGINE_VERSION,
        schoolCount=len(by_urn),
        records=sorted(by_urn.values(), key=lambda r: (r.name.lower(), r.urn)),
        stats=merged_stats,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(index.to_dict(), indent=2), encoding="utf-8")
    return index


def load_progress(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def save_progress(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
