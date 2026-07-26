#!/usr/bin/env python3
"""Trim the national school scaffold down to the Hampshire maintained set.

Keeps England + seed-LA benchmarks, Hampshire schools only, and KS2 history
shards for those URNs. National full harvest remains available via
`npm run harvest` (scaffold / escape hatch).

Usage:
  python3 scripts/trim-index-to-seed-la.py
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from seed_scope import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    filter_schools_to_seed_la,
    is_seed_local_authority,
    trim_la_benchmarks,
)

OUT_DIR = ROOT / "public" / "data"
INDEX = OUT_DIR / "schools-index.json"
DIRECTORY = OUT_DIR / "schools-directory.json"
SUMMARY = OUT_DIR / "harvest-summary.json"
SRC_SUMMARY = ROOT / "src" / "data" / "harvest-summary.json"
HISTORY_DIR = OUT_DIR / "ks2-history"


def lean_directory_row(school: dict) -> dict:
    row = {
        "urn": school["urn"],
        "name": school["name"],
        "localAuthority": school.get("localAuthority"),
        "town": school.get("town"),
        "postcode": school.get("postcode"),
        "ageRange": school.get("ageRange"),
        "phase": school.get("phase"),
        "schoolTypeLabel": school.get("schoolTypeLabel"),
        "sector": school.get("sector"),
        "rwmExpected": school.get("rwmExpected"),
        "eligiblePupils": school.get("eligiblePupils"),
    }
    return {k: v for k, v in row.items() if v is not None and v != ""}


def trim_history(keep_urns: set[str]) -> dict:
    if not HISTORY_DIR.exists():
        return {"schoolCount": 0, "shardCount": 0}

    meta_path = HISTORY_DIR / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}

    kept_schools: dict[str, dict] = {}
    for shard in HISTORY_DIR.glob("u*.json"):
        payload = json.loads(shard.read_text(encoding="utf-8"))
        for urn, series in payload.items():
            if urn in keep_urns:
                kept_schools[urn] = series
        shard.unlink()

    shards: dict[str, dict[str, dict]] = {}
    for urn, series in kept_schools.items():
        digits = "".join(ch for ch in urn if ch.isdigit())
        key = digits[-2:] if len(digits) >= 2 else digits.zfill(2)
        shards.setdefault(key, {})[urn] = series

    for key, payload in shards.items():
        (HISTORY_DIR / f"u{key}.json").write_text(
            json.dumps(payload, separators=(",", ":")),
            encoding="utf-8",
        )

    meta["generatedAt"] = time.strftime("%Y-%m-%d")
    meta["schoolCount"] = len(kept_schools)
    meta["shardCount"] = len(shards)
    meta["maintainedScope"] = SEED_LOCAL_AUTHORITY
    source = meta.setdefault("source", {})
    note = source.get("note") or ""
    scope_bit = (
        f" Maintained scope: {SEED_LOCAL_AUTHORITY} URNs from the school index "
        "(national history extract remains available via full harvest)."
    )
    if "Maintained scope:" not in note:
        source["note"] = (note + scope_bit).strip()
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return {"schoolCount": len(kept_schools), "shardCount": len(shards)}


def main() -> int:
    if not INDEX.exists():
        raise SystemExit(f"Missing {INDEX}")

    payload = json.loads(INDEX.read_text(encoding="utf-8"))
    before = len(payload.get("schools") or [])
    schools = filter_schools_to_seed_la(payload.get("schools") or [])
    if not schools:
        raise SystemExit(f"No {SEED_LOCAL_AUTHORITY} schools found to keep")

    payload["schools"] = schools
    benches = payload.setdefault("benchmarks", {})
    if isinstance(benches.get("localAuthorities"), dict):
        benches["localAuthorities"] = trim_la_benchmarks(benches["localAuthorities"])
    phonics = benches.get("phonics")
    if isinstance(phonics, dict) and isinstance(phonics.get("localAuthorities"), dict):
        phonics["localAuthorities"] = trim_la_benchmarks(phonics["localAuthorities"])
        stats = payload.setdefault("stats", {})
        stats["phonicsLaCount"] = len(phonics["localAuthorities"])

    stats = payload.setdefault("stats", {})
    stats["schoolCount"] = len(schools)
    stats["withRwm"] = sum(1 for s in schools if s.get("rwmExpected") is not None)
    stats["localAuthorityCount"] = len(
        {s.get("localAuthority") for s in schools if s.get("localAuthority")}
    )
    stats["maintainedScope"] = SEED_LOCAL_AUTHORITY
    stats["stateCount"] = sum(1 for s in schools if s.get("sector") == "state")
    stats["independentCount"] = sum(
        1 for s in schools if s.get("sector") == "independent"
    )
    if "withCoordinates" in stats:
        stats["withCoordinates"] = sum(
            1 for s in schools if s.get("latitude") is not None
        )

    source = payload.setdefault("source", {})
    source["maintainedScope"] = SEED_LOCAL_AUTHORITY
    note = source.get("note") or ""
    climb_note = (
        f" Maintained dataset: {SEED_LOCAL_AUTHORITY} age-climb "
        "(EY pack separate; KS1–KS4 school depth for the seed LA). "
        "Full England harvest remains available as a scaffold via npm run harvest."
    )
    if "Maintained dataset:" not in note:
        source["note"] = (note + climb_note).strip()

    payload["maintainedScope"] = SEED_LOCAL_AUTHORITY
    payload["trimmedAt"] = time.strftime("%Y-%m-%d")

    INDEX.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    directory = {
        "generatedAt": payload.get("generatedAt"),
        "period": payload.get("period"),
        "maintainedScope": SEED_LOCAL_AUTHORITY,
        "schools": [lean_directory_row(s) for s in schools],
    }
    DIRECTORY.write_text(json.dumps(directory, separators=(",", ":")), encoding="utf-8")

    keep_urns = {str(s["urn"]) for s in schools if s.get("urn")}
    history = trim_history(keep_urns)

    summary = {
        "generatedAt": payload.get("generatedAt"),
        "period": payload.get("period"),
        "maintainedScope": SEED_LOCAL_AUTHORITY,
        "schoolCount": len(schools),
        "withRwm": stats["withRwm"],
        "localAuthorityCount": stats["localAuthorityCount"],
        "trimmedFrom": before,
        "historySchoolCount": history["schoolCount"],
        "historyShardCount": history["shardCount"],
        "files": [
            "public/data/schools-index.json",
            "public/data/schools-directory.json",
            "public/data/ks2-history/",
        ],
    }
    for dest in (SUMMARY, SRC_SUMMARY):
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(summary, indent=2))
    print(
        f"Trimmed {before:,} → {len(schools):,} {SEED_LOCAL_AUTHORITY} schools; "
        f"history {history['schoolCount']:,} URNs",
        flush=True,
    )
    # Guard: unitaries must not sneak in
    bad = [
        s.get("localAuthority")
        for s in schools
        if not is_seed_local_authority(s.get("localAuthority"))
    ]
    if bad:
        raise SystemExit(f"Non-seed LAs remained: {sorted(set(bad))[:5]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
