#!/usr/bin/env python3
"""Attach school places / admissions-pressure fields to the school index.

Sources (Explore Education Statistics, Open Government Licence):
  - School capacity — school-level places and pupils on roll (SCAP)
  - Primary and secondary school applications and offers — school-level
    preference counts and offers for the latest entry year

These are parental *context* signals (fill / demand pressure), not admission
probabilities or catchment participation rates. True LA participation rates
(>100% ⇒ more children on roll than live in catchment) are place-planning
methodology and are not published as a national school-level open table.

Usage:
  python3 scripts/enrich-admissions-places.py
  python3 scripts/enrich-admissions-places.py --seed-la
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
import sys

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from seed_scope import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    resolve_index_bundle,
)

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
UA = "Mozilla/5.0 (compatible; SchoolCompass/0.1; +https://github.com/jamiefuller320/Comparison-tool)"

# Release + file IDs from EES data guidance / download pages (update when releases move).
CAPACITY_RELEASE_ID = "960750dd-6ed7-4e32-a9df-3cc9132bb1a4"
CAPACITY_ZIP_NAME = "data/capacity_school_200910-202425.csv"
APPS_RELEASE_ID = "0bf4f9cf-721d-44e3-8473-266c87e17e00"
APPS_FILE_ID = "42d0d4e4-9604-413a-8275-00b829ffbdcb"

CAPACITY_CACHE = Path("/tmp/capacity_school.csv")
APPS_CACHE = Path("/tmp/apps_offers_school.csv")


def get_bytes(url: str, retries: int = 4) -> bytes:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept": "*/*"},
            )
            with urllib.request.urlopen(req, timeout=300) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries - 1:
                time.sleep(2**attempt)
                continue
            raise
    raise RuntimeError(f"Failed GET {url}: {last}")


def parse_num(value: str | None) -> float | None:
    if value is None:
        return None
    s = str(value).strip()
    if s == "" or s.lower() in {"z", "x", ":", "c", "u", "supp", "na", "n/a", "n/a"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_int(value: str | None) -> int | None:
    n = parse_num(value)
    if n is None:
        return None
    return int(round(n))


def normalize_period(raw: str | None) -> str | None:
    if not raw:
        return None
    s = str(raw).strip()
    if re.fullmatch(r"\d{6}", s):
        return f"{s[:4]}/{s[4:]}"
    return s


def load_capacity_rows() -> dict[str, dict]:
    if not CAPACITY_CACHE.exists():
        url = (
            "https://content.explore-education-statistics.service.gov.uk/"
            f"api/releases/{CAPACITY_RELEASE_ID}/files?fromPage=ReleaseDownloads"
        )
        blob = get_bytes(url)
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            CAPACITY_CACHE.write_bytes(zf.read(CAPACITY_ZIP_NAME))
    text = CAPACITY_CACHE.read_text(encoding="utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    latest: dict[str, dict] = {}
    latest_period = ""
    for row in reader:
        period = row.get("time_period") or ""
        urn = (row.get("school_urn") or "").strip()
        if not urn:
            continue
        if period > latest_period:
            latest_period = period
        # Keep only the newest period overall; second pass filters.
        latest.setdefault(period, {})[urn] = row
    if not latest:
        return {}
    period = max(latest.keys())
    return latest[period]


def _apps_row_rank(row: dict) -> tuple:
    """Prefer the busiest offer-day row when a URN has multiple entry years."""
    first_prefs = parse_int(row.get("times_put_as_1st_preference")) or 0
    entry = (row.get("entry_year") or "").strip()
    entry_rank = {"7": 3, "R": 2, "3": 1}.get(entry, 0)
    return (first_prefs, entry_rank)


def load_apps_rows() -> dict[str, dict]:
    if not APPS_CACHE.exists():
        url = (
            "https://content.explore-education-statistics.service.gov.uk/"
            f"api/releases/{APPS_RELEASE_ID}/files/{APPS_FILE_ID}"
        )
        APPS_CACHE.write_bytes(get_bytes(url))
    text = APPS_CACHE.read_text(encoding="utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    by_period: dict[str, dict[str, dict]] = {}
    for row in reader:
        period = row.get("time_period") or ""
        urn = (row.get("school_urn") or "").strip()
        if not urn or not period:
            continue
        bucket = by_period.setdefault(period, {})
        prev = bucket.get(urn)
        if prev is None or _apps_row_rank(row) > _apps_row_rank(prev):
            bucket[urn] = row
    if not by_period:
        return {}
    period = max(by_period.keys())
    return by_period[period]


def capacity_fields(row: dict) -> dict:
    places = parse_int(row.get("school_places"))
    on_roll = parse_int(row.get("pupils_on_roll_count"))
    fill_pct = None
    if places and places > 0 and on_roll is not None:
        fill_pct = round(100.0 * on_roll / places, 1)
    return {
        "schoolPlaces": places,
        "pupilsOnRoll": on_roll,
        "placesFillPercent": fill_pct,
        "pupilsOverCapacity": parse_int(row.get("pupils_over_capacity_count")),
        "unfilledPlaces": parse_int(row.get("unfilled_places_count")),
        "placesPeriod": normalize_period(row.get("time_period")),
        "placesSource": "dfe-school-capacity",
    }


def apps_fields(row: dict) -> dict:
    places_offered = parse_int(row.get("total_number_places_offered"))
    first_prefs = parse_int(row.get("times_put_as_1st_preference"))
    any_prefs = parse_int(row.get("times_put_as_any_preferred_school"))
    first_pref_offers = parse_int(row.get("number_1st_preference_offers"))
    offers_other_la = parse_int(row.get("offers_to_applicants_from_another_LA"))
    apps_other_la = parse_int(row.get("all_applications_from_another_LA"))
    first_pref_ratio = None
    if places_offered and places_offered > 0 and first_prefs is not None:
        first_pref_ratio = round(first_prefs / places_offered, 2)
    return {
        "admissionEntryYear": (row.get("entry_year") or "").strip() or None,
        "admissionPhase": (row.get("school_phase") or "").strip() or None,
        "admissionPlacesOffered": places_offered,
        "firstPreferenceApplications": first_prefs,
        "anyPreferenceApplications": any_prefs,
        "firstPreferenceOffers": first_pref_offers,
        "firstPreferenceDemandRatio": first_pref_ratio,
        "applicationsFromOtherLa": apps_other_la,
        "offersToOtherLa": offers_other_la,
        "admissionsPeriod": normalize_period(row.get("time_period")),
        "admissionsSource": "dfe-applications-and-offers",
    }


CLEAR_KEYS = [
    "schoolPlaces",
    "pupilsOnRoll",
    "placesFillPercent",
    "pupilsOverCapacity",
    "unfilledPlaces",
    "placesPeriod",
    "placesSource",
    "admissionEntryYear",
    "admissionPhase",
    "admissionPlacesOffered",
    "firstPreferenceApplications",
    "anyPreferenceApplications",
    "firstPreferenceOffers",
    "firstPreferenceDemandRatio",
    "applicationsFromOtherLa",
    "offersToOtherLa",
    "admissionsPeriod",
    "admissionsSource",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--index",
        type=Path,
        default=DEFAULT_INDEX,
        help="Path to schools-index.json (default: Hampshire root index)",
    )
    parser.add_argument(
        "--seed-la",
        action="store_true",
        help=f"Document-only flag: enrich the maintained {SEED_LOCAL_AUTHORITY} index",
    )
    args = parser.parse_args()

    paths = resolve_index_bundle(args.index, ROOT)
    index_path = Path(paths["index"])
    if not index_path.exists():
        raise SystemExit(f"Missing {index_path} — run harvest first")

    payload = json.loads(index_path.read_text(encoding="utf-8"))
    schools = payload.get("schools") or []
    if args.seed_la:
        print(f"Enriching seed LA index ({SEED_LOCAL_AUTHORITY}) at {index_path}")

    print("Loading school capacity…")
    capacity = load_capacity_rows()
    print(f"  capacity rows (latest period): {len(capacity)}")
    print("Loading applications and offers…")
    apps = load_apps_rows()
    print(f"  apps rows (latest period): {len(apps)}")

    cap_hits = 0
    app_hits = 0
    for school in schools:
        urn = str(school.get("urn") or "")
        for key in CLEAR_KEYS:
            school.pop(key, None)
        if urn in capacity:
            school.update(capacity_fields(capacity[urn]))
            cap_hits += 1
        if urn in apps:
            school.update(apps_fields(apps[urn]))
            app_hits += 1

    payload["admissionsEnrichedAt"] = time.strftime("%Y-%m-%d")
    payload.setdefault("source", {})
    payload["source"]["schoolCapacity"] = (
        "https://explore-education-statistics.service.gov.uk/find-statistics/school-capacity"
    )
    payload["source"]["applicationsAndOffers"] = (
        "https://explore-education-statistics.service.gov.uk/find-statistics/"
        "primary-and-secondary-school-applications-and-offers"
    )
    payload.setdefault("stats", {})
    payload["stats"]["admissionsCapacityMatched"] = cap_hits
    payload["stats"]["admissionsAppsMatched"] = app_hits

    index_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(
        f"Wrote {index_path}: capacity {cap_hits}/{len(schools)}, "
        f"apps {app_hits}/{len(schools)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
