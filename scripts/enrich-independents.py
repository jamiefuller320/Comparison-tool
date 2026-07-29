#!/usr/bin/env python3
"""Enrich schools with KS4/KS5 outcomes and independent inspection MI.

State schools already carry KS2 table metrics. This script adds:
  - DfE EES Key Stage 4 outcomes for independents and state secondaries
  - DfE EES 16–18 / A-level outcomes where published (both sectors)
  - Ofsted non-association independent inspection grades (independents only)
  - GIAS website / inspectorate links for ISI schools (independents only)

Usage:
  python3 scripts/enrich-independents.py
  python3 scripts/enrich-independents.py --la Surrey --index public/data/packs/surrey/schools-index.json
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from sector_benches import ks4_benchmark_block  # noqa: E402
from seed_scope import (  # noqa: E402
    filter_schools_to_la,
    normalize_la_name,
    resolve_index_bundle,
)

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
SRC_SUMMARY = ROOT / "src" / "data" / "harvest-summary.json"

BASE = "https://api.education.gov.uk/statistics/v1"
UA = "Mozilla/5.0 (compatible; Schoolside/0.1; +https://github.com/jamiefuller320/Comparison-tool)"

# Key stage 4 institution level - Schools (performance), 2024/25
KS4_DATASET = "19e39901-a96c-be76-b9c2-6af54ae076d2"
KS4_YEAR = "2024/2025"

# Filter option IDs for Total on each breakdown (from dataset meta).
KS4_FILTER_TOTALS = [
    "5Kydi",  # disadvantage_status Total
    "mws9K",  # first_language Total
    "WCb2b",  # mobility Total
    "9b64v",  # sex Total
]

# EES ORs repeated filters.eq — keep only the all-Total cross-tab client-side.
KS4_TOTAL_FILTERS = {
    "pPmSo": "5Kydi",  # Disadvantaged status
    "IzpBz": "mws9K",  # First language
    "ibG6X": "WCb2b",  # Mobility status
    "LZ6Wj": "9b64v",  # Sex
}

KS4_INDICATORS = {
    "att8Average": "kgVhs",
    "engMath94Percent": "hCRyW",
    "engMath95Percent": "dDo0Z",
    "engMathEnteringPercent": "yBiaB",
    "anyPassPercent": "cHR31",
    "ebaccEnteringPercent": "bmztT",
    "ebacc94Percent": "mqo9K",
    "ebaccAps": "flgYF",
    "ebaccEng94Percent": "ghgO9",
    "ebaccMat94Percent": "Pbmeb",
    "ebaccSci94Percent": "15Di3",
    "ebaccEngEnteringPercent": "DeYQe",
    "ebaccMatEnteringPercent": "4G6UZ",
    "ks4Pupils": "IL3Bz",
}

# 16 to 18 study - institution level (A level / academic APS)
KS5_DATASET = "019c2960-81e3-70c2-8d65-72c3718ae4fd"
KS5_YEAR = "2024/2025"
KS5_FILTER_DISADVANTAGE_TOTAL = "U34ER"
KS5_FILTER_ALEVEL = "rG65N"
KS5_FILTER_ACADEMIC = "oWuwm"
KS5_FILTER_DISADVANTAGE_FIELD = "Q7Awb"
KS5_FILTER_COHORT_FIELD = "98L4v"

KS5_INDICATORS = {
    "ks5ApsPerEntry": "Bf2N7",
    "ks5Best3Aps": "qGU8j",
    "ks5Students": "TuwFP",
    "ks5AlevelStudents": "cZzR3",
    "ks5ValueAdded": "gIygO",
}

KS5_FIELD_KEYS = list(KS5_INDICATORS.keys()) + [
    "ks5Period",
    "ks5Cohort",
    "ks5ClearedNilFields",
]

OFSTED_PAGE = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "non-association-independent-schools-inspections-and-outcomes-management-information"
)
EDUBASE_CACHE = Path("/tmp/edubase-all.csv")
EDUBASE_BASE = (
    "https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/"
)

OFSTED_GRADE_LABELS = {
    "1": "Outstanding",
    "2": "Good",
    "3": "Requires improvement",
    "4": "Inadequate",
}


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
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"GET failed {url}: {last}")


def get_bytes(url: str, retries: int = 4) -> bytes:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Download failed {url}: {last}")


def parse_metric(raw: str | None) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text or text.lower() in {"z", "c", "x", "null", "na", "n/a", ".", "ne", "supp"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def build_sch_map(meta: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for loc in meta.get("locations") or []:
        if (loc.get("level") or {}).get("code") != "SCH":
            continue
        for opt in loc.get("options") or []:
            urn = str(opt.get("urn") or "").strip()
            if urn:
                out[opt["id"]] = urn
    return out


def _positive(value: float | None) -> bool:
    return value is not None and value > 0


def sanitize_ks4_metrics(metrics: dict) -> tuple[dict, list[str]]:
    """Treat likely nil / non-comparable zero returns as missing.

    Many independents take IGCSEs or other quals that DfE does not count in the
    combined English & maths GCSE measure, so the API returns 0% alongside real
    Attainment 8 / pass rates. Those zeros mislead parents and are cleared here.
    """
    out = dict(metrics)
    cleared: list[str] = []
    att8 = out.get("att8Average")
    any_pass = out.get("anyPassPercent")
    pupils = out.get("ks4Pupils")
    active = _positive(att8) or _positive(any_pass) or _positive(pupils)

    if att8 == 0:
        out["att8Average"] = None
        cleared.append("att8Average")
        att8 = None
        active = _positive(any_pass) or _positive(pupils)

    if any_pass == 0 and (_positive(att8) or _positive(pupils)):
        out["anyPassPercent"] = None
        cleared.append("anyPassPercent")
        any_pass = None

    eng_enter = out.get("engMathEnteringPercent")
    eng94 = out.get("engMath94Percent")
    eng95 = out.get("engMath95Percent")
    engmath_nil = eng_enter == 0 or (eng94 == 0 and active)
    if engmath_nil:
        if eng94 == 0:
            out["engMath94Percent"] = None
            cleared.append("engMath94Percent")
        if eng95 == 0:
            out["engMath95Percent"] = None
            cleared.append("engMath95Percent")
        if eng_enter == 0:
            out["engMathEnteringPercent"] = None
            cleared.append("engMathEnteringPercent")
        out["engMathMeasureUnavailable"] = True

        # Alternative: EBacc English / maths pillars often still carry GCSE-counted results.
        eng_p = out.get("ebaccEng94Percent")
        mat_p = out.get("ebaccMat94Percent")
        eng_p_enter = out.get("ebaccEngEnteringPercent")
        mat_p_enter = out.get("ebaccMatEnteringPercent")
        if eng_p == 0 and eng_p_enter == 0:
            out["ebaccEng94Percent"] = None
            cleared.append("ebaccEng94Percent")
            eng_p = None
        if mat_p == 0 and mat_p_enter == 0:
            out["ebaccMat94Percent"] = None
            cleared.append("ebaccMat94Percent")
            mat_p = None
        if _positive(eng_p) and _positive(mat_p):
            fallback = round(min(float(eng_p), float(mat_p)), 1)
            out["engMath94Percent"] = fallback
            out["engMath94IsPillarFallback"] = True
            out["engMathMeasureUnavailable"] = False

    # EBacc achievement of 0% is not meaningful when nobody entered the suite.
    if out.get("ebaccEnteringPercent") == 0 and out.get("ebacc94Percent") == 0:
        out["ebacc94Percent"] = None
        cleared.append("ebacc94Percent")

    if out.get("ebaccAps") == 0 and active:
        out["ebaccAps"] = None
        cleared.append("ebaccAps")

    if out.get("ks4Pupils") == 0:
        out["ks4Pupils"] = None
        cleared.append("ks4Pupils")

    return out, cleared


def sanitize_ks5_metrics(metrics: dict) -> tuple[dict, list[str]]:
    """Clear zero APS / cohort figures that look like nil returns."""
    out = dict(metrics)
    cleared: list[str] = []
    students = out.get("ks5Students")
    alevel_students = out.get("ks5AlevelStudents")
    active = _positive(students) or _positive(alevel_students)

    for key in ("ks5ApsPerEntry", "ks5Best3Aps"):
        if out.get(key) == 0 and active:
            out[key] = None
            cleared.append(key)

    if out.get("ks5Students") == 0:
        out["ks5Students"] = None
        cleared.append("ks5Students")
    if out.get("ks5AlevelStudents") == 0:
        out["ks5AlevelStudents"] = None
        cleared.append("ks5AlevelStudents")

    return out, cleared


def harvest_ks4(indie_urns: set[str]) -> tuple[dict[str, dict], str, int]:
    print("Fetching KS4 meta…", flush=True)
    meta = get_json(f"{BASE}/data-sets/{KS4_DATASET}/meta")
    sch_map = build_sch_map(meta)
    print(f"  SCH locations with URN: {len(sch_map)}", flush=True)

    indicators = ",".join(KS4_INDICATORS.values())
    filter_qs = "&".join(f"filters.eq={fid}" for fid in KS4_FILTER_TOTALS)
    base_qs = (
        f"{filter_qs}"
        f"&timePeriods.eq={urllib.parse.quote(f'{KS4_YEAR}|AY', safe='|/')}"
        f"&indicators={indicators}"
    )

    by_urn: dict[str, dict] = {}
    cleared_total = 0
    skipped_subgroups = 0
    page = 1
    total_pages = 1
    while page <= total_pages:
        url = f"{BASE}/data-sets/{KS4_DATASET}/query?{base_qs}&page={page}&pageSize=5000"
        data = get_json(url)
        paging = data.get("paging") or {}
        total_pages = int(paging.get("totalPages") or 1)
        batch = data.get("results") or []
        print(f"  KS4 page {page}/{total_pages} ({len(batch)} rows)", flush=True)
        for row in batch:
            # Repeated filters.eq is OR'd by EES — reject non all-Total cross-tabs.
            if (row.get("filters") or {}) != KS4_TOTAL_FILTERS:
                skipped_subgroups += 1
                continue
            sch_id = (row.get("locations") or {}).get("SCH")
            urn = sch_map.get(sch_id or "", "")
            if not urn or urn not in indie_urns:
                continue
            values = row.get("values") or {}
            metrics = {
                key: parse_metric(values.get(iid))
                for key, iid in KS4_INDICATORS.items()
            }
            if all(v is None for v in metrics.values()):
                continue
            if urn in by_urn:
                raise RuntimeError(
                    f"Duplicate all-Total KS4 row for URN {urn} — "
                    "check filter cross-tab selection"
                )
            metrics, cleared = sanitize_ks4_metrics(metrics)
            cleared_total += len(cleared)
            metrics["ks4Period"] = KS4_YEAR
            if cleared:
                metrics["ks4ClearedNilFields"] = cleared
            by_urn[urn] = metrics
        page += 1

    print(
        f"  KS4 matched schools: {len(by_urn)} "
        f"(cleared {cleared_total} nil/zero field values; "
        f"skipped {skipped_subgroups} subgroup rows)",
        flush=True,
    )
    return by_urn, KS4_YEAR, cleared_total


def harvest_ks5(indie_urns: set[str]) -> tuple[dict[str, dict], str, int]:
    """Harvest A-level (preferred) then Academic APS for independents."""
    print("Fetching KS5 / 16–18 meta…", flush=True)
    meta = get_json(f"{BASE}/data-sets/{KS5_DATASET}/meta")
    sch_map = build_sch_map(meta)
    print(f"  SCH locations with URN: {len(sch_map)}", flush=True)

    indicators = ",".join(KS5_INDICATORS.values())
    base_qs = (
        f"timePeriods.eq={urllib.parse.quote(f'{KS5_YEAR}|AY', safe='|/')}"
        f"&indicators={indicators}"
    )

    alevel_by_urn: dict[str, dict] = {}
    academic_by_urn: dict[str, dict] = {}
    page = 1
    total_pages = 1
    while page <= total_pages:
        url = f"{BASE}/data-sets/{KS5_DATASET}/query?{base_qs}&page={page}&pageSize=5000"
        data = get_json(url)
        paging = data.get("paging") or {}
        total_pages = int(paging.get("totalPages") or 1)
        batch = data.get("results") or []
        print(f"  KS5 page {page}/{total_pages} ({len(batch)} rows)", flush=True)
        for row in batch:
            filters = row.get("filters") or {}
            if filters.get(KS5_FILTER_DISADVANTAGE_FIELD) != KS5_FILTER_DISADVANTAGE_TOTAL:
                continue
            cohort = filters.get(KS5_FILTER_COHORT_FIELD)
            if cohort not in {KS5_FILTER_ALEVEL, KS5_FILTER_ACADEMIC}:
                continue
            sch_id = (row.get("locations") or {}).get("SCH")
            urn = sch_map.get(sch_id or "", "")
            if not urn or urn not in indie_urns:
                continue
            values = row.get("values") or {}
            metrics = {
                key: parse_metric(values.get(iid))
                for key, iid in KS5_INDICATORS.items()
            }
            if all(v is None for v in metrics.values()):
                continue
            metrics, _cleared = sanitize_ks5_metrics(metrics)
            metrics["ks5Period"] = KS5_YEAR
            metrics["ks5Cohort"] = "A level" if cohort == KS5_FILTER_ALEVEL else "Academic"
            if _cleared:
                metrics["ks5ClearedNilFields"] = _cleared
            if cohort == KS5_FILTER_ALEVEL:
                alevel_by_urn[urn] = metrics
            else:
                academic_by_urn[urn] = metrics
        page += 1

    by_urn = dict(alevel_by_urn)
    for urn, metrics in academic_by_urn.items():
        if urn not in by_urn:
            by_urn[urn] = metrics

    cleared_total = sum(len(m.get("ks5ClearedNilFields") or []) for m in by_urn.values())
    print(
        f"  KS5 matched schools: {len(by_urn)} "
        f"(A level {len(alevel_by_urn)}; academic fill "
        f"{len(by_urn) - len(alevel_by_urn)}; cleared {cleared_total} nil fields)",
        flush=True,
    )
    return by_urn, KS5_YEAR, cleared_total


def ensure_edubase() -> Path:
    if EDUBASE_CACHE.exists() and EDUBASE_CACHE.stat().st_size > 1_000_000:
        return EDUBASE_CACHE
    from datetime import date, timedelta

    last_err: Exception | None = None
    for i in range(14):
        d = (date.today() - timedelta(days=i)).strftime("%Y%m%d")
        url = f"{EDUBASE_BASE}edubasealldata{d}.csv"
        try:
            EDUBASE_CACHE.write_bytes(get_bytes(url))
            print(f"Downloaded Edubase {d}", flush=True)
            return EDUBASE_CACHE
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue
    raise RuntimeError(f"Could not download Edubase CSV: {last_err}")


def isi_reports_search_url(
    *,
    postcode: str | None,
    name: str | None,
    urn: str,
) -> str:
    """ISI reports directory search — name query is the working entry point."""
    clean_name = (name or "").strip()
    if clean_name:
        return (
            "https://www.isi.net/reports/?i=school&name="
            + urllib.parse.quote(clean_name)
        )
    pc = (postcode or "").strip().upper().replace("  ", " ")
    if pc:
        return (
            "https://www.isi.net/reports/?i=school&name="
            + urllib.parse.quote(pc)
        )
    return (
        "https://www.isi.net/reports/?i=school&name="
        + urllib.parse.quote(urn)
    )


def resolve_isi_profile_url(name: str, postcode: str | None = None) -> str | None:
    """Best-effort resolve of an ISI institution profile from the reports search.

    Returns None on network/parse failure so callers can keep the search URL.
    """
    clean_name = (name or "").strip()
    if not clean_name:
        return None
    search = isi_reports_search_url(postcode=postcode, name=clean_name, urn="")
    try:
        html = get_bytes(search).decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return None
    # Hrefs may be absolute, root-relative, or site-relative without a leading /.
    matches = re.findall(
        r'href="((?:https://www\.isi\.net)?/?institutions/school/[^"#?\s]+)"',
        html,
        flags=re.I,
    )
    normalized: list[str] = []
    for raw in matches:
        path = raw.split("?", 1)[0]
        if path.startswith("http"):
            normalized.append(path)
        elif path.startswith("/"):
            normalized.append("https://www.isi.net" + path)
        else:
            normalized.append("https://www.isi.net/" + path)
    # De-dupe while preserving order.
    seen: set[str] = set()
    matches = []
    for url in normalized:
        if url in seen:
            continue
        seen.add(url)
        matches.append(url)
    if not matches:
        return None
    if len(matches) == 1:
        return matches[0]
    tokens = [
        t
        for t in re.findall(r"[a-z0-9]+", clean_name.lower())
        if t not in {"school", "college", "the", "and", "of"}
    ]
    scored: list[tuple[int, str]] = []
    for url in matches:
        slug = url.rsplit("/", 1)[-1].lower()
        score = sum(1 for t in tokens if t in slug)
        scored.append((score, url))
    scored.sort(key=lambda row: (-row[0], row[1]))
    if scored and scored[0][0] > 0:
        return scored[0][1]
    return matches[0]


_ISI_REPORT_KIND = {
    "ROU": "Routine inspection",
    "EQI": "Educational quality inspection",
    "FLW": "Focused compliance / welfare",
    "FLWMC": "Focused compliance / welfare",
    "NRIMC": "Interim monitoring visit",
    "ADD": "Additional inspection",
    "GRT": "Progress monitoring",
    "COMP": "Compliance inspection",
}


def parse_isi_latest_report(html: str) -> dict | None:
    """Pick the newest DownloadReport PDF from an ISI institution profile page."""
    reports: list[dict] = []
    for href in re.findall(
        r'href="(https://reports\.isi\.net/DownloadReport\.aspx[^"]+)"',
        html,
        flags=re.I,
    ):
        m = re.search(r"[?&]r=([A-Za-z0-9]+)_(\d{8})\.pdf", href, flags=re.I)
        if not m:
            continue
        kind_code = m.group(1).upper()
        # Strip trailing school-id digits from codes like ROU7250 / NRIMC7250.
        kind_key = re.sub(r"\d+$", "", kind_code)
        ymd = m.group(2)
        date_iso = f"{ymd[0:4]}-{ymd[4:6]}-{ymd[6:8]}"
        title = _ISI_REPORT_KIND.get(kind_key, "ISI inspection report")
        reports.append(
            {
                "isiLatestReportUrl": href.replace("&amp;", "&"),
                "isiLatestReportDate": date_iso,
                "isiLatestReportTitle": title,
                "_sort": ymd,
            }
        )
    if not reports:
        return None
    reports.sort(key=lambda row: row["_sort"], reverse=True)
    best = reports[0]
    best.pop("_sort", None)
    return best


def enrich_isi_report_metadata(entry: dict, name: str, postcode: str | None) -> None:
    """Attach profile + latest report citation fields when resolvable."""
    profile = entry.get("isiProfileUrl")
    if not profile:
        profile = resolve_isi_profile_url(name, postcode)
    if not profile:
        return
    entry["isiProfileUrl"] = profile
    # Prefer the stable profile as the archive link when we have one.
    entry["isiReportsUrl"] = profile
    entry["inspectionReportsUrl"] = profile
    try:
        html = get_bytes(profile).decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return
    latest = parse_isi_latest_report(html)
    if latest:
        entry.update(latest)


def harvest_gias_directory(indie_urns: set[str]) -> dict[str, dict]:
    """Website + inspectorate from GIAS when Ofsted MI has no row (ISI schools)."""
    print("Fetching GIAS website / inspectorate for independents…", flush=True)
    path = ensure_edubase()
    raw = path.read_bytes()
    text = None
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise RuntimeError("Could not decode Edubase CSV")

    reader = csv.DictReader(io.StringIO(text))
    by_urn: dict[str, dict] = {}
    # Cap live ISI HTML lookups so a national enrich does not hammer isi.net.
    isi_profile_resolves_left = 120
    isi_profiles_resolved = 0
    for row in reader:
        urn = str(row.get("URN") or "").strip()
        if urn not in indie_urns:
            continue
        website = (row.get("SchoolWebsite") or "").strip()
        inspectorate = (row.get("InspectorateName (name)") or "").strip()
        name = (row.get("EstablishmentName") or "").strip()
        postcode = (row.get("Postcode") or "").strip()
        report = (row.get("InspectorateReport") or "").strip()
        entry: dict = {
            "giasUrl": (
                "https://www.get-information-schools.service.gov.uk/"
                f"Establishments/Establishment/Details/{urn}"
            )
        }
        if website:
            if not website.startswith("http"):
                website = "https://" + website
            entry["schoolWebsite"] = website
        if inspectorate:
            entry["inspectorateName"] = inspectorate
            if inspectorate.upper() == "ISI":
                if report and report.lower().startswith("http"):
                    entry["isiReportsUrl"] = report
                    entry["inspectionReportsUrl"] = report
                else:
                    entry["isiReportsUrl"] = isi_reports_search_url(
                        postcode=postcode,
                        name=name,
                        urn=urn,
                    )
                    entry["inspectionReportsUrl"] = entry["isiReportsUrl"]
                if isi_profile_resolves_left > 0:
                    before = entry.get("isiProfileUrl")
                    enrich_isi_report_metadata(entry, name, postcode)
                    isi_profile_resolves_left -= 1
                    if entry.get("isiProfileUrl") and entry.get("isiProfileUrl") != before:
                        isi_profiles_resolved += 1
                    elif entry.get("isiLatestReportUrl"):
                        isi_profiles_resolved += 1
        if len(entry) > 1 or inspectorate or website:
            by_urn[urn] = entry
    print(
        f"  GIAS directory rows: {len(by_urn)} "
        f"(ISI profiles resolved {isi_profiles_resolved})",
        flush=True,
    )
    return by_urn


_MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def ofsted_csv_sort_key(url: str) -> tuple[int, int, int]:
    m = re.search(
        r"as_at_(\d{1,2})_([A-Za-z]+)_(\d{4})\.csv",
        url,
        flags=re.IGNORECASE,
    )
    if not m:
        return (0, 0, 0)
    day = int(m.group(1))
    month = _MONTHS.get(m.group(2).lower(), 0)
    year = int(m.group(3))
    return (year, month, day)


def latest_ofsted_csv_url() -> str:
    html = get_bytes(OFSTED_PAGE).decode("utf-8", "replace")
    matches = re.findall(
        r'https://assets\.publishing\.service\.gov\.uk/media/[a-f0-9]+/'
        r'Management_information_-_non-association_independent_schools_most_recent_inspections_data_as_at_[^"]+\.csv',
        html,
    )
    if not matches:
        raise RuntimeError("Could not find Ofsted most-recent inspections CSV on GOV.UK page")
    unique = list(dict.fromkeys(matches))
    unique.sort(key=ofsted_csv_sort_key)
    chosen = unique[-1]
    print(f"  Ofsted CSV: {chosen}", flush=True)
    return chosen


def grade_label(code: str | None) -> str | None:
    if not code:
        return None
    text = str(code).strip()
    if not text or text.upper() == "NULL":
        return None
    if text in OFSTED_GRADE_LABELS:
        return OFSTED_GRADE_LABELS[text]
    # Already a label / ISS wording
    if any(ch.isalpha() for ch in text):
        return text
    return text


def first_value(row: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        raw = row.get(key)
        if raw is None:
            continue
        text = str(raw).strip()
        if text and text.upper() != "NULL":
            return text
    return None


def harvest_ofsted() -> tuple[dict[str, dict], str]:
    print("Fetching Ofsted independent inspection MI…", flush=True)
    url = latest_ofsted_csv_url()
    raw = get_bytes(url)
    text = None
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise RuntimeError("Could not decode Ofsted CSV")

    reader = csv.DictReader(io.StringIO(text))
    by_urn: dict[str, dict] = {}
    for row in reader:
        urn = (row.get("URN") or "").strip()
        if not urn:
            continue
        overall_code = first_value(
            row,
            "Latest OEIF overall effectiveness",
            "Overall effectiveness",
        )
        quality_code = first_value(
            row,
            "Latest OEIF quality of education",
            "Quality of education",
            "Achievement",
        )
        leadership_code = first_value(
            row,
            "Latest OEIF effectiveness of leadership and management",
            "Effectiveness of leadership and management",
            "Leadership and governance",
        )
        published = first_value(
            row,
            "Publication date of latest OEIF standard inspection",
            "Publication date",
        )
        inspected = first_value(
            row,
            "Inspection start date of latest OEIF standard inspection",
            "First day of inspection",
            "Inspection start date",
        )
        report = first_value(
            row,
            "Web link to Ofsted provider page",
            "Web link to Ofsted provider page (opens in new window)",
        )
        iss = first_value(
            row,
            "Most recent standard inspection: Overall compliance with ISS",
            "Overall standards - Standard inspections",
        )
        safeguarding = first_value(
            row,
            "Latest OEIF safeguarding is effective?",
            "Safeguarding is effective?",
            "Safeguarding standards",
        )
        inspectorate = first_value(row, "Inspectorate") or "Ofsted"
        nor = parse_metric(first_value(row, "Total number of pupils", "Number on roll"))

        by_urn[urn] = {
            "ofstedOverall": grade_label(overall_code),
            "ofstedOverallCode": overall_code,
            "ofstedQualityOfEducation": grade_label(quality_code),
            "ofstedLeadership": grade_label(leadership_code),
            "ofstedSafeguardingEffective": safeguarding,
            "ofstedIssCompliance": iss,
            "ofstedInspectorate": inspectorate,
            "ofstedInspectionDate": inspected,
            "ofstedPublicationDate": published,
            "ofstedReportUrl": report,
            "ofstedPupilsOnRoll": int(nor) if nor is not None else None,
        }

    # Derive as-at date from filename when possible.
    m = re.search(r"as_at_(\d{1,2}_[A-Za-z]+_\d{4})", url)
    as_at = m.group(1).replace("_", " ") if m else time.strftime("%Y-%m-%d")
    print(f"  Ofsted rows: {len(by_urn)} (as at {as_at})", flush=True)
    return by_urn, as_at


def parse_age_bounds(age_range: str | None) -> tuple[int, int] | None:
    if not age_range:
        return None
    nums = [int(n) for n in re.findall(r"\d+", str(age_range))]
    if len(nums) < 2:
        return None
    lo, hi = nums[0], nums[1]
    if lo > hi:
        return None
    return lo, hi


def offers_secondary(age_range: str | None) -> bool:
    """Match src/lib/phases.ts KS3/KS4 coverage from age range."""
    bounds = parse_age_bounds(age_range)
    if not bounds:
        return False
    lo, hi = bounds
    has_ks3 = lo <= 13 and hi >= 12
    has_ks4 = lo <= 15 and hi >= 15
    return has_ks3 or has_ks4



def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--la",
        default="",
        help="Defensively keep only schools in this DfE local authority",
    )
    parser.add_argument(
        "--index",
        default=str(DEFAULT_INDEX.relative_to(ROOT)),
        help="Path to schools-index.json (default: public/data/schools-index.json)",
    )
    args = parser.parse_args()

    paths = resolve_index_bundle(args.index, ROOT)
    index_path = paths["index"]
    directory_path = paths["directory"]
    summary_path = paths["summary"]
    if not index_path.exists():
        raise SystemExit(f"Missing {index_path}; run harvest first")

    target_la = normalize_la_name(args.la) if args.la else ""
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    schools = payload.get("schools") or []
    if target_la:
        schools = filter_schools_to_la(schools, target_la)
        payload["schools"] = schools
    indie_urns = {
        str(s.get("urn"))
        for s in schools
        if s.get("sector") == "independent" and s.get("urn")
    }
    secondary_urns = {
        str(s.get("urn"))
        for s in schools
        if s.get("urn") and offers_secondary(s.get("ageRange"))
    }
    ks4_target_urns = indie_urns | secondary_urns
    print(
        f"Independent schools: {len(indie_urns)}; "
        f"secondary-age (any sector): {len(secondary_urns)}; "
        f"KS4/KS5 harvest targets: {len(ks4_target_urns)}"
        + (f"; scope={target_la}" if target_la else ""),
        flush=True,
    )

    ks4_by_urn, ks4_year, cleared_total = harvest_ks4(ks4_target_urns)
    ks5_by_urn, ks5_year, ks5_cleared_total = harvest_ks5(ks4_target_urns)
    ofsted_by_urn, ofsted_as_at = harvest_ofsted()
    gias_by_urn = harvest_gias_directory(indie_urns)

    ks4_count = 0
    ks5_count = 0
    state_ks4_count = 0
    ofsted_count = 0
    isi_count = 0
    website_count = 0
    fallback_count = 0
    for school in schools:
        urn = str(school.get("urn") or "")
        is_indie = school.get("sector") == "independent"
        wants_ks4 = urn in ks4_target_urns
        if not is_indie and not wants_ks4:
            continue

        # Drop prior KS4/KS5 fields so sanitized nulls replace stale zeros.
        for key in list(KS4_INDICATORS.keys()) + [
            "engMathMeasureUnavailable",
            "engMath94IsPillarFallback",
            "ks4ClearedNilFields",
            "ks4Period",
        ] + KS5_FIELD_KEYS:
            school.pop(key, None)

        if wants_ks4:
            ks4 = ks4_by_urn.get(urn)
            if ks4:
                school.update(ks4)
                ks4_count += 1
                if not is_indie:
                    state_ks4_count += 1
                if ks4.get("engMath94IsPillarFallback"):
                    fallback_count += 1

            ks5 = ks5_by_urn.get(urn)
            if ks5:
                school.update(ks5)
                ks5_count += 1

        if not is_indie:
            continue

        ofsted = ofsted_by_urn.get(urn)
        if ofsted:
            school.update(ofsted)
            ofsted_count += 1
            if ofsted.get("ofstedReportUrl"):
                school["inspectionReportsUrl"] = ofsted["ofstedReportUrl"]

        gias = gias_by_urn.get(urn)
        if gias:
            if gias.get("schoolWebsite"):
                school["schoolWebsite"] = gias["schoolWebsite"]
            if gias.get("inspectorateName"):
                school["inspectorateName"] = gias["inspectorateName"]
            if gias.get("giasUrl"):
                school["giasUrl"] = gias["giasUrl"]
            if gias.get("isiReportsUrl") and not school.get("ofstedReportUrl"):
                school["isiReportsUrl"] = gias["isiReportsUrl"]
                school["inspectionReportsUrl"] = gias.get(
                    "inspectionReportsUrl", gias["isiReportsUrl"]
                )
            for key in (
                "isiProfileUrl",
                "isiLatestReportUrl",
                "isiLatestReportDate",
                "isiLatestReportTitle",
            ):
                if gias.get(key):
                    school[key] = gias[key]

    website_count = sum(
        1
        for s in schools
        if s.get("sector") == "independent" and s.get("schoolWebsite")
    )
    isi_count = sum(
        1
        for s in schools
        if s.get("sector") == "independent"
        and (s.get("inspectorateName") or "").upper() == "ISI"
    )
    indie_ks4_count = sum(
        1
        for s in schools
        if s.get("sector") == "independent" and s.get("att8Average") is not None
    )

    benchmarks = payload.setdefault("benchmarks", {})
    benchmarks["independent"] = ks4_benchmark_block(
        schools, sector="independent", ks4_year=ks4_year, ks5_year=ks5_year
    )
    benchmarks["stateKs4"] = ks4_benchmark_block(
        schools, sector="state", ks4_year=ks4_year, ks5_year=ks5_year
    )

    source = payload.setdefault("source", {})
    datasets = source.setdefault("datasets", {})
    datasets["ks4SchoolPerformance"] = KS4_DATASET
    datasets["ks5SchoolPerformance"] = KS5_DATASET
    datasets["ofstedIndependentMi"] = OFSTED_PAGE
    datasets["giasEdubase"] = EDUBASE_BASE
    note = source.get("note") or ""
    extra = (
        " Secondary-age state and independent schools carry Key Stage 4 and 16–18 "
        "(A-level) outcomes where published (nil/zero English & maths GCSE returns "
        "cleared; EBacc subject pillars used as fallbacks when possible). "
        "Independents also carry Ofsted grades for non-association schools and "
        "GIAS inspectorate/website links for ISI schools (ISI search prefers postcode)."
    )
    cleaned = re.sub(
        r"\s*(?:Independent schools|Secondary-age state)[^.]*\.",
        "",
        note,
    ).strip()
    # Drop older multi-sentence indie enrich notes if present.
    cleaned = re.sub(
        r"\s*Independent schools carry[^.]*\.",
        "",
        cleaned,
    ).strip()
    source["note"] = (cleaned + " " + extra).strip()

    stats = payload.setdefault("stats", {})
    stats["independentWithKs4"] = indie_ks4_count
    stats["stateWithKs4"] = state_ks4_count
    stats["withKs4"] = ks4_count
    stats["independentWithKs5"] = sum(
        1
        for s in schools
        if s.get("sector") == "independent" and s.get("ks5ApsPerEntry") is not None
    )
    stats["stateWithKs5"] = sum(
        1
        for s in schools
        if s.get("sector") == "state" and s.get("ks5ApsPerEntry") is not None
    )
    stats["withKs5"] = ks5_count
    stats["independentWithOfsted"] = ofsted_count
    stats["independentWithIsi"] = isi_count
    stats["independentWithWebsite"] = website_count
    stats["independentKs4NilCleared"] = cleared_total
    stats["independentKs5NilCleared"] = ks5_cleared_total
    stats["independentEngMathPillarFallback"] = fallback_count
    stats["independentEnriched"] = True
    stats["ks4Period"] = ks4_year
    stats["ks5Period"] = ks5_year
    stats["ofstedAsAt"] = ofsted_as_at

    index_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    if directory_path.exists():
        directory = json.loads(directory_path.read_text(encoding="utf-8"))
        by_full = {str(s.get("urn")): s for s in schools}
        for row in directory.get("schools") or []:
            full = by_full.get(str(row.get("urn") or ""))
            if not full:
                continue
            if full.get("att8Average") is not None:
                row["att8Average"] = full["att8Average"]
            elif "att8Average" in row:
                row.pop("att8Average", None)
            if full.get("ks5ApsPerEntry") is not None:
                row["ks5ApsPerEntry"] = full["ks5ApsPerEntry"]
            if full.get("ofstedOverall"):
                row["ofstedOverall"] = full["ofstedOverall"]
            if full.get("inspectorateName"):
                row["inspectorateName"] = full["inspectorateName"]
        directory_path.write_text(
            json.dumps(directory, separators=(",", ":")),
            encoding="utf-8",
        )

    summary = {
        "generatedAt": payload.get("generatedAt"),
        "period": payload.get("period"),
        "schoolCount": stats.get("schoolCount"),
        "withRwm": stats.get("withRwm"),
        "stateCount": stats.get("stateCount"),
        "independentCount": stats.get("independentCount"),
        "independentWithKs4": indie_ks4_count,
        "stateWithKs4": state_ks4_count,
        "withKs4": ks4_count,
        "independentWithKs5": stats.get("independentWithKs5"),
        "stateWithKs5": stats.get("stateWithKs5"),
        "withKs5": ks5_count,
        "independentWithOfsted": ofsted_count,
        "independentWithIsi": isi_count,
        "independentWithWebsite": website_count,
        "independentKs4NilCleared": cleared_total,
        "independentKs5NilCleared": ks5_cleared_total,
        "independentEngMathPillarFallback": fallback_count,
        "ks4Period": ks4_year,
        "ks5Period": ks5_year,
        "ofstedAsAt": ofsted_as_at,
        "independentEnriched": True,
        "maintainedScope": target_la or payload.get("maintainedScope"),
    }
    if summary_path.exists():
        try:
            existing = json.loads(summary_path.read_text(encoding="utf-8"))
            existing.update({k: v for k, v in summary.items() if v is not None})
            summary = existing
        except json.JSONDecodeError:
            pass
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    if paths["is_root"] and SRC_SUMMARY.parent.exists():
        SRC_SUMMARY.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    print(
        f"Done. KS4 on {ks4_count} (state {state_ks4_count}, indie {indie_ks4_count}); "
        f"KS5 on {ks5_count}; Ofsted on {ofsted_count}; "
        f"ISI tagged {isi_count}; websites {website_count}; "
        f"KS4 nil fields cleared {cleared_total}; KS5 nil cleared {ks5_cleared_total}; "
        f"pillar fallbacks {fallback_count}.",
        flush=True,
    )


if __name__ == "__main__":
    main()
