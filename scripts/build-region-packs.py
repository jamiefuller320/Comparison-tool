#!/usr/bin/env python3
"""Build silent-merge packs for the coverage region (SE + Dorset + London).

Hampshire stays the maintained root (`npm run harvest:hampshire`). Every other
LA in the region is an on-demand pack under `public/data/packs/{slug}/`.

Usage:
  python3 scripts/build-region-packs.py
  python3 scripts/build-region-packs.py --only "Southampton|Portsmouth|Dorset"
  python3 scripts/build-region-packs.py --london-only --skip-ready --limit 4
  python3 scripts/build-region-packs.py --skip-ready --limit 3
  python3 scripts/build-region-packs.py --skip-ey   # schools depth only
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import (  # noqa: E402
    COVERAGE_REGION_PACK_BUILD_ORDER,
    SEED_LOCAL_AUTHORITY,
    coverage_region_pack_targets,
    is_seed_local_authority,
    la_slug,
    london_borough_pack_targets,
    normalize_la_name,
)

MANIFEST = ROOT / "public" / "data" / "packs" / "manifest.json"


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"packs": {}}


def is_ready(la: str, manifest: dict) -> bool:
    slug = la_slug(la)
    entry = (manifest.get("packs") or {}).get(slug) or {}
    return entry.get("status") == "ready"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        default="",
        help=(
            "Pipe-separated LA labels to build (default: full coverage-region order). "
            "Use | not commas — some LA names contain commas "
            "(e.g. Bournemouth, Christchurch and Poole)."
        ),
    )
    parser.add_argument(
        "--london-only",
        action="store_true",
        help="Build only London borough packs (ignores --only)",
    )
    parser.add_argument(
        "--skip-ready",
        action="store_true",
        help="Skip packs already marked ready in the manifest",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max packs to build this run (0 = no cap)",
    )
    parser.add_argument("--skip-depth", action="store_true")
    parser.add_argument("--skip-ey", action="store_true")
    parser.add_argument("--skip-geocode", action="store_true")
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Log failures and continue with the next LA",
    )
    args = parser.parse_args()

    if args.london_only:
        targets = london_borough_pack_targets()
    elif args.only.strip():
        # Prefer | so names like "Bournemouth, Christchurch and Poole" survive.
        sep = "|" if "|" in args.only else ","
        targets = [
            normalize_la_name(part)
            for part in args.only.split(sep)
            if normalize_la_name(part)
        ]
    else:
        targets = coverage_region_pack_targets()

    # Preserve documented build order when using --only / --london-only.
    order_index = {
        la: i for i, la in enumerate(COVERAGE_REGION_PACK_BUILD_ORDER)
    }
    targets.sort(key=lambda la: order_index.get(la, 999))

    manifest = load_manifest()
    built = 0
    skipped = 0
    failed: list[str] = []

    print(
        f"Region pack build: {len(targets)} target(s); "
        f"maintained root={SEED_LOCAL_AUTHORITY}",
        flush=True,
    )

    for la in targets:
        if is_seed_local_authority(la):
            print(f"SKIP {la} (maintained root)", flush=True)
            skipped += 1
            continue
        if args.skip_ready and is_ready(la, manifest):
            print(f"SKIP {la} (already ready)", flush=True)
            skipped += 1
            continue
        if args.limit > 0 and built >= args.limit:
            print(f"Limit {args.limit} reached — stopping.", flush=True)
            break

        cmd = ["python3", "scripts/build-la-pack.py", "--la", la]
        if args.skip_depth:
            cmd.append("--skip-depth")
        if args.skip_ey:
            cmd.append("--skip-ey")
        if args.skip_geocode:
            cmd.append("--skip-geocode")

        print(f"\n=== Building {la} ===", flush=True)
        started = time.time()
        try:
            subprocess.check_call(cmd, cwd=ROOT)
            built += 1
            print(
                f"OK {la} in {time.time() - started:.0f}s",
                flush=True,
            )
            manifest = load_manifest()
        except subprocess.CalledProcessError as exc:
            failed.append(la)
            print(f"FAIL {la}: {exc}", flush=True)
            if not args.continue_on_error:
                return 1

    print(
        f"\nDone. built={built} skipped={skipped} failed={len(failed)}",
        flush=True,
    )
    if failed:
        print("Failed:", ", ".join(failed), flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
