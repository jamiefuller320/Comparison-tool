#!/usr/bin/env python3
"""Harvest English school KS2 performance into a compact parental-choice index.

Pulls institution-level data from the DfE Explore Education Statistics API
(the open data behind Compare school and college performance) for every
school in the KS2 tables, plus England and local-authority benchmarks.

Usage:
  python3 scripts/harvest-schools.py
  python3 scripts/harvest-schools.py --sample 40
  python3 scripts/harvest-schools.py --years 2024/2025,2023/2024
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://api.education.gov.uk/statistics/v1"
UA = "Mozilla/5.0 (compatible; Schoolside/0.1; +https://github.com/jamiefuller320/Comparison-tool)"

DATASET_IDS = {
    "schoolPerformance": "019afee4-e5d0-72f9-9a8f-d7a1a56eac1d",
    "schoolInformation": "019afee4-ba17-73cb-85e0-f88c101bb734",
    "laPerformance": "019afee5-4791-7467-a788-c163fd9b57de",
}

# Filter / indicator IDs from dataset meta (stable across 2024/25 release).
FILTER = {
    "total": "EXcPq",
    "boys": "S9AhV",
    "girls": "bB2Jt",
    "disadvantaged": "R8Jik",
    "not_disadvantaged": "0kCMT",
    "rwm": "PyBQe",
    "reading": "2id7l",
    "writing": "wIWob",
    "maths": "9lHt4",
    "gps": "QCLdw",
    "science": "NgyTD",
}

INDICATOR = {
    "expected": "IwjBz",
    "higher": "i2s6X",
    "scaled": "ODwCL",
}

INFO_INDICATORS = {
    "pupilsAged11": "onQmX",
    "eligiblePupils": "ws8bx",
    "disadvantagedPercent": "0HGT5",
    "disadvantagedCount": "l9CcB",
    "senSupportPercent": "4V7UZ",
    "ehcPercent": "bx4tT",
    "ealPercent": "D8mQe",
    "boysPercent": "S7iVx",
    "girlsPercent": "yPBaB",
    "nonMobilePercent": "RdCka",
}

SUBJECT_KEYS = {
    FILTER["rwm"]: "rwm",
    FILTER["reading"]: "reading",
    FILTER["writing"]: "writing",
    FILTER["maths"]: "maths",
    FILTER["gps"]: "gps",
    FILTER["science"]: "science",
}

NFTYPE_LABELS = {
    "AC": "Academy converter",
    "ACC": "Academy converter",
    "ACCS": "Academy sponsor led",
    "ACS": "Academy sponsor led",
    "CY": "Community school",
    "CYS": "Community special school",
    "F": "Free school",
    "FD": "Foundation school",
    "FDS": "Foundation special school",
    "VA": "Voluntary aided",
    "VC": "Voluntary controlled",
    "IND": "Independent",
}

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "data"
SRC_DATA = ROOT / "src" / "data"


def get_json(url: str, retries: int = 4) -> dict:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json", "User-Agent": UA},
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code in {429, 500, 502, 503, 504} and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    raise RuntimeError(f"Failed GET {url}: {last}")


def fetch_pages(dataset: str, params: dict[str, str], page_size: int = 5000) -> list[dict]:
    results: list[dict] = []
    page = 1
    total_pages = 1
    while page <= total_pages:
        qs = urllib.parse.urlencode({**params, "page": str(page), "pageSize": str(page_size)})
        data = get_json(f"{BASE}/data-sets/{dataset}/query?{qs}")
        batch = data.get("results") or []
        results.extend(batch)
        paging = data.get("paging") or {}
        total_pages = int(paging.get("totalPages") or 1)
        total = paging.get("totalResults")
        print(f"  page {page}/{total_pages} (+{len(batch)}, {len(results)}/{total})", flush=True)
        page += 1
    return results


def parse_metric(value: str | None) -> float | None:
    if value is None:
        return None
    s = str(value).strip()
    if s == "" or s.lower() in {
        "z",
        "x",
        ":",
        ".",
        "c",
        "u",
        "low",
        "suppressed",
        "na",
        "n/a",
        "np",
        "ne",
        "supp",
    }:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def postcode_from_address(address: str | None) -> str | None:
    if not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip() and p.strip().lower() != "z"]
    if not parts:
        return None
    tail = parts[-1]
    # UK postcodes are the last token(s)
    tokens = tail.split()
    if len(tokens) >= 2 and len(tokens[-1]) <= 3:
        return f"{tokens[-2]} {tokens[-1]}".upper()
    return tail.upper() if tail else None


def town_from_address(address: str | None) -> str | None:
    if not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip() and p.strip().lower() != "z"]
    if len(parts) >= 2:
        # penultimate before postcode
        return parts[-2]
    return None


def build_location_maps(meta: dict) -> tuple[dict[str, dict], dict[str, str]]:
    """SCH id -> {urn, name, laEstab}; LA id -> label."""
    schools: dict[str, dict] = {}
    las: dict[str, str] = {}
    for loc in meta.get("locations") or []:
        code = (loc.get("level") or {}).get("code")
        if code == "SCH":
            for opt in loc.get("options") or []:
                schools[opt["id"]] = {
                    "urn": str(opt.get("urn") or ""),
                    "name": opt.get("label") or "",
                    "laEstab": str(opt.get("laEstab") or ""),
                    "locationId": opt["id"],
                }
        elif code == "LA":
            for opt in loc.get("options") or []:
                las[opt["id"]] = opt.get("label") or ""
    return schools, las


def decode_info_meta(meta: dict) -> tuple[dict[str, str], dict[str, dict[str, str]], dict[str, str]]:
    fid_to_col = {f["id"]: f["column"] for f in meta.get("filters") or []}
    col_opts = {
        f["column"]: {o["id"]: o["label"] for o in f.get("options") or []}
        for f in meta.get("filters") or []
    }
    iid_to_col = {i["id"]: i["column"] for i in meta.get("indicators") or []}
    return fid_to_col, col_opts, iid_to_col


def harvest_profiles(sample_urns: set[str] | None = None) -> dict[str, dict]:
    print("Fetching school information meta…", flush=True)
    meta = get_json(f"{BASE}/data-sets/{DATASET_IDS['schoolInformation']}/meta")
    sch_map, la_map = build_location_maps(meta)
    fid_to_col, col_opts, _ = decode_info_meta(meta)

    indicators = ",".join(INFO_INDICATORS.values())
    print("Fetching school information rows…", flush=True)
    rows = fetch_pages(
        DATASET_IDS["schoolInformation"],
        {"indicators": indicators},
    )

    profiles: dict[str, dict] = {}
    for row in rows:
        sch_id = (row.get("locations") or {}).get("SCH")
        la_id = (row.get("locations") or {}).get("LA")
        base = sch_map.get(sch_id or "", {})
        urn = base.get("urn") or ""
        if not urn:
            continue
        if sample_urns is not None and urn not in sample_urns:
            continue

        filters = row.get("filters") or {}
        decoded: dict[str, str] = {}
        for fid, oid in filters.items():
            col = fid_to_col.get(fid, fid)
            decoded[col] = col_opts.get(col, {}).get(oid, oid)

        values = row.get("values") or {}
        metrics = {
            key: parse_metric(values.get(iid))
            for key, iid in INFO_INDICATORS.items()
        }

        address = decoded.get("full_address")
        nftype = decoded.get("nftype") or ""
        profiles[urn] = {
            "urn": urn,
            "name": base.get("name") or decoded.get("school_name_ac") or urn,
            "laEstab": base.get("laEstab") or "",
            "locationId": base.get("locationId") or sch_id,
            "localAuthority": la_map.get(la_id or "", ""),
            "laId": la_id,
            "address": address if address and address.lower() != "z" else None,
            "postcode": postcode_from_address(address),
            "town": town_from_address(address),
            "telephone": decoded.get("telnum") if decoded.get("telnum") not in {None, "z"} else None,
            "ageRange": decoded.get("agerange"),
            "schoolType": nftype,
            "schoolTypeLabel": NFTYPE_LABELS.get(nftype, nftype or None),
            "religiousDenomination": None
            if decoded.get("reldenom") in {None, "Does not apply", "None", "z"}
            else decoded.get("reldenom"),
            "closed": decoded.get("iclose") == "1",
            **metrics,
            "compareUrl": (
                f"https://www.compare-school-performance.service.gov.uk/school/{urn}"
            ),
        }
    print(f"  profiles: {len(profiles)}", flush=True)
    return profiles


def harvest_performance(year: str, sample_location_ids: set[str] | None = None) -> dict[str, dict]:
    """Return locationId -> subject metrics for Total / All pupils."""
    print(f"Fetching KS2 performance for {year}…", flush=True)
    indicators = ",".join([INDICATOR["expected"], INDICATOR["higher"], INDICATOR["scaled"]])
    params = {
        "filters.eq": FILTER["total"],
        "timePeriods.eq": f"{year}|AY",
        "indicators": indicators,
    }
    # urllib urlencode collapses duplicate keys — build manually for filters if needed
    qs = (
        f"filters.eq={FILTER['total']}"
        f"&timePeriods.eq={urllib.parse.quote(f'{year}|AY', safe='|/')}"
        f"&indicators={indicators}"
    )
    results: list[dict] = []
    page = 1
    total_pages = 1
    while page <= total_pages:
        data = get_json(
            f"{BASE}/data-sets/{DATASET_IDS['schoolPerformance']}/query?{qs}&page={page}&pageSize=5000"
        )
        batch = data.get("results") or []
        results.extend(batch)
        paging = data.get("paging") or {}
        total_pages = int(paging.get("totalPages") or 1)
        print(
            f"  page {page}/{total_pages} (+{len(batch)}, {len(results)}/{paging.get('totalResults')})",
            flush=True,
        )
        page += 1

    by_loc: dict[str, dict] = {}
    for row in results:
        sch_id = (row.get("locations") or {}).get("SCH")
        if not sch_id:
            continue
        if sample_location_ids is not None and sch_id not in sample_location_ids:
            continue
        filters = row.get("filters") or {}
        # subject filter id is jfhAM
        subject_id = filters.get("jfhAM")
        key = SUBJECT_KEYS.get(subject_id or "")
        if not key:
            continue
        values = row.get("values") or {}
        slot = by_loc.setdefault(sch_id, {})
        slot[f"{key}Expected"] = parse_metric(values.get(INDICATOR["expected"]))
        slot[f"{key}Higher"] = parse_metric(values.get(INDICATOR["higher"]))
        if key != "rwm" and key != "science" and key != "writing":
            slot[f"{key}Scaled"] = parse_metric(values.get(INDICATOR["scaled"]))
        elif key in {"reading", "maths", "gps"}:
            slot[f"{key}Scaled"] = parse_metric(values.get(INDICATOR["scaled"]))
        else:
            # writing/science/rwm may still carry scaled for some
            scaled = parse_metric(values.get(INDICATOR["scaled"]))
            if scaled is not None:
                slot[f"{key}Scaled"] = scaled

    # Equity for RWM only (boys/girls/disadvantaged)
    print(f"Fetching equity breakdowns for {year}…", flush=True)
    for breakdown_key, filter_id in [
        ("boysRwmExpected", FILTER["boys"]),
        ("girlsRwmExpected", FILTER["girls"]),
        ("disadvantagedRwmExpected", FILTER["disadvantaged"]),
        ("notDisadvantagedRwmExpected", FILTER["not_disadvantaged"]),
    ]:
        page = 1
        total_pages = 1
        while page <= total_pages:
            q = (
                f"filters.eq={filter_id}"
                f"&filters.eq={FILTER['rwm']}"
                f"&timePeriods.eq={urllib.parse.quote(f'{year}|AY', safe='|/')}"
                f"&indicators={INDICATOR['expected']}"
                f"&page={page}&pageSize=5000"
            )
            data = get_json(f"{BASE}/data-sets/{DATASET_IDS['schoolPerformance']}/query?{q}")
            for row in data.get("results") or []:
                # Ensure this is RWM rows — multi filters.eq may not AND; check filter payload
                filters = row.get("filters") or {}
                if filters.get("jfhAM") != FILTER["rwm"]:
                    continue
                if filters.get("fV8YF") != filter_id:
                    continue
                sch_id = (row.get("locations") or {}).get("SCH")
                if not sch_id:
                    continue
                if sample_location_ids is not None and sch_id not in sample_location_ids:
                    continue
                by_loc.setdefault(sch_id, {})[breakdown_key] = parse_metric(
                    (row.get("values") or {}).get(INDICATOR["expected"])
                )
            paging = data.get("paging") or {}
            total_pages = int(paging.get("totalPages") or 1)
            if page == 1:
                print(f"  {breakdown_key}: {paging.get('totalResults')} rows", flush=True)
            page += 1

    print(f"  performance locations: {len(by_loc)}", flush=True)
    return by_loc


def harvest_benchmarks(year: str) -> dict:
    print(f"Fetching England / LA benchmarks for {year}…", flush=True)
    meta = get_json(f"{BASE}/data-sets/{DATASET_IDS['laPerformance']}/meta")
    _, la_map = build_location_maps(meta)
    # LA indicators differ — discover expected/higher/scaled IDs
    ind_by_col = {i["column"]: i["id"] for i in meta.get("indicators") or []}
    # Fallback to Bartley-known IDs if columns match differently
    expected_id = ind_by_col.get("expected_standard_pupil_percent") or "WmV2b"
    higher_id = ind_by_col.get("higher_standard_pupil_percent") or "E1cqF"
    scaled_id = ind_by_col.get("average_scaled_score") or "45XUZ"
    indicators = f"{expected_id},{higher_id},{scaled_id}"

    # Filter options for subject / total
    filt_opts: dict[str, dict[str, str]] = {}
    for f in meta.get("filters") or []:
        filt_opts[f["column"]] = {o["label"]: o["id"] for o in f.get("options") or []}

    total_id = filt_opts.get("breakdown", {}).get("Total") or FILTER["total"]

    def pull(level_param: str) -> dict[str, dict]:
        q = (
            f"{level_param}"
            f"&filters.eq={total_id}"
            f"&timePeriods.eq={urllib.parse.quote(f'{year}|AY', safe='|/')}"
            f"&indicators={indicators}"
        )
        rows = []
        page = 1
        total_pages = 1
        while page <= total_pages:
            data = get_json(f"{BASE}/data-sets/{DATASET_IDS['laPerformance']}/query?{q}&page={page}&pageSize=5000")
            rows.extend(data.get("results") or [])
            total_pages = int((data.get("paging") or {}).get("totalPages") or 1)
            page += 1
        out: dict[str, dict] = {}
        for row in rows:
            filters = row.get("filters") or {}
            # map subject filter to key via meta labels
            subject_fid = None
            for f in meta.get("filters") or []:
                if f["column"] == "subject":
                    subject_fid = f["id"]
                    label_by_id = {o["id"]: o["label"] for o in f["options"]}
                    break
            subj_label = label_by_id.get(filters.get(subject_fid or ""), "") if subject_fid else ""
            key_map = {
                "Reading, writing and maths": "rwm",
                "Reading": "reading",
                "Writing": "writing",
                "Maths": "maths",
                "Grammar, punctuation and spelling": "gps",
                "Science": "science",
            }
            key = key_map.get(subj_label)
            if not key:
                continue
            loc = row.get("locations") or {}
            bucket_id = loc.get("LA") or loc.get("NAT") or "england"
            slot = out.setdefault(bucket_id, {})
            values = row.get("values") or {}
            slot[f"{key}Expected"] = parse_metric(values.get(expected_id))
            slot[f"{key}Higher"] = parse_metric(values.get(higher_id))
            scaled = parse_metric(values.get(scaled_id))
            if scaled is not None:
                slot[f"{key}Scaled"] = scaled
        return out

    england_raw = pull("geographicLevels.eq=NAT")
    la_raw = pull("geographicLevels.eq=LA")

    england = next(iter(england_raw.values()), {})
    local_authorities = {
        la_map.get(lid, lid): metrics
        for lid, metrics in la_raw.items()
        if lid in la_map
    }
    # also keep id map for joins
    la_by_id = {lid: {"name": la_map.get(lid, lid), **metrics} for lid, metrics in la_raw.items()}
    return {"england": england, "localAuthorities": local_authorities, "laById": la_by_id}


def phases_from_age_range(age_range: str | None) -> list[str]:
    """Return every parental stage a setting covers (multi-phase aware)."""
    if not age_range:
        return []
    text = age_range.lower().replace("–", "-").replace("to", "-")
    nums: list[int] = []
    for part in text.replace(" ", "").split("-"):
        try:
            nums.append(int(part))
        except ValueError:
            continue
    if len(nums) < 2 or nums[0] > nums[1]:
        return []
    lo, hi = nums[0], nums[1]
    phases: list[str] = []
    if lo <= 4:
        phases.append("early-years")
    if lo <= 5 and hi >= 7:
        phases.append("ks1")
    if lo <= 10 and hi >= 9:
        phases.append("ks2")
    if lo <= 13 and hi >= 12:
        phases.append("ks3")
    if lo <= 15 and hi >= 15:
        phases.append("ks4")
    return phases


def suggest_phase(age_range: str | None) -> str:
    phases = phases_from_age_range(age_range)
    has_secondary = "ks3" in phases or "ks4" in phases
    if has_secondary and ("ks2" in phases or "ks1" in phases):
        return "all-through"
    if "ks3" in phases and "ks4" in phases:
        return "secondary"
    if "ks4" in phases:
        return "ks4"
    if "ks3" in phases:
        return "ks3"
    if "ks2" in phases and "ks1" in phases:
        return "primary"
    if "ks2" in phases:
        return "junior"
    if "ks1" in phases or "early-years" in phases:
        return "infant"
    return "other"


LEAN_KEYS = [
    "urn",
    "name",
    "localAuthority",
    "town",
    "postcode",
    "address",
    "ageRange",
    "phase",
    "phases",
    "schoolTypeLabel",
    "religiousDenomination",
    "compareUrl",
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
    "latitude",
    "longitude",
]


def lean_school(school: dict) -> dict:
    out: dict = {}
    for key in LEAN_KEYS:
        value = school.get(key)
        if value is None or value == "":
            continue
        out[key] = value
    return out


def merge_index(
    profiles: dict[str, dict],
    perf_by_loc: dict[str, dict],
    year: str,
) -> list[dict]:
    schools: list[dict] = []
    for urn, profile in profiles.items():
        if profile.get("closed"):
            continue
        loc = profile.get("locationId")
        metrics = perf_by_loc.get(loc or "", {})
        school = {
            **profile,
            "period": year if "/" in year else year,
            "phase": suggest_phase(profile.get("ageRange")),
            "phases": phases_from_age_range(profile.get("ageRange")),
            **metrics,
        }
        schools.append(lean_school(school))
    schools.sort(key=lambda s: (s.get("localAuthority") or "", s.get("name") or ""))
    return schools


def pick_sample_urns(profiles: dict[str, dict], n: int) -> set[str]:
    """Deterministic sample biased toward Hampshire juniors + spread."""
    preferred = [
        "116338",  # Bartley
        "116051",  # Lymington
        "116007",  # Hiltingbury
        "115998",  # North Baddesley
        "116052",
        "116006",
        "115989",
        "116015",
    ]
    urns: list[str] = [u for u in preferred if u in profiles]
    # Add diversity by LA
    by_la: dict[str, list[str]] = {}
    for urn, p in profiles.items():
        by_la.setdefault(p.get("localAuthority") or "?", []).append(urn)
    for la in sorted(by_la):
        for urn in sorted(by_la[la])[:2]:
            if urn not in urns:
                urns.append(urn)
            if len(urns) >= n:
                return set(urns[:n])
    return set(urns[:n])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--years",
        default="2024/2025",
        help="Comma-separated academic years (period form YYYY/YYYY)",
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=0,
        help="If set, only harvest N schools (faster smoke run)",
    )
    args = parser.parse_args()
    years = [y.strip() for y in args.years.split(",") if y.strip()]
    latest = years[0]

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Always pull full profiles first (needed for directory + sample selection)
    profiles = harvest_profiles(sample_urns=None)
    sample_urns: set[str] | None = None
    sample_locs: set[str] | None = None
    if args.sample and args.sample > 0:
        sample_urns = pick_sample_urns(profiles, args.sample)
        profiles = {u: profiles[u] for u in sample_urns if u in profiles}
        sample_locs = {p["locationId"] for p in profiles.values() if p.get("locationId")}
        print(f"Sample mode: {len(profiles)} schools", flush=True)

    perf = harvest_performance(latest, sample_location_ids=sample_locs)
    benchmarks = harvest_benchmarks(latest)
    schools = merge_index(profiles, perf, latest)

    # Directory (search index) — lean fields
    directory = []
    for s in schools:
        row = {
            "urn": s["urn"],
            "name": s["name"],
            "localAuthority": s.get("localAuthority"),
            "town": s.get("town"),
            "postcode": s.get("postcode"),
            "ageRange": s.get("ageRange"),
            "phase": s.get("phase"),
            "schoolTypeLabel": s.get("schoolTypeLabel"),
            "rwmExpected": s.get("rwmExpected"),
            "eligiblePupils": s.get("eligiblePupils"),
        }
        directory.append({k: v for k, v in row.items() if v is not None and v != ""})

    england = {k: v for k, v in (benchmarks["england"] or {}).items() if v is not None}
    local_authorities = {
        name: {k: v for k, v in metrics.items() if v is not None}
        for name, metrics in (benchmarks["localAuthorities"] or {}).items()
    }

    payload = {
        "generatedAt": time.strftime("%Y-%m-%d"),
        "period": latest,
        "source": {
            "api": BASE,
            "datasets": DATASET_IDS,
            "primarySite": "https://www.compare-school-performance.service.gov.uk/",
            "note": (
                "Institution-level Key Stage 2 attainment from the DfE Explore "
                "Education Statistics API. Built for parental choice comparison, "
                "not school governance. Progress measures are sparse for 2024/25 "
                "because of missing KS1 baselines."
            ),
        },
        "benchmarks": {
            "england": england,
            "localAuthorities": local_authorities,
        },
        "schools": schools,
        "stats": {
            "schoolCount": len(schools),
            "withRwm": sum(1 for s in schools if s.get("rwmExpected") is not None),
            "localAuthorityCount": len(
                {s.get("localAuthority") for s in schools if s.get("localAuthority")}
            ),
        },
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SRC_DATA.mkdir(parents=True, exist_ok=True)
    schools_path = OUT_DIR / "schools-index.json"
    directory_path = OUT_DIR / "schools-directory.json"
    schools_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    directory_path.write_text(
        json.dumps(
            {
                "generatedAt": payload["generatedAt"],
                "period": latest,
                "schools": directory,
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    # Human-readable summary sidecar (also mirrored under src/data for docs)
    summary = {
        "generatedAt": payload["generatedAt"],
        "period": latest,
        "schoolCount": payload["stats"]["schoolCount"],
        "withRwm": payload["stats"]["withRwm"],
        "localAuthorityCount": payload["stats"]["localAuthorityCount"],
        "files": [f"public/data/{schools_path.name}", f"public/data/{directory_path.name}"],
        "sampleMode": bool(args.sample),
        "indexBytes": schools_path.stat().st_size,
    }
    for dest in (OUT_DIR / "harvest-summary.json", SRC_DATA / "harvest-summary.json"):
        dest.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"Wrote {schools_path} ({schools_path.stat().st_size // 1024} KB)")
    print(f"Wrote {directory_path} ({directory_path.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
