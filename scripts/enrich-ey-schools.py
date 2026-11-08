#!/usr/bin/env python3
"""Attach state-funded school Ofsted outcomes onto schools-index.json.

Used especially for Hampshire early-years school settings (nurseries /
infants / primaries with reception) so they can sit beside Ofsted childcare
day-care in the EY comparison board.

Source: Ofsted monthly MI — state-funded schools latest inspections.

Usage:
  python3 scripts/enrich-ey-schools.py
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

from govuk_mi_dates import as_at_label_from_url, ofsted_csv_sort_key  # noqa: E402
from seed_scope import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    is_local_authority,
    is_seed_local_authority,
    normalize_la_name,
    resolve_index_bundle,
)

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
SRC_SUMMARY = ROOT / "src" / "data" / "harvest-summary.json"

UA = "Mozilla/5.0 (compatible; Schoolside/0.1; +https://github.com/jamiefuller320/Comparison-tool)"
OFSTED_PAGE = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "monthly-management-information-ofsteds-school-inspections-outcomes"
)

OFSTED_GRADE_LABELS = {
    "1": "Outstanding",
    "2": "Good",
    "3": "Requires improvement",
    "4": "Inadequate",
}

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


def grade_label(code: str | None) -> str | None:
    if not code:
        return None
    text = str(code).strip()
    if not text or text.upper() == "NULL":
        return None
    if text.lower() in {"not judged", "n/a", "na"}:
        return None
    if text in OFSTED_GRADE_LABELS:
        return OFSTED_GRADE_LABELS[text]
    if any(ch.isalpha() for ch in text):
        return text
    return text


def parse_ungraded_outcome(text: str | None) -> str | None:
    if not text:
        return None
    lower = text.lower()
    for label in (
        "Outstanding",
        "Good",
        "Requires improvement",
        "Inadequate",
    ):
        if label.lower() in lower:
            return label
    return None


def latest_state_ofsted_csv_url() -> tuple[str, str]:
    html = get_bytes(OFSTED_PAGE).decode("utf-8", "replace")
    matches = re.findall(
        r'https://assets\.publishing\.service\.gov\.uk/media/[a-f0-9]+/'
        r'Management_information_-_state-funded_schools_-_latest_inspections_as_at_[^"]+\.csv',
        html,
    )
    if not matches:
        raise RuntimeError("Could not find state-funded schools Ofsted CSV on GOV.UK")
    unique = list(dict.fromkeys(matches))
    unique.sort(key=ofsted_csv_sort_key)
    chosen = unique[-1]
    as_at = as_at_label_from_url(chosen)
    print(f"  State Ofsted CSV: {chosen}", flush=True)
    return chosen, as_at


def _read_ofsted_cache(path: Path, url: str) -> dict[str, dict] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict) or payload.get("url") != url:
        return None
    rows = payload.get("byUrn")
    if not isinstance(rows, dict) or not rows:
        return None
    return rows


def _write_ofsted_cache(path: Path, url: str, as_at: str, by_urn: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(
        json.dumps(
            {"url": url, "asAt": as_at, "byUrn": by_urn},
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    tmp.replace(path)


def harvest_state_ofsted() -> tuple[dict[str, dict], str, str]:
    print("Fetching state-funded school Ofsted MI…", flush=True)
    url, as_at = latest_state_ofsted_csv_url()
    cache_path = ROOT / ".cache" / "ofsted" / "state-schools.json"
    cached = _read_ofsted_cache(cache_path, url)
    if cached is not None:
        print(
            f"  Ofsted rows from cache: {len(cached)} (as at {as_at})",
            flush=True,
        )
        return cached, url, as_at
    raw = get_bytes(url)
    text = None
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise RuntimeError("Could not decode state Ofsted CSV")

    reader = csv.DictReader(io.StringIO(text))
    by_urn: dict[str, dict] = {}
    for row in reader:
        urn = (row.get("URN") or "").strip()
        if not urn:
            continue

        overall_code = first_value(row, "Latest OEIF overall effectiveness")
        overall = grade_label(overall_code)
        if not overall:
            overall = parse_ungraded_outcome(
                first_value(row, "Ungraded inspection overall outcome")
            )

        quality = grade_label(
            first_value(row, "Latest OEIF quality of education")
        )
        behaviour = grade_label(
            first_value(row, "Latest OEIF behaviour and attitudes")
        )
        personal = grade_label(
            first_value(row, "Latest OEIF personal development")
        )
        leadership = grade_label(
            first_value(
                row, "Latest OEIF effectiveness of leadership and management"
            )
        )
        ey_provision = grade_label(
            first_value(
                row, "Latest OEIF early years provision (where applicable)"
            )
        )
        # Header has a double space before "safeguarding" in some releases.
        safeguarding = first_value(
            row,
            "Latest OEIF  safeguarding is effective?",
            "Latest OEIF safeguarding is effective?",
        )
        inspected = first_value(
            row,
            "Inspection start date of latest OEIF graded inspection",
            "Inspection start date",
        )
        published = first_value(
            row,
            "Publication date of latest OEIF graded inspection",
            "Ungraded inspection publication date",
        )
        report = first_value(row, "Web Link (opens in new window)", "Web Link")
        pupils = first_value(row, "Total number of pupils")

        if not any(
            [
                overall,
                quality,
                behaviour,
                personal,
                leadership,
                ey_provision,
                report,
            ]
        ):
            continue

        payload = {
            "ofstedOverall": overall,
            "ofstedOverallCode": overall_code
            if overall_code and overall_code in OFSTED_GRADE_LABELS
            else None,
            "ofstedQualityOfEducation": quality,
            "ofstedBehaviourAndAttitudes": behaviour,
            "ofstedPersonalDevelopment": personal,
            "ofstedLeadership": leadership,
            "ofstedEarlyYearsProvision": ey_provision,
            "ofstedSafeguardingEffective": safeguarding,
            "ofstedInspectionDate": inspected,
            "ofstedPublicationDate": published,
            "ofstedReportUrl": report,
            "ofstedInspectorate": "Ofsted",
            "ofstedSource": "ofsted-state-schools",
        }
        if pupils and pupils.isdigit():
            payload["ofstedPupilsOnRoll"] = int(pupils)
        by_urn[urn] = {k: v for k, v in payload.items() if v is not None}

    print(f"  Ofsted rows with usable signal: {len(by_urn)}", flush=True)
    _write_ofsted_cache(cache_path, url, as_at, by_urn)
    return by_urn, url, as_at


def offers_early_years(school: dict) -> bool:
    phases = school.get("phases") or []
    if "early-years" in phases:
        return True
    age = school.get("ageRange") or ""
    nums = [int(n) for n in re.findall(r"\d+", age)]
    return len(nums) >= 2 and nums[0] <= 4


def apply_state_ofsted(
    index_arg: str,
    target_la: str,
    ofsted_by_urn: dict[str, dict],
    csv_url: str,
    as_at: str,
) -> int:
    """Write state-school Ofsted rows onto one schools index."""
    paths = resolve_index_bundle(index_arg, ROOT)
    index_path = paths["index"]
    directory_path = paths["directory"]
    summary_path = paths["summary"]
    if not index_path.exists():
        raise SystemExit(f"Missing {index_path} — run harvest first")

    target_la = normalize_la_name(target_la) if target_la else ""
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    schools = payload.get("schools") or []
    if target_la:
        schools = [
            s for s in schools if is_local_authority(s.get("localAuthority"), target_la)
        ]
        payload["schools"] = schools

    matched = 0
    ey_matched = 0
    for school in schools:
        if school.get("sector") == "independent":
            continue
        urn = str(school.get("urn") or "")
        ofsted = ofsted_by_urn.get(urn)
        if not ofsted:
            continue
        school.update(ofsted)
        matched += 1
        in_scope = (
            is_local_authority(school.get("localAuthority"), target_la)
            if target_la
            else is_seed_local_authority(school.get("localAuthority"))
        )
        if in_scope and offers_early_years(school):
            ey_matched += 1

    source = payload.setdefault("source", {})
    datasets = source.setdefault("datasets", {})
    datasets["ofstedStateSchoolsMi"] = OFSTED_PAGE
    datasets["ofstedStateSchoolsMiCsv"] = csv_url

    stats = payload.setdefault("stats", {})
    stats["stateWithOfsted"] = matched
    stats["hampshireEyStateWithOfsted"] = ey_matched
    stats["eyStateWithOfsted"] = ey_matched
    stats["ofstedStateAsAt"] = as_at
    if target_la:
        stats["maintainedScope"] = target_la
        payload["maintainedScope"] = target_la

    index_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(
        f"Wrote {index_path}: stateWithOfsted={matched}, "
        f"eyStateWithOfsted={ey_matched}",
        flush=True,
    )

    if directory_path.exists():
        directory = json.loads(directory_path.read_text(encoding="utf-8"))
        by_full = {str(s.get("urn")): s for s in schools}
        for row in directory.get("schools") or []:
            full = by_full.get(str(row.get("urn") or ""))
            if not full:
                continue
            if full.get("ofstedOverall"):
                row["ofstedOverall"] = full["ofstedOverall"]
        directory_path.write_text(
            json.dumps(directory, separators=(",", ":")), encoding="utf-8"
        )

    summary = {
        "ofstedAsAt": as_at,
        "stateWithOfsted": matched,
        "hampshireEyStateWithOfsted": ey_matched,
        "eyStateWithOfsted": ey_matched,
        "localAuthority": target_la or SEED_LOCAL_AUTHORITY,
        "datasetPage": OFSTED_PAGE,
        "csv": csv_url,
    }
    summary_targets = [summary_path]
    if paths["is_root"]:
        summary_targets.append(SRC_SUMMARY)
    for path in summary_targets:
        existing: dict = {}
        if path.exists():
            try:
                existing = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                existing = {}
        existing["eySchoolsOfsted"] = summary
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    return matched


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--la",
        default="",
        help="Optional LA label for EY Ofsted counter / defensive scope",
    )
    parser.add_argument(
        "--index",
        default=str(DEFAULT_INDEX.relative_to(ROOT)),
        help="Path to schools-index.json",
    )
    args = parser.parse_args()
    ofsted_by_urn, csv_url, as_at = harvest_state_ofsted()
    matched = apply_state_ofsted(
        args.index,
        args.la,
        ofsted_by_urn,
        csv_url,
        as_at,
    )
    print(f"State Ofsted as at {as_at}: matched {matched}", flush=True)


if __name__ == "__main__":
    main()
