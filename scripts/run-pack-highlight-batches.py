#!/usr/bin/env python3
"""Batch --upgrade-highlights across silent-merge school packs.

Commits and pushes after each successful batch that changes data.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from importlib.machinery import SourceFileLoader
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "public" / "data" / "packs"
LIMIT = 80
BRANCH = "cursor/precis-expandable-row-4e2b"

mod = SourceFileLoader(
    "enrich_inspection_precis", str(ROOT / "scripts" / "enrich-inspection-precis.py")
).load_module()


def counts(schools: list[dict]) -> tuple[int, int, int]:
    precis = sum(1 for s in schools if s.get("inspectionPrecis"))
    both = sum(
        1
        for s in schools
        if s.get("inspectionStrengths") and s.get("inspectionImprovements")
    )
    candidates = len(mod.prioritize_records(schools, upgrade_highlights=True))
    return precis, both, candidates


def git_push() -> bool:
    for attempt, delay in enumerate([4, 8, 16, 32], 1):
        push = subprocess.run(
            ["git", "push", "-u", "origin", BRANCH], cwd=ROOT
        )
        if push.returncode == 0:
            return True
        print(f"Push failed attempt {attempt}; sleep {delay}s", flush=True)
        time.sleep(delay)
    return False


def process_pack(slug: str) -> None:
    index = PACKS / slug / "schools-index.json"
    if not index.exists():
        return
    data = json.loads(index.read_text(encoding="utf-8"))
    schools = data.get("schools") or []
    precis, both, candidates = counts(schools)
    print(
        f"\n##### PACK {slug}: n={len(schools)} precis={precis} "
        f"both={both} candidates={candidates}",
        flush=True,
    )
    if candidates == 0:
        return

    batch = 1
    stagnant = 0
    while True:
        data = json.loads(index.read_text(encoding="utf-8"))
        schools = data.get("schools") or []
        precis_b, both_b, candidates = counts(schools)
        print(
            f"\n=== {slug} batch {batch} candidates={candidates} "
            f"both_before={both_b}/{len(schools)} ===",
            flush=True,
        )
        if candidates == 0:
            print(f"{slug}: no candidates left", flush=True)
            return

        before = index.read_bytes()
        r = subprocess.run(
            [
                "python3",
                "scripts/enrich-inspection-precis.py",
                "--index",
                str(index.relative_to(ROOT)),
                "--upgrade-highlights",
                f"--limit={LIMIT}",
            ],
            cwd=ROOT,
        )
        if r.returncode != 0:
            print(f"{slug}: enrich failed {r.returncode}", flush=True)
            return

        after = index.read_bytes()
        data = json.loads(index.read_text(encoding="utf-8"))
        schools = data.get("schools") or []
        precis_a, both_a, candidates_a = counts(schools)
        print(
            f"{slug} batch {batch} result: both={both_a}/{len(schools)} "
            f"precis={precis_a} delta_both={both_a - both_b} "
            f"candidates_left={candidates_a}",
            flush=True,
        )

        if after == before:
            stagnant += 1
            print(
                f"{slug}: no index changes (stagnant={stagnant}); "
                "skipping remaining candidates for this pack",
                flush=True,
            )
            return

        stagnant = 0
        msg = (
            f"Upgrade {slug} précis highlights batch {batch} "
            f"(both={both_a}/{len(schools)})"
        )
        subprocess.run(
            ["git", "add", "-u", f"public/data/packs/{slug}/"],
            cwd=ROOT,
            check=True,
        )
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if not status.stdout.strip():
            print(f"{slug}: nothing staged; stopping pack", flush=True)
            return
        subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, check=True)
        if not git_push():
            print("Push failed permanently", flush=True)
            sys.exit(1)
        batch += 1


def main() -> None:
    packs = sorted(
        p.parent.name
        for p in PACKS.glob("*/schools-index.json")
    )
    # Smallest first so early commits land sooner.
    packs.sort(
        key=lambda slug: len(
            (json.loads((PACKS / slug / "schools-index.json").read_text()).get("schools")
             or [])
        )
    )
    print(f"Packs to process ({len(packs)}): {', '.join(packs)}", flush=True)
    for slug in packs:
        process_pack(slug)
    print("\nALL PACK BATCHES COMPLETE", flush=True)


if __name__ == "__main__":
    main()
