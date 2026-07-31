#!/usr/bin/env python3
"""Harvest Hampshire early-years childcare providers + EYFSP LA benchmarks.

MVP seed scope (see scripts/seed_scope.py):
  - Ofsted childcare MI: Active, Early Years Register, Hampshire,
    non-domestic Full/Sessional day care (named settings; childminders deferred)
  - EES EYFSP headline measures: England + Hampshire only
    (DfE does not publish provider/school-level EYFSP)

Usage:
  python3 scripts/harvest-ey-providers.py
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from seed_scope import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    is_local_authority,
    normalize_la_name,
)

DEFAULT_OUT = ROOT / "public" / "data" / "ey-providers-index.json"
DEFAULT_SUMMARY = ROOT / "public" / "data" / "harvest-summary.json"
SRC_SUMMARY = ROOT / "src" / "data" / "harvest-summary.json"

UA = "Mozilla/5.0 (compatible; Schoolside/0.1; +https://github.com/jamiefuller320/Comparison-tool)"
OFSTED_PAGE = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "childcare-providers-and-inspections-management-information"
)
OFSTED_REPORT_BASE = "https://reports.ofsted.gov.uk/provider/16/"

BASE = "https://api.education.gov.uk/statistics/v1"
EYFSP_DATASET = "019ac0fb-e082-7202-871f-439d6d036893"
EYFSP_YEAR = "2024/2025"

# Filter totals from EYFSP dataset meta (2024/25).
EYFSP_FILTERS = [
    "fdpUY",  # breakdown_topic Total
    "O16CL",  # breakdown Total
    "CijId",  # sex Total
]
EYFSP_INDICATORS = {
    "gldPercent": "b2TtT",
    "gldCount": "SA8Vx",
    "allElgsExpectedPercent": "ypjaB",
    "commLangLitExpectedPercent": "RJEka",
    "elgsExpectedAverage": "ofKmX",
    "childrenCount": "rhzNj",
}

OFSTED_GRADE_LABELS = {
    "1": "Outstanding",
    "2": "Good",
    "3": "Requires improvement",
    "4": "Inadequate",
}

ALLOWED_SUBTYPES = {"Full day care", "Sessional day care"}

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


def get_bytes(url: str, retries: int = 4) -> bytes:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept": "*/*"},
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    raise RuntimeError(f"Failed GET {url}: {last}")


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


def parse_metric(value: str | None) -> float | None:
    if value is None:
        return None
    s = str(value).strip()
    if s == "" or s.lower() in {"z", "x", ":", "c", "u", "supp", "na", "n/a", "null"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def first_value(row: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        raw = row.get(key)
        if raw is None:
            continue
        text = str(raw).strip()
        if text and text.upper() != "NULL":
            return text
    return None


def grade_label(code: str | None) -> str | None:
    if not code:
        return None
    text = str(code).strip()
    if not text or text.upper() == "NULL":
        return None
    if text in OFSTED_GRADE_LABELS:
        return OFSTED_GRADE_LABELS[text]
    if any(ch.isalpha() for ch in text):
        return text
    return text


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


def latest_childcare_csv_url() -> tuple[str, str]:
    html = get_bytes(OFSTED_PAGE).decode("utf-8", "replace")
    matches = re.findall(
        r'https://assets\.publishing\.service\.gov\.uk/media/[a-f0-9]+/'
        r'Management_information_-_childcare_providers_and_inspections_-_most_recent_inspections_data(?:_-)?as_at_[^"]+\.csv',
        html,
    )
    if not matches:
        # Allow slight filename drift between releases.
        matches = re.findall(
            r'https://assets\.publishing\.service\.gov\.uk/media/[a-f0-9]+/'
            r'Management_information_-_childcare_providers_and_inspections[^"]*most_recent[^"]*\.csv',
            html,
        )
    if not matches:
        raise RuntimeError("Could not find Ofsted childcare most-recent CSV on GOV.UK")
    unique = list(dict.fromkeys(matches))
    unique.sort(key=ofsted_csv_sort_key)
    chosen = unique[-1]
    as_at_m = re.search(r"as_at_(\d{1,2})_([A-Za-z]+)_(\d{4})", chosen, re.I)
    as_at = (
        f"{as_at_m.group(1)} {as_at_m.group(2)} {as_at_m.group(3)}"
        if as_at_m
        else "unknown"
    )
    print(f"  Ofsted childcare CSV: {chosen}", flush=True)
    return chosen, as_at


def read_childcare_csv(raw: bytes) -> list[dict[str, str]]:
    text = None
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise RuntimeError("Could not decode childcare CSV")

    # Ofsted childcare MI often has two title rows before the header.
    lines = text.splitlines()
    header_idx = 0
    for i, line in enumerate(lines[:8]):
        if "Provider URN" in line and "Local Authority" in line:
            header_idx = i
            break
    clipped = "\n".join(lines[header_idx:])
    return list(csv.DictReader(io.StringIO(clipped)))


def harvest_providers(target_la: str) -> tuple[list[dict], str, str]:
    print(f"Fetching Ofsted childcare MI ({target_la})…", flush=True)
    url, as_at = latest_childcare_csv_url()
    rows = read_childcare_csv(get_bytes(url))
    print(f"  CSV rows: {len(rows)}", flush=True)

    providers: list[dict] = []
    for row in rows:
        la = first_value(row, "Local Authority")
        if not is_local_authority(la, target_la):
            continue
        status = (first_value(row, "Provider Status") or "").lower()
        if status != "active":
            continue
        eyr = (first_value(row, "Provider Early Years Register Flag") or "").upper()
        if eyr != "Y":
            continue
        ptype = first_value(row, "Provider Type") or ""
        if ptype != "Childcare on non-domestic premises":
            continue
        subtype = first_value(row, "Provider Subtype") or ""
        if subtype not in ALLOWED_SUBTYPES:
            continue
        name = first_value(row, "Provider Name")
        if not name or name.upper() == "REDACTED":
            continue
        ofsted_urn = first_value(row, "Provider URN")
        if not ofsted_urn:
            continue

        overall_code = first_value(
            row,
            "Most Recent Full: Overall Effectiveness",
            "Overall effectiveness",
        )
        quality_code = first_value(
            row,
            "Most Recent Full: Quality of Education",
            "Quality of education",
        )
        leadership_code = first_value(
            row,
            "Most Recent Full: Effectiveness of Leadership and Management",
            "Effectiveness of leadership and management",
        )
        behaviour_code = first_value(
            row,
            "Most Recent Full: Behaviour and Attitudes",
            "Behaviour and Attitudes",
        )
        personal_code = first_value(
            row,
            "Most Recent Full: Personal Development",
            "Personal Development",
        )
        inspected = first_value(
            row,
            "Most Recent Full: Inspection Date",
            "Inspection date",
        )
        safeguarding = first_value(
            row,
            "Most Recent Full: Safeguarding is Effective?",
            "Safeguarding is effective?",
        )
        places = parse_metric(first_value(row, "Places"))
        places_est = parse_metric(first_value(row, "Places including Estimates"))

        addr_bits = [
            first_value(row, "Provider Address Line 1"),
            first_value(row, "Provider Address Line 2"),
            first_value(row, "Provider Address Line 3"),
        ]
        address = ", ".join(b for b in addr_bits if b)

        providers.append(
            {
                "urn": f"ey:{ofsted_urn}",
                "ofstedUrn": ofsted_urn,
                "name": name,
                "localAuthority": la,
                "town": first_value(row, "Provider Town"),
                "postcode": first_value(row, "Provider Postcode"),
                "address": address or None,
                "constituency": first_value(row, "Parliamentary Constituency"),
                "providerType": ptype,
                "providerSubtype": subtype,
                "schoolTypeLabel": subtype,
                "registerCombination": first_value(
                    row, "Individual Register Combinations"
                ),
                "ageRange": "0 to 5",
                "phase": "early-years",
                "phases": ["early-years"],
                "sector": "independent",
                "places": int(places) if places is not None else None,
                "placesIncludingEstimates": (
                    int(places_est) if places_est is not None else None
                ),
                "ofstedOverall": grade_label(overall_code),
                "ofstedOverallCode": overall_code,
                "ofstedQualityOfEducation": grade_label(quality_code),
                "ofstedBehaviourAndAttitudes": grade_label(behaviour_code),
                "ofstedPersonalDevelopment": grade_label(personal_code),
                "ofstedLeadership": grade_label(leadership_code),
                "ofstedSafeguardingEffective": safeguarding,
                "ofstedInspectionDate": inspected,
                "ofstedReportUrl": f"{OFSTED_REPORT_BASE}{ofsted_urn}",
                "ofstedInspectorate": "Ofsted",
                "source": "ofsted-childcare",
                "compareUrl": f"{OFSTED_REPORT_BASE}{ofsted_urn}",
            }
        )

    providers.sort(key=lambda p: (p.get("town") or "", p.get("name") or ""))
    print(f"  {target_la} named day-care providers: {len(providers)}", flush=True)
    return providers, url, as_at


def bulk_geocode(providers: list[dict]) -> int:
    """Geocode unique postcodes via postcodes.io bulk API."""
    print("Geocoding provider postcodes…", flush=True)
    unique: list[str] = []
    seen: set[str] = set()
    for p in providers:
        pc = (p.get("postcode") or "").strip().upper()
        if not pc or pc in seen:
            continue
        seen.add(pc)
        unique.append(pc)

    coords: dict[str, tuple[float, float]] = {}
    for i in range(0, len(unique), 100):
        batch = unique[i : i + 100]
        body = json.dumps({"postcodes": batch}).encode("utf-8")
        req = urllib.request.Request(
            "https://api.postcodes.io/postcodes",
            data=body,
            headers={
                "Content-Type": "application/json",
                "User-Agent": UA,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.load(resp)
        except Exception as exc:  # noqa: BLE001
            print(f"  geocode batch failed: {exc}", flush=True)
            continue
        for item in payload.get("result") or []:
            query = (item.get("query") or "").strip().upper()
            result = item.get("result")
            if not query or not result:
                continue
            lat = result.get("latitude")
            lng = result.get("longitude")
            if lat is None or lng is None:
                continue
            coords[query] = (float(lat), float(lng))
        time.sleep(0.15)

    n = 0
    for p in providers:
        pc = (p.get("postcode") or "").strip().upper()
        pair = coords.get(pc)
        if not pair:
            continue
        p["latitude"], p["longitude"] = pair
        n += 1
    print(f"  with coordinates: {n}/{len(providers)}", flush=True)
    return n


def harvest_eyfsp(target_la: str) -> dict:
    print(f"Fetching EYFSP England / {target_la} benchmarks…", flush=True)
    meta = get_json(f"{BASE}/data-sets/{EYFSP_DATASET}/meta")
    la_map: dict[str, str] = {}
    for block in meta.get("locations") or []:
        if (block.get("level") or {}).get("code") != "LA":
            continue
        for opt in block.get("options") or []:
            if opt.get("id") and opt.get("label"):
                la_map[opt["id"]] = opt["label"]

    ind = ",".join(EYFSP_INDICATORS.values())
    filter_qs = "&".join(f"filters.eq={fid}" for fid in EYFSP_FILTERS)

    def pull(level: str) -> list[dict]:
        rows: list[dict] = []
        page = 1
        total_pages = 1
        while page <= total_pages:
            qs = (
                f"{filter_qs}"
                f"&geographicLevels.eq={level}"
                f"&timePeriods.eq={urllib.parse.quote(f'{EYFSP_YEAR}|AY', safe='|/')}"
                f"&indicators={ind}"
                f"&page={page}&pageSize=5000"
            )
            data = get_json(f"{BASE}/data-sets/{EYFSP_DATASET}/query?{qs}")
            batch = data.get("results") or []
            rows.extend(batch)
            total_pages = int((data.get("paging") or {}).get("totalPages") or 1)
            print(
                f"  {level} page {page}/{total_pages} (+{len(batch)})",
                flush=True,
            )
            page += 1
        return rows

    # EES ORs repeated filters.eq — keep only the all-Total cross-tab client-side.
    TOTAL_FILTERS = {
        "NAEDC": "O16CL",  # breakdown Total
        "L6tWj": "fdpUY",  # breakdown_topic Total
        "wOGbx": "CijId",  # sex Total
    }

    def extract(rows: list[dict], level: str) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for row in rows:
            if row.get("geographicLevel") != level:
                continue
            if (row.get("filters") or {}) != TOTAL_FILTERS:
                continue
            values = row.get("values") or {}
            locs = row.get("locations") or {}
            metrics = {
                key: parse_metric(values.get(ind_id))
                for key, ind_id in EYFSP_INDICATORS.items()
            }
            metrics = {k: v for k, v in metrics.items() if v is not None}
            if not metrics:
                continue
            if level == "NAT":
                out["england"] = metrics
            else:
                lid = locs.get("LA")
                name = la_map.get(lid or "", lid or "")
                if name:
                    out[name] = metrics
        return out

    # Sex-only filter still returns the Total cross-tab among other breakdowns.
    nat = extract(pull("NAT"), "NAT")
    las = extract(pull("LA"), "LA")
    england = nat.get("england") or {}
    # Prefer exact then case-insensitive match against EES labels.
    area = las.get(target_la)
    if not area:
        for name, metrics in las.items():
            if is_local_authority(name, target_la):
                area = metrics
                target_label = name
                break
        else:
            target_label = target_la
            area = None
    else:
        target_label = target_la
    if england.get("gldPercent") is None:
        raise SystemExit("EYFSP harvest failed — no England GLD %")
    if not area or area.get("gldPercent") is None:
        raise SystemExit(f"EYFSP harvest failed — no {target_la} GLD %")

    print(
        f"  England GLD={england.get('gldPercent')}%; "
        f"{target_label} GLD={area.get('gldPercent')}%",
        flush=True,
    )
    return {
        "period": EYFSP_YEAR,
        "note": (
            "DfE publishes Early Years Foundation Stage Profile results for "
            "England and local authorities only — not for individual providers "
            "or schools. Use as area context while shortlisting."
        ),
        "sourceUrl": (
            "https://explore-education-statistics.service.gov.uk/find-statistics/"
            "early-years-foundation-stage-profile-results/2024-25"
        ),
        "england": england,
        "localAuthorities": {target_label: area},
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--la",
        default=SEED_LOCAL_AUTHORITY,
        help=f"DfE local authority (default: {SEED_LOCAL_AUTHORITY})",
    )
    parser.add_argument(
        "--out-dir",
        default="public/data",
        help="Output directory for ey-providers-index.json",
    )
    args = parser.parse_args()

    target_la = normalize_la_name(args.la) or SEED_LOCAL_AUTHORITY
    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    out_path = out_dir / "ey-providers-index.json"
    summary_path = out_dir / "harvest-summary.json"
    is_root = out_path.resolve() == DEFAULT_OUT.resolve()
    if is_root and not is_local_authority(target_la, SEED_LOCAL_AUTHORITY):
        raise SystemExit(
            f"Refusing to write non-{SEED_LOCAL_AUTHORITY} EY providers into "
            "the maintained root — pass --out-dir public/data/packs/<slug>."
        )

    providers, csv_url, as_at = harvest_providers(target_la)
    with_coords = bulk_geocode(providers)
    eyfsp = harvest_eyfsp(target_la)
    eyfsp_la_name = next(iter(eyfsp["localAuthorities"]))

    with_grade = sum(1 for p in providers if p.get("ofstedOverall"))
    payload = {
        "generatedAt": time.strftime("%Y-%m-%d"),
        "localAuthority": eyfsp_la_name,
        "ofstedAsAt": as_at,
        "source": {
            "ofstedChildcareMiPage": OFSTED_PAGE,
            "ofstedChildcareMiCsv": csv_url,
            "eyfspApi": BASE,
            "eyfspDataset": EYFSP_DATASET,
            "eyfspPeriod": EYFSP_YEAR,
            "eyfspPublication": eyfsp["sourceUrl"],
            "note": (
                f"{eyfsp_la_name} scope: named non-domestic Full/Sessional day care "
                "on the Early Years Register, plus EYFSP England/LA benchmarks. "
                "Consented childminders are harvested separately."
            ),
        },
        "benchmarks": {"eyfsp": eyfsp},
        "providers": providers,
        "stats": {
            "providerCount": len(providers),
            "withInspectionGrade": with_grade,
            "withCoordinates": with_coords,
            "ofstedAsAt": as_at,
            "eyfspPeriod": EYFSP_YEAR,
            "localAuthority": eyfsp_la_name,
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        from inspection_precis_lib import merge_precis_fields_from_previous

        restored = merge_precis_fields_from_previous(
            providers, out_path, list_key="providers"
        )
        if restored:
            payload["stats"]["withInspectionPrecis"] = sum(
                1 for p in providers if p.get("inspectionPrecis")
            )
            print(f"Restored inspection precis on {restored} EY providers", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"Precis merge skipped: {exc}", flush=True)
    out_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {out_path} ({len(providers)} providers)", flush=True)

    summary_bits = {
        "localAuthority": eyfsp_la_name,
        "providerCount": len(providers),
        "withInspectionGrade": with_grade,
        "withCoordinates": with_coords,
        "ofstedAsAt": as_at,
        "englandGldPercent": eyfsp["england"].get("gldPercent"),
        "laGldPercent": eyfsp["localAuthorities"][eyfsp_la_name].get("gldPercent"),
        "eyfspPeriod": EYFSP_YEAR,
    }
    summary_targets = [summary_path]
    if is_root:
        summary_targets.append(SRC_SUMMARY)
    for path in summary_targets:
        existing: dict = {}
        if path.exists():
            try:
                existing = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                existing = {}
        existing["eyProviders"] = summary_bits
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
