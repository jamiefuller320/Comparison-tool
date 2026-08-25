#!/usr/bin/env python3
"""Drive South East + Dorset packs to soft-launch completeness.

1. Finish / rebuild any non-ready region packs (skip live ISI HTML).
2. Re-geocode missing coordinates on ready packs.
3. Bounded inspection-precis enrich per pack (schools + EY + childminders).
4. Optional bounded ISI HTML pass for packs missing latest-report citations.

Usage:
  python3 scripts/complete-region-soft-launch.py
  python3 scripts/complete-region-soft-launch.py --skip-build --precis-limit 80
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
    is_seed_local_authority,
    la_slug,
)

MANIFEST = ROOT / "public" / "data" / "packs" / "manifest.json"


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"packs": {}}


def pack_targets() -> list[str]:
    return [
        la
        for la in COVERAGE_REGION_PACK_BUILD_ORDER
        if not is_seed_local_authority(la)
    ]


def is_ready(la: str, manifest: dict) -> bool:
    entry = (manifest.get("packs") or {}).get(la_slug(la)) or {}
    return entry.get("status") == "ready"


def geocode_pack(slug: str) -> None:
    index = f"public/data/packs/{slug}/schools-index.json"
    if not (ROOT / index).exists():
        return
    run(["python3", "scripts/enrich-geocode.py", "--index", index])


def precis_pack(la: str, slug: str, *, limit: int) -> None:
    index = f"public/data/packs/{slug}/schools-index.json"
    ey = ROOT / f"public/data/packs/{slug}/ey-providers-index.json"
    cm = ROOT / f"public/data/packs/{slug}/childminders-index.json"
    # limit 0 = no cap (soft-launch completeness). Otherwise keep EY/CM
    # slices proportional but never tiny.
    ey_limit = 0 if limit == 0 else max(40, limit // 2)
    cm_limit = 0 if limit == 0 else max(30, limit // 3)
    if (ROOT / index).exists():
        run(
            [
                "python3",
                "scripts/enrich-inspection-precis.py",
                "--la",
                la,
                "--index",
                index,
                "--limit",
                str(limit),
                "--sleep",
                "0.08",
            ]
        )
    if ey.exists():
        run(
            [
                "python3",
                "scripts/enrich-inspection-precis.py",
                "--ey",
                "--ey-index",
                str(ey.relative_to(ROOT)),
                "--la",
                la,
                "--limit",
                str(ey_limit),
                "--sleep",
                "0.08",
            ]
        )
    if cm.exists():
        run(
            [
                "python3",
                "scripts/enrich-inspection-precis.py",
                "--childminders",
                "--cm-index",
                str(cm.relative_to(ROOT)),
                "--la",
                la,
                "--limit",
                str(cm_limit),
                "--sleep",
                "0.08",
            ]
        )


def isi_pass(la: str, slug: str, *, cap: int) -> None:
    index = f"public/data/packs/{slug}/schools-index.json"
    if not (ROOT / index).exists():
        return
    run(
        [
            "python3",
            "scripts/enrich-independents.py",
            "--isi-only",
            "--la",
            la,
            "--index",
            index,
            "--isi-resolve-cap",
            str(cap),
        ]
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--skip-geocode", action="store_true")
    parser.add_argument("--skip-precis", action="store_true")
    parser.add_argument("--skip-isi", action="store_true")
    parser.add_argument(
        "--precis-limit",
        type=int,
        default=0,
        help="Max schools to précis per pack (0 = no cap; soft-launch default)",
    )
    parser.add_argument("--isi-resolve-cap", type=int, default=60)
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        default=True,
    )
    args = parser.parse_args()

    targets = pack_targets()
    print(f"Soft-launch region completion: {len(targets)} pack LAs", flush=True)

    if not args.skip_build:
        # Reset stuck "building" entries by rebuilding non-ready packs.
        run(
            [
                "python3",
                "scripts/build-region-packs.py",
                "--skip-ready",
                "--continue-on-error",
            ]
        )

    manifest = load_manifest()
    ready = [la for la in targets if is_ready(la, manifest)]
    print(f"Ready packs for depth polish: {len(ready)}", flush=True)

    for la in ready:
        slug = la_slug(la)
        print(f"\n=== Polish {la} ===", flush=True)
        try:
            if not args.skip_geocode:
                geocode_pack(slug)
            if not args.skip_isi:
                isi_pass(la, slug, cap=args.isi_resolve_cap)
            if not args.skip_precis:
                precis_pack(la, slug, limit=args.precis_limit)
        except subprocess.CalledProcessError as exc:
            print(f"FAIL polish {la}: {exc}", flush=True)
            if not args.continue_on_error:
                return 1

    # Final readiness report
    manifest = load_manifest()
    print("\n=== Region readiness ===", flush=True)
    missing = []
    for la in targets:
        slug = la_slug(la)
        entry = (manifest.get("packs") or {}).get(slug) or {}
        status = entry.get("status", "MISSING")
        print(
            f"{la}: {status} schools={entry.get('schoolCount')} "
            f"ey={entry.get('eyProviderCount')} cm={entry.get('childminderCount')}",
            flush=True,
        )
        if status != "ready":
            missing.append(la)
    if missing:
        print(f"\nStill not ready: {', '.join(missing)}", flush=True)
        return 1
    print(f"\nAll {len(targets)} region packs ready at {time.strftime('%Y-%m-%d %H:%M')}.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
