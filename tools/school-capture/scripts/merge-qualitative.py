"""Publish qualitative captures as on-demand shards + lean index pointers.

Writes per-URN JSON under ``public/data/qualitative/{urn}.json`` and stamps
``qualitativeCaptureEnrichedAt`` on matching schools in schools-index.json.
The full capture is **not** embedded in the bulk index (keeps first load small).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SHARDS_DIR = ROOT / "public" / "data" / "qualitative"


def load_capture_index(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def qualitative_shard_path(shards_dir: Path, urn: str) -> Path:
    return shards_dir / f"{urn}.json"


def write_qualitative_shards(
    capture_path: Path,
    shards_dir: Path,
    *,
    dry_run: bool = False,
) -> dict[str, int]:
    capture_payload = load_capture_index(capture_path)
    records = capture_payload.get("records") or []
    written = 0
    if not dry_run:
        shards_dir.mkdir(parents=True, exist_ok=True)
    for record in records:
        urn = str(record.get("urn") or "").strip()
        if not urn:
            continue
        if not dry_run:
            qualitative_shard_path(shards_dir, urn).write_text(
                json.dumps(record, separators=(",", ":")),
                encoding="utf-8",
            )
        written += 1
    return {"captureRecords": len(records), "shardsWritten": written}


def stamp_index_pointers(
    schools_index_path: Path,
    capture_path: Path,
    *,
    dry_run: bool = False,
    strip_embedded: bool = True,
) -> dict[str, int]:
    schools_payload = json.loads(schools_index_path.read_text(encoding="utf-8"))
    capture_payload = load_capture_index(capture_path)
    by_urn = {str(r["urn"]): r for r in capture_payload.get("records") or []}

    stamped = 0
    stripped = 0
    for school in schools_payload.get("schools") or []:
        urn = str(school.get("urn") or "").strip()
        record = by_urn.get(urn)
        if record:
            school["qualitativeCaptureEnrichedAt"] = record.get("assessedAt")
            stamped += 1
        if strip_embedded and "qualitativeCapture" in school:
            school.pop("qualitativeCapture", None)
            stripped += 1

    if not dry_run:
        schools_index_path.write_text(
            json.dumps(schools_payload, separators=(",", ":")),
            encoding="utf-8",
        )

    return {
        "schools": len(schools_payload.get("schools") or []),
        "captureRecords": len(by_urn),
        "stamped": stamped,
        "stripped": stripped,
    }


def merge_into_schools_index(
    schools_index_path: Path,
    capture_path: Path,
    *,
    shards_dir: Path | None = None,
    dry_run: bool = False,
    embed: bool = False,
) -> dict[str, int]:
    """Publish shards + stamp pointers (default), or legacy embed mode."""
    if embed:
        # Legacy path kept for emergency rollback / offline tooling.
        schools_payload = json.loads(schools_index_path.read_text(encoding="utf-8"))
        capture_payload = load_capture_index(capture_path)
        by_urn = {str(r["urn"]): r for r in capture_payload.get("records") or []}
        merged = 0
        for school in schools_payload.get("schools") or []:
            urn = str(school.get("urn") or "").strip()
            record = by_urn.get(urn)
            if not record:
                continue
            school["qualitativeCapture"] = record
            school["qualitativeCaptureEnrichedAt"] = record.get("assessedAt")
            merged += 1
        if not dry_run:
            schools_index_path.write_text(
                json.dumps(schools_payload, separators=(",", ":")),
                encoding="utf-8",
            )
        return {
            "schools": len(schools_payload.get("schools") or []),
            "captureRecords": len(by_urn),
            "merged": merged,
            "mode": "embed",
        }

    resolved_shards = shards_dir or DEFAULT_SHARDS_DIR
    shard_stats = write_qualitative_shards(
        capture_path, resolved_shards, dry_run=dry_run
    )
    pointer_stats = stamp_index_pointers(
        schools_index_path,
        capture_path,
        dry_run=dry_run,
        strip_embedded=True,
    )
    return {**shard_stats, **pointer_stats, "mode": "shards"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Publish qualitative-capture.json as on-demand URN shards and stamp "
            "lean pointers on a Comparison-tool schools-index."
        )
    )
    parser.add_argument(
        "--index",
        type=Path,
        required=True,
        help="Path to schools-index.json",
    )
    parser.add_argument(
        "--capture",
        type=Path,
        default=Path("output/qualitative-capture.json"),
        help="Path to qualitative capture sidecar index",
    )
    parser.add_argument(
        "--shards-dir",
        type=Path,
        default=None,
        help=f"Directory for per-URN shards (default: {DEFAULT_SHARDS_DIR})",
    )
    parser.add_argument(
        "--embed",
        action="store_true",
        help="Legacy: embed full captures into schools-index (not for Pages).",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    stats = merge_into_schools_index(
        args.index,
        args.capture,
        shards_dir=args.shards_dir,
        dry_run=args.dry_run,
        embed=args.embed,
    )
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
