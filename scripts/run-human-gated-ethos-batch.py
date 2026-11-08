#!/usr/bin/env python3
"""Targeted ethos recapture + mark-done for open human-gated ethos rows."""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from human_gated_support import ethos_recapture_looks_good, load_shard  # noqa: E402
from qualitative_spotcheck import (  # noqa: E402
    DEFAULT_SHARDS,
    assess_school,
    load_website_index,
)

PACKS_ROOT = ROOT / "public" / "data" / "packs"
DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
QUEUE_JSONL = ROOT / "output" / "human-gated-review-queue.jsonl"
COLLATE_SCRIPT = SCRIPTS / "collate-human-gated-review.py"
KIND_ETHOS = "ethos_underclaim"


def _load_collate():
    spec = importlib.util.spec_from_file_location(
        "collate_human_gated_review", COLLATE_SCRIPT
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def resolve_capture_index(urn: str) -> tuple[Path, str] | None:
    """Find pack index + LA slug for a URN (not only Hampshire root)."""
    for idx in sorted(PACKS_ROOT.glob("*/schools-index.json")):
        try:
            schools = json.loads(idx.read_text(encoding="utf-8")).get("schools") or []
        except (OSError, json.JSONDecodeError):
            continue
        for school in schools:
            if str(school.get("urn") or "").strip() == urn:
                la = str(school.get("localAuthority") or idx.parent.name.replace("-", " ")).strip()
                return idx, la
    try:
        schools = json.loads(DEFAULT_INDEX.read_text(encoding="utf-8")).get("schools") or []
    except (OSError, json.JSONDecodeError):
        return None
    for school in schools:
        if str(school.get("urn") or "").strip() == urn:
            la = str(school.get("localAuthority") or "Hampshire").strip()
            return DEFAULT_INDEX, la
    return None


def open_ethos_rows(queue_path: Path) -> list[dict]:
    collate = _load_collate()
    rows = [
        r
        for r in collate.load_queue(queue_path).values()
        if str(r.get("status") or "open") == "open"
        and str(r.get("kind") or "") == KIND_ETHOS
    ]
    rows.sort(key=lambda r: str(r.get("urn") or ""))
    return rows


def refresh_digest(*, mark_done_ids: list[str] | None = None) -> None:
    cmd = [sys.executable, str(COLLATE_SCRIPT)]
    for item_id in mark_done_ids or []:
        cmd.extend(["--mark-done", item_id])
    if mark_done_ids:
        cmd.extend(["--done-note", "ethos recapture batch"])
    subprocess.run(cmd, cwd=ROOT, check=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Max URNs (0 = all open ethos)")
    parser.add_argument("--queue", type=Path, default=QUEUE_JSONL)
    parser.add_argument(
        "--skip-enrich",
        action="store_true",
        help="Only evaluate existing shards and mark-done",
    )
    args = parser.parse_args(argv)

    rows = open_ethos_rows(args.queue)
    if args.limit > 0:
        rows = rows[: args.limit]

    website_index = load_website_index(root_index=DEFAULT_INDEX, packs_root=PACKS_ROOT)
    marked: list[str] = []
    enriched: list[str] = []

    for row in rows:
        urn = str(row.get("urn") or "").strip()
        item_id = str(row.get("id") or "")
        if not urn or not item_id:
            continue
        if not args.skip_enrich and not args.dry_run:
            resolved = resolve_capture_index(urn)
            if not resolved:
                print(f"  URN {urn}: no schools-index entry", flush=True)
                continue
            pack_index, la = resolved
            cmd = [
                sys.executable,
                str(SCRIPTS / "enrich-qualitative.py"),
                "--index",
                str(pack_index),
                "--la",
                la,
                "--require-website",
                "--urn",
                urn,
                "--synthesize",
                "--synthesize-provider",
                "cursor",
            ]
            print(f"enrich:qualitative --urn {urn}", flush=True)
            proc = subprocess.run(cmd, cwd=ROOT, check=False)
            if proc.returncode != 0:
                print(f"  enrich failed (exit {proc.returncode})", flush=True)
                continue
            enriched.append(urn)

        shard = load_shard(urn, DEFAULT_SHARDS)
        good = False
        if shard and urn in website_index:
            result = assess_school(
                urn,
                website_index=website_index,
                shards_dir=DEFAULT_SHARDS,
                max_pages=2,
            )
            codes = {f.code for f in result.flags}
            good = (
                result.verdict in {"pass", "warn"}
                and "possible_underclaim" not in codes
            )
        elif shard:
            good = ethos_recapture_looks_good(shard)

        if not good:
            print(f"  URN {urn}: still needs work", flush=True)
            continue

        if args.dry_run:
            print(f"  URN {urn}: would mark-done {item_id}", flush=True)
            marked.append(item_id)
            continue

        refresh_digest(mark_done_ids=[item_id])
        marked.append(item_id)
        print(f"  URN {urn}: mark-done {item_id}", flush=True)

    if marked and not args.dry_run:
        refresh_digest()

    summary = {
        "ethosOpenRemaining": len(open_ethos_rows(args.queue)),
        "processed": len(rows),
        "enriched": enriched,
        "markedDone": marked,
        "dryRun": args.dry_run,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
