#!/usr/bin/env python3
"""Weekly GIAS lifecycle sync for pack indexes.

Reads the GIAS edubase extract and the establishment-links file, then:

- marks Closed URNs (they drop out of compare, the sitemap, and SEO coverage)
- writes a static-redirect manifest for closed schools that have a successor
- adds open schools in local authorities that already have a pack
- strips GIAS placeholder tokens such as ``z`` from addresses

The 5,000 school-page cap and the included-area list are left unchanged.
Freed cap slots are reported for the Friday SEO coverage loop.

Usage:
  python3 scripts/sync-gias-lifecycle.py
  python3 scripts/sync-gias-lifecycle.py --dry-run
  python3 scripts/sync-gias-lifecycle.py --skip-geocode --skip-aeo
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import subprocess
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from gias_lifecycle import (  # noqa: E402
    apply_coverage_stats,
    apply_gias_lifecycle,
    parse_establishment,
    recount_open_stats,
    sync_directory_schools,
)
from seed_scope import SEED_LOCAL_AUTHORITY, la_slug  # noqa: E402

EDUBASE_BASE = "https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/"
CACHE_DIR = ROOT / ".cache" / "edubase"
UA = "SchoolCompass/gias-lifecycle (+https://schoolcompass.uk)"
COVERAGE_PATH = ROOT / "public" / "data" / "seo-coverage.json"
MANIFEST_PATH = ROOT / "public" / "data" / "packs" / "manifest.json"
REDIRECTS_PATH = ROOT / "public" / "data" / "gias-successor-redirects.json"
DIGEST_JSON = ROOT / "public" / "data" / "gias-lifecycle-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "gias-lifecycle-latest.md"
# Tuesday 06:15 UTC. See .github/workflows/gias-lifecycle-sync.yml.
SCHEDULE = "15 6 * * 2 (Tuesday 06:15 UTC)"


def utc_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def decode_csv(path: Path) -> str:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f"Could not decode {path}")


def ensure_extract(prefix: str, *, refresh: bool) -> tuple[Path, str]:
    """Download ``{prefix}YYYYMMDD.csv``. Return path and the date stamp."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    dest = CACHE_DIR / f"{prefix}.csv"
    stamp_path = CACHE_DIR / f"{prefix}.stamp"
    if (
        not refresh
        and dest.exists()
        and dest.stat().st_size > 1000
        and stamp_path.exists()
    ):
        return dest, stamp_path.read_text(encoding="utf-8").strip()
    last_err: Exception | None = None
    for days_ago in range(14):
        stamp = (date.today() - timedelta(days=days_ago)).strftime("%Y%m%d")
        url = f"{EDUBASE_BASE}{prefix}{stamp}.csv"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = resp.read()
            if len(payload) < 1000:
                continue
            dest.write_bytes(payload)
            stamp_path.write_text(stamp, encoding="utf-8")
            print(f"Downloaded {prefix}{stamp}.csv ({len(payload) // 1024} KB)", flush=True)
            return dest, stamp
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue
    raise RuntimeError(f"Could not download {prefix}: {last_err}")


def write_json_like(path: Path, data: dict) -> None:
    raw = path.read_text(encoding="utf-8") if path.exists() else ""
    pretty = (not raw) or raw.startswith("{\n") or raw.startswith("[\n")
    if pretty:
        text = json.dumps(data, indent=2) + "\n"
    else:
        text = json.dumps(data, separators=(",", ":"), ensure_ascii=True)
        if raw.endswith("\n"):
            text += "\n"
    if text != raw:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


def load_indexes() -> tuple[dict[str, dict], dict[str, Path], dict[str, str], dict]:
    seed_slug = la_slug(SEED_LOCAL_AUTHORITY)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    la_by_slug = {seed_slug: SEED_LOCAL_AUTHORITY}
    paths = {seed_slug: ROOT / "public" / "data" / "schools-index.json"}
    for slug, entry in (manifest.get("packs") or {}).items():
        la_by_slug[slug] = entry.get("localAuthority") or slug
        path = ROOT / "public" / "data" / "packs" / slug / "schools-index.json"
        if path.exists():
            paths[slug] = path
    packs_root = ROOT / "public" / "data" / "packs"
    for path in sorted(packs_root.glob("*/schools-index.json")):
        slug = path.parent.name
        paths.setdefault(slug, path)
    indexes: dict[str, dict] = {}
    for slug, path in paths.items():
        indexes[slug] = json.loads(path.read_text(encoding="utf-8"))
        if slug not in la_by_slug:
            schools = indexes[slug].get("schools") or []
            la_by_slug[slug] = (
                schools[0].get("localAuthority") if schools else slug
            )
    return indexes, paths, la_by_slug, manifest


