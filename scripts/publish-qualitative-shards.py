#!/usr/bin/env python3
"""One-shot / ops: publish qualitative URN shards and strip bulk index embeds.

Prefers ``output/qualitative-capture.json`` when present; otherwise extracts
embedded ``qualitativeCapture`` blobs from schools-index.json (migration).
Also builds ``public/data/packs/urn-lookup.json`` for geo-lazy share links.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"


def _load_merge_module():
    import importlib.util

    path = CAPTURE_ROOT / "scripts" / "merge-qualitative.py"
    spec = importlib.util.spec_from_file_location("merge_qualitative", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_merge = _load_merge_module()
merge_into_schools_index = _merge.merge_into_schools_index


def extract_embedded_to_sidecar(index_path: Path, out_path: Path) -> int:
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    records = []
    for school in payload.get("schools") or []:
        capture = school.get("qualitativeCapture")
        if not isinstance(capture, dict):
            continue
        urn = str(capture.get("urn") or school.get("urn") or "").strip()
        if not urn:
            continue
        record = dict(capture)
        record["urn"] = urn
        if not record.get("name"):
            record["name"] = school.get("name")
        records.append(record)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(
            {
                "generatedAt": payload.get("generatedAt"),
                "engineVersion": "extracted-from-index",
                "schoolCount": len(records),
                "records": records,
                "stats": {"extractedFromIndex": True},
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    return len(records)


def build_pack_urn_lookup(
    packs_dir: Path,
    out_path: Path,
    *,
    dry_run: bool = False,
) -> dict[str, int]:
    lookup: dict[str, str] = {}
    files_scanned = 0
    for pack_dir in sorted(p for p in packs_dir.iterdir() if p.is_dir()):
        slug = pack_dir.name
        for name in (
            "schools-index.json",
            "ey-providers-index.json",
            "childminders-index.json",
        ):
            path = pack_dir / name
            if not path.exists():
                continue
            files_scanned += 1
            data = json.loads(path.read_text(encoding="utf-8"))
            rows = data.get("schools") or data.get("providers") or []
            for row in rows:
                urn = str(row.get("urn") or "").strip()
                if urn and urn not in lookup:
                    lookup[urn] = slug
    if not dry_run:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        from datetime import datetime, timezone

        out_path.write_text(
            json.dumps(
                {
                    "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "urnCount": len(lookup),
                    "byUrn": lookup,
                },
                separators=(",", ":"),
            ),
            encoding="utf-8",
        )
    return {"filesScanned": files_scanned, "urnCount": len(lookup)}


def strip_embedded_only(index_path: Path, *, dry_run: bool = False) -> int:
    """Strip embeds while keeping enrichedAt; used when shards already exist."""
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    stripped = 0
    for school in payload.get("schools") or []:
        capture = school.pop("qualitativeCapture", None)
        if capture is None:
            continue
        stripped += 1
        if not school.get("qualitativeCaptureEnrichedAt") and isinstance(
            capture, dict
        ):
            school["qualitativeCaptureEnrichedAt"] = capture.get("assessedAt")
    if not dry_run:
        index_path.write_text(
            json.dumps(payload, separators=(",", ":")), encoding="utf-8"
        )
    return stripped


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Publish qualitative shards and strip schools-index embeds."
    )
    parser.add_argument(
        "--index",
        type=Path,
        default=ROOT / "public" / "data" / "schools-index.json",
    )
    parser.add_argument(
        "--capture",
        type=Path,
        default=ROOT / "output" / "qualitative-capture.json",
    )
    parser.add_argument(
        "--shards-dir",
        type=Path,
        default=ROOT / "public" / "data" / "qualitative",
    )
    parser.add_argument(
        "--urn-lookup",
        type=Path,
        default=ROOT / "public" / "data" / "packs" / "urn-lookup.json",
    )
    parser.add_argument(
        "--skip-urn-lookup",
        action="store_true",
        help="Do not rebuild pack URN lookup",
    )
    parser.add_argument(
        "--skip-qualitative",
        action="store_true",
        help="Only rebuild pack URN lookup (no shard publish / index strip)",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if not args.skip_qualitative:
        capture_path = args.capture
        temp_extract: Path | None = None
        if not capture_path.exists():
            temp_extract = ROOT / "output" / ".qualitative-extract-tmp.json"
            n = extract_embedded_to_sidecar(args.index, temp_extract)
            if n == 0:
                print(
                    "No capture sidecar and no embedded qualitativeCapture found.",
                    file=sys.stderr,
                )
                return 1
            capture_path = temp_extract
            print(f"Extracted {n} embedded captures to temporary sidecar", flush=True)

        stats = merge_into_schools_index(
            args.index,
            capture_path,
            shards_dir=args.shards_dir,
            dry_run=args.dry_run,
            embed=False,
        )
        print(json.dumps({"qualitative": stats}, indent=2))

        if temp_extract and temp_extract.exists():
            temp_extract.unlink()

        if not args.dry_run and args.shards_dir.exists():
            shard_n = sum(1 for _ in args.shards_dir.glob("*.json"))
            print(f"Shard files on disk: {shard_n}", flush=True)
            sample_urn = next(args.shards_dir.glob("*.json"), None)
            if sample_urn:
                print(f"Sample shard: {sample_urn.name}", flush=True)

    if not args.skip_urn_lookup:
        lookup_stats = build_pack_urn_lookup(
            ROOT / "public" / "data" / "packs",
            args.urn_lookup,
            dry_run=args.dry_run,
        )
        print(json.dumps({"urnLookup": lookup_stats}, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
