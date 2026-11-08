#!/usr/bin/env python3
"""Refresh LA pack Ofsted MI, GIAS, KS2, and KS4 on a rolling monthly rota.

Reuses the existing harvest and enrich scripts (and the gov.uk month parser).
Each scheduled run refreshes KS2, GIAS, and KS4 for the stalest ready packs.
The same run applies the latest state-school Ofsted MI to every ready pack
and the Hampshire root, so every pack shares one MI as-at date.

Usage:
  python3 scripts/refresh-pack-data.py            # two stalest packs + Ofsted align
  python3 scripts/refresh-pack-data.py --all      # full depth for every pack and Hampshire
  python3 scripts/refresh-pack-data.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
import tempfile
import time
from importlib.machinery import SourceFileLoader
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import (  # noqa: E402
    LONDON_BOROUGH_LOCAL_AUTHORITIES,
    SEED_LOCAL_AUTHORITY,
    SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES,
    is_local_authority,
    is_seed_local_authority,
    la_slug,
    normalize_la_name,
)

MANIFEST = ROOT / "public" / "data" / "packs" / "manifest.json"
BEFORE_SNAPSHOT = ROOT / "public" / "data" / "packs" / "data-refresh-before.json"
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "data-refresh-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "data-refresh-latest.md"
SEED_INDEX = ROOT / "public" / "data" / "schools-index.json"
SEED_SUMMARY = ROOT / "public" / "data" / "harvest-summary.json"

# Daily 04:15 UTC. Two packs a day covers the ready set in about a month.
ROTA_CRON = "15 4 * * *"
ROTA_PER_RUN = 2
ROTA_HOUR_UTC = "04:15"

KS2_METRIC_KEYS = (
    "period",
    "eligiblePupils",
    "disadvantagedPercent",
    "senSupportPercent",
    "ehcPercent",
    "ealPercent",
    "rwmExpected",
    "rwmHigher",
    "readingExpected",
    "readingHigher",
    "readingScaled",
    "writingExpected",
    "writingHigher",
    "mathsExpected",
    "mathsHigher",
    "mathsScaled",
    "gpsExpected",
    "gpsHigher",
    "gpsScaled",
    "scienceExpected",
    "boysRwmExpected",
    "girlsRwmExpected",
    "disadvantagedRwmExpected",
    "notDisadvantagedRwmExpected",
)


def utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict, *, pretty: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if pretty:
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    else:
        path.write_text(
            json.dumps(payload, separators=(",", ":")),
            encoding="utf-8",
        )


def merge_summary(path: Path, patch: dict) -> None:
    existing: dict = {}
    if path.exists():
        try:
            loaded = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                existing = loaded
        except json.JSONDecodeError:
            existing = {}
    existing.update({key: value for key, value in patch.items() if value is not None})
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")


def london_names() -> set[str]:
    return {normalize_la_name(name).lower() for name in LONDON_BOROUGH_LOCAL_AUTHORITIES}


def region_for(local_authority: str) -> str:
    if is_seed_local_authority(local_authority):
        return "seed"
    if normalize_la_name(local_authority).lower() in london_names():
        return "london"
    for name in SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES:
        if is_local_authority(local_authority, name):
            return "south-east-dorset"
    return "extended"


def select_rota_slice(targets: list[dict], limit: int) -> list[dict]:
    """Oldest dataRefreshedAt first. Never-refreshed packs lead, then slug."""
    if limit <= 0:
        return []

    def sort_key(row: dict) -> tuple:
        refreshed = row.get("dataRefreshedAt") or ""
        missing = 0 if refreshed else 1
        # Missing stamps sort first (missing=1 would sort last if we used it
        # as a leading 0/1 the wrong way). Never-refreshed must win.
        return (0 if not refreshed else 1, refreshed, row.get("slug") or "")

    ordered = sorted(targets, key=sort_key)
    return ordered[:limit]


def schools_moved_to_as_at(before_rows: list[dict], after_by_slug: dict[str, str]) -> dict:
    """Count schools whose pack MI date changed, using the pre-refresh population."""
    moved = []
    unchanged = []
    for row in before_rows:
        after = after_by_slug.get(row["slug"]) or ""
        before = row.get("ofstedStateAsAt") or ""
        bucket = moved if after and after != before else unchanged
        bucket.append({**row, "ofstedStateAsAtAfter": after})
    return {
        "movedSchools": sum(row["schoolCount"] for row in moved),
        "unchangedSchools": sum(row["schoolCount"] for row in unchanged),
        "moved": moved,
        "unchanged": unchanged,
    }


def merge_ks2_harvest(index_path: Path, harvested_index: Path) -> dict[str, int]:
    """Copy KS2 metrics from a temp harvest onto the live index.

    Identity, Ofsted, GIAS, précis, and ISI fields on the live index stay.
    """
    fresh = load_json(harvested_index)
    current = load_json(index_path)
    fresh_by = {
        str(school.get("urn") or ""): school
        for school in fresh.get("schools") or []
        if school.get("urn")
    }
    schools = current.get("schools") or []
    current_urns = {str(school.get("urn") or "") for school in schools}
    updated = 0
    for school in schools:
        src = fresh_by.get(str(school.get("urn") or ""))
        if not src:
            continue
        for key in KS2_METRIC_KEYS:
            if src.get(key) not in (None, ""):
                school[key] = src[key]
            else:
                school.pop(key, None)
        updated += 1
    added = 0
    for urn, src in fresh_by.items():
        if urn in current_urns:
            continue
        schools.append(src)
        added += 1
    current["schools"] = schools
    current["generatedAt"] = fresh.get("generatedAt") or time.strftime("%Y-%m-%d")
    if fresh.get("period"):
        current["period"] = fresh["period"]
    benchmarks = current.setdefault("benchmarks", {})
    fresh_benches = fresh.get("benchmarks") or {}
    if fresh_benches.get("england"):
        benchmarks["england"] = fresh_benches["england"]
    local_authorities = benchmarks.setdefault("localAuthorities", {})
    local_authorities.update(fresh_benches.get("localAuthorities") or {})
    stats = current.setdefault("stats", {})
    stats["withRwm"] = sum(1 for school in schools if school.get("rwmExpected") is not None)
    stats["schoolCount"] = len(schools)
    stats["ks2RefreshedAt"] = current["generatedAt"]
    write_json(index_path, current)

    directory_path = index_path.with_name("schools-directory.json")
    if directory_path.exists():
        directory = load_json(directory_path)
        by_urn = {str(school.get("urn") or ""): school for school in schools}
        for row in directory.get("schools") or []:
            src = by_urn.get(str(row.get("urn") or ""))
            if not src:
                continue
            if src.get("rwmExpected") is not None:
                row["rwmExpected"] = src["rwmExpected"]
            else:
                row.pop("rwmExpected", None)
            if src.get("eligiblePupils") is not None:
                row["eligiblePupils"] = src["eligiblePupils"]
        directory["generatedAt"] = current["generatedAt"]
        if current.get("period"):
            directory["period"] = current["period"]
        write_json(directory_path, directory)

    summary_path = index_path.with_name("harvest-summary.json")
    merge_summary(
        summary_path,
        {
            "generatedAt": current["generatedAt"],
            "period": current.get("period"),
            "schoolCount": stats["schoolCount"],
            "withRwm": stats["withRwm"],
        },
    )
    if index_path.resolve() == SEED_INDEX.resolve():
        merge_summary(
            ROOT / "src" / "data" / "harvest-summary.json",
            {
                "generatedAt": current["generatedAt"],
                "period": current.get("period"),
                "schoolCount": stats["schoolCount"],
                "withRwm": stats["withRwm"],
            },
        )
    return {"updated": updated, "added": added, "schoolCount": len(schools)}


def load_manifest() -> dict:
    if MANIFEST.exists():
        return load_json(MANIFEST)
    return {"packs": {}}


def save_manifest(payload: dict) -> None:
    payload["generatedAt"] = time.strftime("%Y-%m-%d")
    write_json(MANIFEST, payload, pretty=True)


def index_ofsted_as_at(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        payload = load_json(path)
    except json.JSONDecodeError:
        return ""
    return str((payload.get("stats") or {}).get("ofstedStateAsAt") or "")


def index_school_count(path: Path) -> int:
    if not path.exists():
        return 0
    payload = load_json(path)
    return len(payload.get("schools") or [])


def pack_targets() -> list[dict]:
    manifest = load_manifest()
    rows = []
    for slug, entry in (manifest.get("packs") or {}).items():
        if not isinstance(entry, dict) or entry.get("status") != "ready":
            continue
        la = entry.get("localAuthority") or slug
        index_rel = f"public/data/packs/{slug}/schools-index.json"
        index_path = ROOT / index_rel
        rows.append(
            {
                "slug": slug,
                "localAuthority": la,
                "indexRel": index_rel,
                "isSeed": False,
                "schoolCount": index_school_count(index_path),
                "ofstedStateAsAt": index_ofsted_as_at(index_path),
                "dataRefreshedAt": entry.get("dataRefreshedAt") or "",
                "region": region_for(la),
            }
        )
    rows.sort(key=lambda row: row["slug"])
    return rows


def seed_target() -> dict:
    summary_refreshed = ""
    if SEED_SUMMARY.exists():
        try:
            summary_refreshed = str(load_json(SEED_SUMMARY).get("dataRefreshedAt") or "")
        except json.JSONDecodeError:
            summary_refreshed = ""
    return {
        "slug": la_slug(SEED_LOCAL_AUTHORITY),
        "localAuthority": SEED_LOCAL_AUTHORITY,
        "indexRel": "public/data/schools-index.json",
        "isSeed": True,
        "schoolCount": index_school_count(SEED_INDEX),
        "ofstedStateAsAt": index_ofsted_as_at(SEED_INDEX),
        "dataRefreshedAt": summary_refreshed,
        "region": "seed",
    }


def load_ey_module():
    return SourceFileLoader(
        "enrich_ey_schools",
        str(SCRIPTS / "enrich-ey-schools.py"),
    ).load_module()


def run_script(args: list[str]) -> None:
    cmd = ["python3", *args]
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def refresh_ks2(target: dict) -> None:
    with tempfile.TemporaryDirectory(prefix=f"pack-ks2-{target['slug']}-") as tmp:
        run_script(
            [
                "scripts/harvest-schools.py",
                "--la",
                target["localAuthority"],
                "--out-dir",
                tmp,
            ]
        )
        harvested = Path(tmp) / "schools-index.json"
        if not harvested.exists():
            raise RuntimeError(f"KS2 harvest wrote no index for {target['localAuthority']}")
        stats = merge_ks2_harvest(ROOT / target["indexRel"], harvested)
        print(
            f"KS2 merge {target['localAuthority']}: "
            f"updated={stats['updated']} added={stats['added']}",
            flush=True,
        )


def refresh_gias(target: dict) -> None:
    run_script(
        [
            "scripts/enrich-secondaries.py",
            "--la",
            target["localAuthority"],
            "--index",
            target["indexRel"],
        ]
    )
    run_script(
        [
            "scripts/enrich-school-websites.py",
            "--index",
            target["indexRel"],
        ]
    )


def refresh_ks4(target: dict) -> None:
    run_script(
        [
            "scripts/enrich-independents.py",
            "--la",
            target["localAuthority"],
            "--index",
            target["indexRel"],
            "--skip-isi-html",
        ]
    )


def apply_ofsted(ey_module, bundle: tuple, target: dict) -> str:
    by_urn, csv_url, as_at = bundle
    ey_module.apply_state_ofsted(
        target["indexRel"],
        target["localAuthority"],
        by_urn,
        csv_url,
        as_at,
    )
    return as_at


def stamp_refreshed(target: dict, when: str) -> None:
    index_path = ROOT / target["indexRel"]
    payload = load_json(index_path)
    stats = payload.setdefault("stats", {})
    stats["dataRefreshedAt"] = when
    write_json(index_path, payload)
    summary_path = index_path.with_name("harvest-summary.json")
    merge_summary(
        summary_path,
        {
            "dataRefreshedAt": when,
            "schoolCount": stats.get("schoolCount"),
            "withRwm": stats.get("withRwm"),
            "withKs4": stats.get("withKs4"),
            "giasAsAt": stats.get("giasAsAt"),
            "ofstedStateAsAt": stats.get("ofstedStateAsAt"),
        },
    )
    if target["isSeed"]:
        merge_summary(
            ROOT / "src" / "data" / "harvest-summary.json",
            {
                "dataRefreshedAt": when,
                "schoolCount": stats.get("schoolCount"),
                "withRwm": stats.get("withRwm"),
                "withKs4": stats.get("withKs4"),
                "giasAsAt": stats.get("giasAsAt"),
            },
        )
        return
    manifest = load_manifest()
    packs = manifest.setdefault("packs", {})
    entry = packs.setdefault(target["slug"], {})
    entry["dataRefreshedAt"] = when
    entry["schoolCount"] = stats.get("schoolCount")
    entry["withRwm"] = stats.get("withRwm")
    entry["withKs4"] = stats.get("withKs4")
    entry["giasEnriched"] = bool(stats.get("giasEnriched"))
    save_manifest(manifest)


def write_digest(
    *,
    when: str,
    ofsted_as_at: str,
    ofsted_csv: str,
    depth_slugs: list[str],
    aligned_slugs: list[str],
    failures: list[str],
    before_rows: list[dict],
    rota_size: int,
) -> dict:
    after = {}
    gias_dates = {}
    for row in before_rows:
        path = ROOT / (
            "public/data/schools-index.json"
            if row["region"] == "seed"
            else f"public/data/packs/{row['slug']}/schools-index.json"
        )
        after[row["slug"]] = index_ofsted_as_at(path)
        if path.exists():
            gias_dates[row["slug"]] = str(
                (load_json(path).get("stats") or {}).get("giasAsAt") or ""
            )
    movement = schools_moved_to_as_at(before_rows, after)
    by_region: dict[str, int] = {}
    for row in movement["moved"]:
        by_region[row["region"]] = by_region.get(row["region"], 0) + int(row["schoolCount"])
    shared = sorted({label for label in after.values() if label})
    payload = {
        "generatedAt": when,
        "rota": {
            "cron": ROTA_CRON,
            "hourUtc": ROTA_HOUR_UTC,
            "packsPerRun": ROTA_PER_RUN,
            "readyPacks": rota_size,
            "cycleDays": math.ceil(rota_size / ROTA_PER_RUN) if ROTA_PER_RUN else None,
            "schedule": (
                f"Daily at {ROTA_HOUR_UTC} UTC. Each run refreshes KS2, GIAS, and "
                f"KS4 for the {ROTA_PER_RUN} ready packs with the oldest "
                "dataRefreshedAt, then applies the latest state-school Ofsted MI "
                "to every ready pack and the Hampshire root."
            ),
        },
        "ofstedStateAsAt": ofsted_as_at,
        "ofstedStateCsv": ofsted_csv,
        "sharedOfstedDates": shared,
        "depthRefreshed": depth_slugs,
        "ofstedAligned": aligned_slugs,
        "failures": failures,
        "schoolsMovedToNewMiDate": movement["movedSchools"],
        "schoolsAlreadyOnMiDate": movement["unchangedSchools"],
        "schoolsMovedByRegion": by_region,
        "movedPacks": [
            {
                "slug": row["slug"],
                "localAuthority": row["localAuthority"],
                "region": row["region"],
                "schoolCount": row["schoolCount"],
                "from": row.get("ofstedStateAsAt") or "",
                "to": row.get("ofstedStateAsAtAfter") or "",
            }
            for row in movement["moved"]
        ],
        "giasAsAtBySlug": gias_dates,
    }
    write_json(DIGEST_JSON, payload, pretty=True)
    lines = [
        "# Pack data refresh",
        "",
        f"- Generated: `{when}`",
        f"- Rota: daily `{ROTA_CRON}` ({ROTA_HOUR_UTC} UTC), "
        f"{ROTA_PER_RUN} packs per run, "
        f"{payload['rota']['cycleDays']} days for {rota_size} ready packs.",
        f"- Ofsted state-schools MI: **{ofsted_as_at or 'unknown'}**",
        f"- Schools moved onto that MI date: **{movement['movedSchools']}**",
        f"- Schools already on that date: **{movement['unchangedSchools']}**",
        "",
        "## Moved by region",
        "",
    ]
    if by_region:
        for region, count in sorted(by_region.items()):
            lines.append(f"- {region}: {count}")
    else:
        lines.append("- None")
    lines += ["", "## Depth refreshed this run", ""]
    lines.append(", ".join(depth_slugs) if depth_slugs else "- None")
    if failures:
        lines += ["", "## Failures", ""]
        lines.extend(f"- {item}" for item in failures)
    lines.append("")
    DIGEST_MD.write_text("\n".join(lines), encoding="utf-8")
    return payload


def snapshot_before(rows: list[dict]) -> list[dict]:
    if BEFORE_SNAPSHOT.exists():
        try:
            existing = load_json(BEFORE_SNAPSHOT)
            saved = existing.get("rows")
            if isinstance(saved, list) and saved:
                return saved
        except json.JSONDecodeError:
            pass
    slim = [
        {
            "slug": row["slug"],
            "localAuthority": row["localAuthority"],
            "region": row["region"],
            "schoolCount": row["schoolCount"],
            "ofstedStateAsAt": row["ofstedStateAsAt"],
        }
        for row in rows
    ]
    write_json(
        BEFORE_SNAPSHOT,
        {"generatedAt": utc_now(), "rows": slim},
        pretty=True,
    )
    return slim


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--all",
        action="store_true",
        help="Full KS2 + GIAS + KS4 depth for every ready pack and Hampshire",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=ROTA_PER_RUN,
        help=f"Packs to depth-refresh this run (default {ROTA_PER_RUN})",
    )
    parser.add_argument(
        "--only",
        default="",
        help="Pipe-separated LA labels to depth-refresh instead of the rota slice",
    )
    parser.add_argument(
        "--align-ofsted",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Apply the latest state-school Ofsted MI to every pack (default on)",
    )
    parser.add_argument(
        "--skip-refreshed-on",
        default="",
        help="Skip depth refresh when dataRefreshedAt is on this UTC date (YYYY-MM-DD)",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    packs = pack_targets()
    seed = seed_target()
    everyone = [seed, *packs]

    if args.only.strip():
        wanted = {
            normalize_la_name(part).lower()
            for part in args.only.split("|")
            if normalize_la_name(part)
        }
        depth = [
            row
            for row in everyone
            if normalize_la_name(row["localAuthority"]).lower() in wanted
        ]
    elif args.all:
        depth = list(everyone)
    else:
        depth = select_rota_slice(packs, args.limit)

    if args.skip_refreshed_on:
        day = args.skip_refreshed_on
        depth = [
            row
            for row in depth
            if not str(row.get("dataRefreshedAt") or "").startswith(day)
        ]

    print(
        f"Depth refresh ({len(depth)}): "
        + ", ".join(row["localAuthority"] for row in depth),
        flush=True,
    )
    print(
        f"Ofsted align: {'yes' if args.align_ofsted else 'no'} "
        f"across {len(everyone)} indexes",
        flush=True,
    )
    if args.dry_run:
        return 0

    before_rows = snapshot_before(everyone)
    ey_module = load_ey_module() if (depth or args.align_ofsted) else None
    bundle = None
    if ey_module is not None:
        bundle = ey_module.harvest_state_ofsted()
        print(f"Latest state-school Ofsted MI: {bundle[2]}", flush=True)

    failures: list[str] = []
    depth_done: list[str] = []
    for target in depth:
        when = utc_now()
        print(f"\n=== {target['localAuthority']} ===", flush=True)
        try:
            refresh_ks2(target)
            refresh_gias(target)
            refresh_ks4(target)
            if bundle is not None:
                apply_ofsted(ey_module, bundle, target)
            stamp_refreshed(target, when)
            depth_done.append(target["slug"])
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{target['localAuthority']}: {exc}")
            print(f"FAIL {target['localAuthority']}: {exc}", flush=True)

    aligned: list[str] = []
    if args.align_ofsted and bundle is not None:
        latest = bundle[2]
        for target in everyone:
            current = index_ofsted_as_at(ROOT / target["indexRel"])
            if current == latest:
                continue
            try:
                apply_ofsted(ey_module, bundle, target)
                aligned.append(target["slug"])
            except Exception as exc:  # noqa: BLE001
                failures.append(f"Ofsted align {target['localAuthority']}: {exc}")
                print(f"FAIL align {target['localAuthority']}: {exc}", flush=True)

    ofsted_as_at = bundle[2] if bundle is not None else ""
    ofsted_csv = bundle[1] if bundle is not None else ""
    digest = write_digest(
        when=utc_now(),
        ofsted_as_at=ofsted_as_at,
        ofsted_csv=ofsted_csv,
        depth_slugs=depth_done,
        aligned_slugs=aligned,
        failures=failures,
        before_rows=before_rows,
        rota_size=len(packs),
    )
    if BEFORE_SNAPSHOT.exists() and not failures:
        BEFORE_SNAPSHOT.unlink()
    print(
        f"Schools moved to {ofsted_as_at}: {digest['schoolsMovedToNewMiDate']}",
        flush=True,
    )
    if failures:
        print(f"{len(failures)} failure(s)", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