def geocode_postcodes(postcodes: list[str]) -> dict[str, tuple[float, float]]:
    out: dict[str, tuple[float, float]] = {}
    for start in range(0, len(postcodes), 100):
        chunk = postcodes[start : start + 100]
        req = urllib.request.Request(
            "https://api.postcodes.io/postcodes",
            data=json.dumps({"postcodes": chunk}).encode(),
            headers={
                "Content-Type": "application/json",
                "User-Agent": UA,
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.load(resp)
        except Exception as exc:  # noqa: BLE001
            print(f"Geocode skipped ({exc})", flush=True)
            break
        for item in payload.get("result") or []:
            result = item.get("result") or {}
            lat = result.get("latitude")
            lon = result.get("longitude")
            query = str(item.get("query") or "").upper()
            if not query or lat is None or lon is None:
                continue
            out[query] = (float(lat), float(lon))
    return out


def apply_coordinates(indexes: dict[str, dict], added: set[str]) -> int:
    need: list[str] = []
    seen: set[str] = set()
    for payload in indexes.values():
        for school in payload.get("schools") or []:
            urn = str(school.get("urn") or "")
            if urn not in added or school.get("latitude") is not None:
                continue
            postcode = str(school.get("postcode") or "").upper()
            if postcode and postcode not in seen:
                seen.add(postcode)
                need.append(postcode)
    if not need:
        return 0
    print(f"Geocoding {len(need)} new postcodes…", flush=True)
    coords = geocode_postcodes(need)
    applied = 0
    for payload in indexes.values():
        for school in payload.get("schools") or []:
            if str(school.get("urn") or "") not in added:
                continue
            if school.get("latitude") is not None:
                continue
            pair = coords.get(str(school.get("postcode") or "").upper())
            if not pair:
                continue
            school["latitude"] = round(pair[0], 6)
            school["longitude"] = round(pair[1], 6)
            applied += 1
    return applied


def update_summary(path: Path, stats: dict, *, index_bytes: int | None = None) -> None:
    if not path.exists():
        return
    summary = json.loads(path.read_text(encoding="utf-8"))
    for key, value in stats.items():
        if key in summary:
            summary[key] = value
    if "schoolCount" in summary and "schoolCount" in stats:
        summary["schoolCount"] = stats["schoolCount"]
    summary["closedCount"] = stats.get("closedCount", summary.get("closedCount", 0))
    if index_bytes is not None and "indexBytes" in summary:
        summary["indexBytes"] = index_bytes
    write_json_like(path, summary)


def format_markdown(digest: dict) -> str:
    return "\n".join(
        [
            "# GIAS lifecycle sync",
            "",
            f"- Generated: {digest['generatedAt']}",
            f"- Edubase stamp: `{digest['edubaseStamp']}`",
            f"- Schedule: `{digest['schedule']}`",
            f"- Dry run: {str(digest['dryRun']).lower()}",
            f"- Closed marked (removed from open listings): **{digest['closedMarked']}**",
            f"- Sitemap landings removed: **{digest['sitemapLandingsRemoved']}**",
            f"- Successor redirect pages: **{digest['redirects']}** "
            f"({digest['redirectsOnSite']} to an on-site successor)",
            f"- New schools added: **{digest['newSchools']}**",
            f"- Address placeholder fixes: **{digest['addressFixes']}**",
            f"- Contact-address placeholder fixes: **{digest['contactAddressFixes']}**",
            f"- School pages: {digest['seoPagesBefore']} → **{digest['seoPagesAfter']}** "
            f"/ {digest['maxSchoolPages']}",
            f"- Slots freed under the cap: **{digest['slotsFreed']}**",
            f"- Town pages: {digest['townPagesBefore']} → {digest['townPagesAfter']}",
            "",
            "The page budget and included areas were not changed.",
            "",
        ]
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Write the digest only; do not rewrite indexes or coverage",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Download a fresh edubase extract even if a cache exists",
    )
    parser.add_argument(
        "--skip-geocode",
        action="store_true",
        help="Do not look up coordinates for newly added schools",
    )
    parser.add_argument(
        "--skip-aeo",
        action="store_true",
        help="Do not regenerate seo-urns.json, llms.txt, or aeo-readiness.json",
    )
    args = parser.parse_args(argv)

    edubase_path, stamp = ensure_extract("edubasealldata", refresh=args.refresh)
    links_path, _link_stamp = ensure_extract(
        "links_edubasealldata", refresh=args.refresh
    )
    print(f"Reading GIAS {stamp}…", flush=True)
    establishments = []
    for row in csv.DictReader(io.StringIO(decode_csv(edubase_path))):
        est = parse_establishment(row)
        if est:
            establishments.append(est)
    link_rows = list(csv.DictReader(io.StringIO(decode_csv(links_path))))
    print(
        f"  establishments {len(establishments)}; links {len(link_rows)}",
        flush=True,
    )

    indexes, paths, la_by_slug, manifest = load_indexes()
    coverage = json.loads(COVERAGE_PATH.read_text(encoding="utf-8"))
    budget = coverage.get("pageBudget") or {}
    policy = coverage.get("policy") or {}
    seed_slug = la_slug(SEED_LOCAL_AUTHORITY)
    result = apply_gias_lifecycle(
        indexes,
        establishments,
        link_rows,
        la_by_slug=la_by_slug,
        included_area_slugs=list(coverage.get("includedAreaSlugs") or [seed_slug]),
        seed_slug=seed_slug,
        max_school_pages=int(budget.get("maxSchoolPages") or 5000),
        town_min_schools=int(policy.get("townMinSchools") or 8),
    )
    if not args.skip_geocode and not args.dry_run and result.added_urns:
        apply_coordinates(indexes, set(result.added_urns))
        for payload in indexes.values():
            recount_open_stats(payload)

    digest = {
        "generatedAt": utc_now(),
        "edubaseStamp": stamp,
        "schedule": SCHEDULE,
        "dryRun": bool(args.dry_run),
        "closedMarked": result.closed_marked,
        "sitemapLandingsRemoved": result.sitemap_landings_removed,
        "redirects": result.redirects,
        "redirectsOnSite": result.redirects_on_site,
        "newSchools": result.new_schools,
        "addressFixes": result.address_fixes,
        "contactAddressFixes": result.contact_address_fixes,
        "seoPagesBefore": result.seo_pages_before,
        "seoPagesAfter": result.seo_pages_after,
        "slotsFreed": result.slots_freed,
        "maxSchoolPages": result.max_school_pages,
        "townPagesBefore": result.town_pages_before,
        "townPagesAfter": result.town_pages_after,
        "addedUrns": result.added_urns,
    }
    write_json_like(DIGEST_JSON, digest)
    DIGEST_MD.write_text(format_markdown(digest), encoding="utf-8")

    if not args.dry_run:
        for slug, payload in indexes.items():
            path = paths[slug]
            write_json_like(path, payload)
            directory_path = path.with_name("schools-directory.json")
            if directory_path.exists():
                directory = json.loads(directory_path.read_text(encoding="utf-8"))
                sync_directory_schools(directory, payload.get("schools") or [])
                write_json_like(directory_path, directory)
            summary_path = path.with_name("harvest-summary.json")
            update_summary(
                summary_path,
                payload.get("stats") or {},
                index_bytes=path.stat().st_size,
            )
            if slug == seed_slug:
                update_summary(
                    ROOT / "src" / "data" / "harvest-summary.json",
                    payload.get("stats") or {},
                    index_bytes=path.stat().st_size,
                )
            entry = (manifest.get("packs") or {}).get(slug)
            if entry:
                stats = payload.get("stats") or {}
                entry["schoolCount"] = stats.get("schoolCount", entry.get("schoolCount"))
                if "withRwm" in entry and "withRwm" in stats:
                    entry["withRwm"] = stats["withRwm"]
                if "withKs4" in entry and "withKs4" in stats:
                    entry["withKs4"] = stats["withKs4"]
        write_json_like(MANIFEST_PATH, manifest)
        write_json_like(
            REDIRECTS_PATH,
            {
                "version": 1,
                "generatedAt": digest["generatedAt"],
                "edubaseStamp": stamp,
                "redirects": result.redirect_rows,
            },
        )
        updated_coverage = apply_coverage_stats(coverage, result)
        # Keep the previous expansion note. Slots freed are in stats.
        if "addedThisRun" in (coverage.get("stats") or {}) and "addedThisRun" not in updated_coverage["stats"]:
            updated_coverage["stats"]["addedThisRun"] = coverage["stats"]["addedThisRun"]
        write_json_like(COVERAGE_PATH, updated_coverage)
        if not args.skip_aeo:
            print("Regenerating SEO URN manifest…", flush=True)
            subprocess.run(
                ["npm", "run", "generate:aeo-manifests"],
                cwd=ROOT,
                check=True,
            )

    print(format_markdown(digest), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
