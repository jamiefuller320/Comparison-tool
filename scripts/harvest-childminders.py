#!/usr/bin/env python3
"""Harvest Hampshire consented childminders for directory + map.

Ofsted redacts childminder names/addresses in the main childcare MI.
A separate quarterly file publishes names and addresses only where the
provider has consented. This script always fetches the latest consented
CSV from GOV.UK (no pinned URL), joins optional inspection grades from
the childcare MI by URN, and geocodes postcodes for the nearby map.

Phone/email are not published in the consented file — contact is address
plus the Ofsted report page link.

Usage:
  python3 scripts/harvest-childminders.py
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from seed_scope import SEED_LOCAL_AUTHORITY  # noqa: E402

OUT = ROOT / "public" / "data" / "childminders-index.json"
SUMMARY = ROOT / "public" / "data" / "harvest-summary.json"
SRC_SUMMARY = ROOT / "src" / "data" / "harvest-summary.json"

UA = "Mozilla/5.0 (compatible; Schoolside/0.1; +https://github.com/jamiefuller320/Comparison-tool)"
CONSENTED_PAGE = (
    "https://www.gov.uk/government/publications/"
    "consented-addresses-for-childminders-and-domestic-childcare"
)
CHILDCARE_MI_PAGE = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "childcare-providers-and-inspections-management-information"
)
OFSTED_REPORT_BASE = "https://reports.ofsted.gov.uk/provider/16/"

OFSTED_GRADE_LABELS = {
    "1": "Outstanding",
    "2": "Good",
    "3": "Requires improvement",
    "4": "Inadequate",
}

ALLOWED_TYPES = {"Childminder", "Childcare on domestic premises"}

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


def first_value(row: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        raw = row.get(key)
        if raw is None:
            continue
        text = str(raw).strip()
        if text and text.upper() != "NULL":
            return text
    return None


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
    return (
        int(m.group(3)),
        _MONTHS.get(m.group(2).lower(), 0),
        int(m.group(1)),
    )


def as_at_label(url: str) -> str:
    m = re.search(r"as_at_(\d{1,2})_([A-Za-z]+)_(\d{4})", url, re.I)
    if not m:
        return "unknown"
    return f"{m.group(1)} {m.group(2)} {m.group(3)}"


def latest_consented_csv_url() -> tuple[str, str]:
    """Always resolve the newest consented-addresses CSV from the GOV.UK page."""
    html = get_bytes(CONSENTED_PAGE).decode("utf-8", "replace")
    matches = re.findall(
        r'https://assets\.publishing\.service\.gov\.uk/media/[a-f0-9]+/'
        r'Consented_addresses_for_childminders_and_domestic_childcare_as_at_[^"]+\.csv',
        html,
    )
    if not matches:
        raise RuntimeError("Could not find consented childminder CSV on GOV.UK")
    unique = list(dict.fromkeys(matches))
    unique.sort(key=ofsted_csv_sort_key)
    chosen = unique[-1]
    as_at = as_at_label(chosen)
    print(f"  Consented addresses CSV: {chosen}", flush=True)
    print(f"  Consented as at: {as_at}", flush=True)
    return chosen, as_at


def latest_childcare_mi_csv_url() -> tuple[str, str]:
    html = get_bytes(CHILDCARE_MI_PAGE).decode("utf-8", "replace")
    matches = re.findall(
        r'https://assets\.publishing\.service\.gov\.uk/media/[a-f0-9]+/'
        r'Management_information_-_childcare_providers_and_inspections_-_most_recent_inspections_data(?:_-)?as_at_[^"]+\.csv',
        html,
    )
    if not matches:
        matches = re.findall(
            r'https://assets\.publishing\.service\.gov\.uk/media/[a-f0-9]+/'
            r'Management_information_-_childcare_providers_and_inspections[^"]*most_recent[^"]*\.csv',
            html,
        )
    if not matches:
        raise RuntimeError("Could not find Ofsted childcare most-recent CSV")
    unique = list(dict.fromkeys(matches))
    unique.sort(key=ofsted_csv_sort_key)
    chosen = unique[-1]
    return chosen, as_at_label(chosen)


def read_csv_with_header(raw: bytes, must_contain: tuple[str, ...]) -> list[dict[str, str]]:
    text = None
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise RuntimeError("Could not decode CSV")
    lines = text.splitlines()
    header_idx = 0
    for i, line in enumerate(lines[:12]):
        if all(token in line for token in must_contain):
            header_idx = i
            break
    clipped = "\n".join(lines[header_idx:])
    return list(csv.DictReader(io.StringIO(clipped)))


def load_mi_by_urn() -> tuple[dict[str, dict[str, str]], str, str]:
    print("Fetching childcare MI for inspection join…", flush=True)
    url, as_at = latest_childcare_mi_csv_url()
    print(f"  Childcare MI CSV: {url}", flush=True)
    rows = read_csv_with_header(
        get_bytes(url), ("Provider URN", "Local Authority")
    )
    by_urn: dict[str, dict[str, str]] = {}
    for row in rows:
        urn = first_value(row, "Provider URN")
        if urn:
            by_urn[urn] = row
    print(f"  MI rows indexed: {len(by_urn)}", flush=True)
    return by_urn, url, as_at


def harvest_childminders() -> tuple[list[dict], dict]:
    print("Fetching latest consented childminder addresses…", flush=True)
    consented_url, consented_as_at = latest_consented_csv_url()
    consented_rows = read_csv_with_header(
        get_bytes(consented_url), ("Provider URN", "Local Authority")
    )
    print(f"  Consented CSV rows: {len(consented_rows)}", flush=True)

    mi_by_urn, mi_url, mi_as_at = load_mi_by_urn()

    providers: list[dict] = []
    skipped_inactive = 0
    for row in consented_rows:
        la = first_value(row, "Local Authority")
        if la != SEED_LOCAL_AUTHORITY:
            continue
        ptype = first_value(row, "Provider Type") or ""
        if ptype not in ALLOWED_TYPES:
            continue
        ofsted_urn = first_value(row, "Provider URN")
        name = first_value(row, "Provider name", "Provider Name")
        if not ofsted_urn or not name:
            continue

        mi = mi_by_urn.get(ofsted_urn) or {}
        status = (first_value(mi, "Provider Status") or "").lower()
        if status and status != "active":
            skipped_inactive += 1
            continue

        addr_bits = [
            first_value(
                row,
                "Provider address line 1",
                "Provider Address Line 1",
            ),
            first_value(
                row,
                "Provider address line 2",
                "Provider Address Line 2",
            ),
            first_value(
                row,
                "Provider address line 3",
                "Provider Address Line 3",
            ),
        ]
        address = ", ".join(b for b in addr_bits if b)

        overall_code = first_value(
            mi,
            "Most Recent Full: Overall Effectiveness",
            "Overall effectiveness",
        )
        inspected = first_value(
            mi,
            "Most Recent Full: Inspection Date",
            "Inspection date",
        )
        safeguarding = first_value(
            mi,
            "Most Recent Full: Safeguarding is Effective?",
            "Safeguarding is effective?",
        )
        places = parse_metric(first_value(mi, "Places"))
        places_est = parse_metric(first_value(mi, "Places including Estimates"))

        providers.append(
            {
                "urn": f"cm:{ofsted_urn}",
                "ofstedUrn": ofsted_urn,
                "name": name,
                "localAuthority": la,
                "town": first_value(row, "Provider town", "Provider Town"),
                "postcode": first_value(row, "Postcode", "Provider Postcode"),
                "address": address or None,
                "constituency": first_value(
                    row, "Parliamentary Constituency"
                ),
                "providerType": ptype,
                "providerSubtype": ptype,
                "schoolTypeLabel": ptype,
                "registerCombination": first_value(
                    row,
                    "Individual Register combinations",
                    "Individual Register Combinations",
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
                "ofstedSafeguardingEffective": safeguarding,
                "ofstedInspectionDate": inspected,
                "ofstedReportUrl": f"{OFSTED_REPORT_BASE}{ofsted_urn}",
                "ofstedInspectorate": "Ofsted",
                "ofstedSource": "ofsted-consented-childminder",
                "source": "ofsted-consented-childminder",
                "compareUrl": f"{OFSTED_REPORT_BASE}{ofsted_urn}",
                "consentedAddress": True,
            }
        )

    providers.sort(key=lambda p: (p.get("town") or "", p.get("name") or ""))
    print(
        f"  Hampshire consented childminders/domestic: {len(providers)} "
        f"(skipped inactive from MI: {skipped_inactive})",
        flush=True,
    )
    meta = {
        "consentedUrl": consented_url,
        "consentedAsAt": consented_as_at,
        "miUrl": mi_url,
        "miAsAt": mi_as_at,
    }
    return providers, meta


def bulk_geocode(providers: list[dict]) -> int:
    print("Geocoding childminder postcodes…", flush=True)
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


def main() -> None:
    providers, meta = harvest_childminders()
    with_coords = bulk_geocode(providers)
    with_grade = sum(1 for p in providers if p.get("ofstedOverall"))

    payload = {
        "generatedAt": time.strftime("%Y-%m-%d"),
        "localAuthority": SEED_LOCAL_AUTHORITY,
        "consentedAsAt": meta["consentedAsAt"],
        "ofstedAsAt": meta["miAsAt"],
        "source": {
            "consentedAddressesPage": CONSENTED_PAGE,
            "consentedAddressesCsv": meta["consentedUrl"],
            "ofstedChildcareMiPage": CHILDCARE_MI_PAGE,
            "ofstedChildcareMiCsv": meta["miUrl"],
            "refreshNote": (
                "Ofsted overwrites the consented-addresses file each quarter. "
                "Schoolside always resolves the latest CSV URL on harvest — "
                "re-run npm run harvest:childminders (or harvest:ey) regularly "
                "so the directory stays synced."
            ),
            "note": (
                f"{SEED_LOCAL_AUTHORITY} seed: childminders and domestic childcare "
                "who consented to publish name and address. Incomplete by design — "
                "providers may withdraw consent. No phone/email in Ofsted’s file; "
                "use the Ofsted report link. Not shown on the Ofsted day-care "
                "compare board — use the parent vetting checklist."
            ),
        },
        "providers": providers,
        "stats": {
            "providerCount": len(providers),
            "withInspectionGrade": with_grade,
            "withCoordinates": with_coords,
            "consentedAsAt": meta["consentedAsAt"],
            "ofstedAsAt": meta["miAsAt"],
            "localAuthority": SEED_LOCAL_AUTHORITY,
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({len(providers)} providers)", flush=True)

    summary_bits = {
        "localAuthority": SEED_LOCAL_AUTHORITY,
        "providerCount": len(providers),
        "withInspectionGrade": with_grade,
        "withCoordinates": with_coords,
        "consentedAsAt": meta["consentedAsAt"],
        "ofstedAsAt": meta["miAsAt"],
        "consentedCsv": meta["consentedUrl"],
    }
    for path in (SUMMARY, SRC_SUMMARY):
        existing: dict = {}
        if path.exists():
            try:
                existing = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                existing = {}
        existing["childminders"] = summary_bits
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
