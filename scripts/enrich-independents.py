#!/usr/bin/env python3
"""Enrich independent schools with KS4 outcomes and Ofsted inspection MI.

State schools already carry KS2 table metrics. Independents rarely do, so this
script adds:
  - DfE EES Key Stage 4 institution-level outcomes (Attainment 8, basics, EBacc)
  - Ofsted non-association independent schools most-recent inspection grades

Usage:
  python3 scripts/enrich-independents.py
"""

from __future__ import annotations

import csv
import io
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "public" / "data" / "schools-index.json"
DIRECTORY = ROOT / "public" / "data" / "schools-directory.json"
SUMMARY = ROOT / "public" / "data" / "harvest-summary.json"
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

KS4_INDICATORS = {
    "att8Average": "kgVhs",
    "engMath94Percent": "hCRyW",
    "engMath95Percent": "dDo0Z",
    "anyPassPercent": "cHR31",
    "ebaccEnteringPercent": "bmztT",
    "ebacc94Percent": "mqo9K",
    "ebaccAps": "flgYF",
    "ks4Pupils": "IL3Bz",
}

OFSTED_PAGE = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "non-association-independent-schools-inspections-and-outcomes-management-information"
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
    if not text or text.lower() in {"z", "c", "x", "null", "na", "n/a", "."}:
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


def harvest_ks4(indie_urns: set[str]) -> tuple[dict[str, dict], str]:
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
            metrics["ks4Period"] = KS4_YEAR
            by_urn[urn] = metrics
        page += 1

    print(f"  KS4 matched independents: {len(by_urn)}", flush=True)
    return by_urn, KS4_YEAR


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


def mean(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def main() -> None:
    if not INDEX.exists():
        raise SystemExit(f"Missing {INDEX}; run harvest first")

    payload = json.loads(INDEX.read_text(encoding="utf-8"))
    schools = payload.get("schools") or []
    indie_urns = {
        str(s.get("urn"))
        for s in schools
        if s.get("sector") == "independent" and s.get("urn")
    }
    print(f"Independent schools in index: {len(indie_urns)}", flush=True)

    ks4_by_urn, ks4_year = harvest_ks4(indie_urns)
    ofsted_by_urn, ofsted_as_at = harvest_ofsted()

    ks4_count = 0
    ofsted_count = 0
    for school in schools:
        urn = str(school.get("urn") or "")
        if school.get("sector") != "independent":
            continue
        ks4 = ks4_by_urn.get(urn)
        if ks4:
            school.update(ks4)
            ks4_count += 1
        ofsted = ofsted_by_urn.get(urn)
        if ofsted:
            school.update(ofsted)
            ofsted_count += 1

    # Benchmarks from matched independents (parental indie reference, not state England).
    att8_vals = [
        float(s["att8Average"])
        for s in schools
        if s.get("sector") == "independent" and s.get("att8Average") is not None
    ]
    eng94_vals = [
        float(s["engMath94Percent"])
        for s in schools
        if s.get("sector") == "independent" and s.get("engMath94Percent") is not None
    ]
    eng95_vals = [
        float(s["engMath95Percent"])
        for s in schools
        if s.get("sector") == "independent" and s.get("engMath95Percent") is not None
    ]
    ebacc_enter_vals = [
        float(s["ebaccEnteringPercent"])
        for s in schools
        if s.get("sector") == "independent" and s.get("ebaccEnteringPercent") is not None
    ]
    any_pass_vals = [
        float(s["anyPassPercent"])
        for s in schools
        if s.get("sector") == "independent" and s.get("anyPassPercent") is not None
    ]

    benchmarks = payload.setdefault("benchmarks", {})
    benchmarks["independent"] = {
        "att8Average": mean(att8_vals),
        "engMath94Percent": mean(eng94_vals),
        "engMath95Percent": mean(eng95_vals),
        "ebaccEnteringPercent": mean(ebacc_enter_vals),
        "anyPassPercent": mean(any_pass_vals),
        "period": ks4_year,
        "schoolCount": len(att8_vals),
        "note": "Mean of independents in this index with published KS4 figures",
    }

    source = payload.setdefault("source", {})
    datasets = source.setdefault("datasets", {})
    datasets["ks4SchoolPerformance"] = KS4_DATASET
    datasets["ofstedIndependentMi"] = OFSTED_PAGE
    note = source.get("note") or ""
    extra = (
        " Independent schools also carry Key Stage 4 outcomes (where published) "
        "and Ofsted non-association inspection grades."
    )
    if "Independent schools also carry" not in note:
        source["note"] = (note + extra).strip()

    stats = payload.setdefault("stats", {})
    stats["independentWithKs4"] = ks4_count
    stats["independentWithOfsted"] = ofsted_count
    stats["independentEnriched"] = True
    stats["ks4Period"] = ks4_year
    stats["ofstedAsAt"] = ofsted_as_at

    INDEX.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    # Lean directory: add a couple of indie discovery fields when present.
    if DIRECTORY.exists():
        directory = json.loads(DIRECTORY.read_text(encoding="utf-8"))
        by_full = {str(s.get("urn")): s for s in schools}
        for row in directory.get("schools") or []:
            full = by_full.get(str(row.get("urn") or ""))
            if not full:
                continue
            if full.get("att8Average") is not None:
                row["att8Average"] = full["att8Average"]
            if full.get("ofstedOverall"):
                row["ofstedOverall"] = full["ofstedOverall"]
        DIRECTORY.write_text(
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
        "independentWithKs4": ks4_count,
        "independentWithOfsted": ofsted_count,
        "ks4Period": ks4_year,
        "ofstedAsAt": ofsted_as_at,
        "independentEnriched": True,
    }
    if SUMMARY.exists():
        try:
            existing = json.loads(SUMMARY.read_text(encoding="utf-8"))
            existing.update({k: v for k, v in summary.items() if v is not None})
            summary = existing
        except json.JSONDecodeError:
            pass
    SUMMARY.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    if SRC_SUMMARY.parent.exists():
        SRC_SUMMARY.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    print(
        f"Done. KS4 on {ks4_count} independents; Ofsted on {ofsted_count}.",
        flush=True,
    )


if __name__ == "__main__":
    main()
