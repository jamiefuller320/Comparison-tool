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

def list_shard_paths(shards_dir: Path) -> list[Path]:
    if not shards_dir.is_dir():
        return []
    return sorted(
        path
        for path in shards_dir.glob("*.json")
        if path.is_file() and path.stem.isdigit()
    )


def load_records_from_shards(shards_dir: Path) -> list[QualitativeCaptureRecord]:
    """Load per-URN shard JSON files as capture records (git source of truth)."""
    records: list[QualitativeCaptureRecord] = []
    for path in list_shard_paths(shards_dir):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(payload, dict):
            continue
        urn = str(payload.get("urn") or path.stem).strip()
        if not urn:
            continue
        payload = dict(payload)
        payload["urn"] = urn
        try:
            records.append(QualitativeCaptureRecord.from_dict(payload))
        except (TypeError, ValueError, KeyError):
            continue
    return records


def assemble_capture_from_shards(
    shards_dir: Path,
    capture_path: Path,
    *,
    stats: dict[str, Any] | None = None,
) -> QualitativeCaptureIndex:
    """Rebuild the working sidecar from published URN shards."""
    records = load_records_from_shards(shards_dir)
    existing = load_capture_index(capture_path)
    merged_stats = dict(existing.stats if existing else {})
    merged_stats["assembledFromShards"] = True
    merged_stats["shardCount"] = len(records)
    if stats:
        merged_stats.update(stats)

    index = QualitativeCaptureIndex(
        generatedAt=today_iso(),
        engineVersion=ENGINE_VERSION,
        schoolCount=len(records),
        records=sorted(records, key=lambda r: (r.name.lower(), r.urn)),
        stats=merged_stats,
    )
    capture_path.parent.mkdir(parents=True, exist_ok=True)
    # Compact JSON — this file is a local/CI working copy, never committed.
    capture_path.write_text(
        json.dumps(index.to_dict(), separators=(",", ":")),
        encoding="utf-8",
    )
    return index


def ensure_capture_sidecar(
    capture_path: Path,
    shards_dir: Path,
    *,
    force: bool = False,
) -> dict[str, Any]:
    """Ensure a working sidecar exists, hydrating from shards when needed.

    Published ``public/data/qualitative/{urn}.json`` shards are the git source of
    truth. The monolith ``output/qualitative-capture.json`` is a working copy
    rebuilt in CI/local runs so it can grow past GitHub's 100MB blob limit.
    """
    shard_paths = list_shard_paths(shards_dir)
    shard_count = len(shard_paths)
    existing = load_capture_index(capture_path)
    existing_count = len(existing.records) if existing else 0

    needs_hydrate = force or existing is None or (
        shard_count > 0 and existing_count < shard_count
    )
    if not needs_hydrate:
        return {
            "hydrated": False,
            "schoolCount": existing_count,
            "shardCount": shard_count,
            "capturePath": str(capture_path),
        }
    if shard_count == 0:
        return {
            "hydrated": False,
            "schoolCount": existing_count,
            "shardCount": 0,
            "capturePath": str(capture_path),
            "reason": "no-shards",
        }

    index = assemble_capture_from_shards(shards_dir, capture_path)
    return {
        "hydrated": True,
        "schoolCount": index.schoolCount,
        "shardCount": shard_count,
        "priorSchoolCount": existing_count,
        "capturePath": str(capture_path),
    }

