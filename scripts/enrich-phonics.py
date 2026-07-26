#!/usr/bin/env python3
"""Attach England / LA phonics screening benchmarks to the school index.

DfE does not publish school-level phonics results. This script harvests the
public national and local-authority figures from Explore Education Statistics
so the KS1 stage can show area context beside shortlisted schools.

Publication: Phonics screening check attainment 2024/25
Dataset: phonics attainment by region and local authority

Usage:
  python3 scripts/enrich-phonics.py
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "public" / "data" / "schools-index.json"
SUMMARY = ROOT / "public" / "data" / "harvest-summary.json"
SRC_SUMMARY = ROOT / "src" / "data" / "harvest-summary.json"

BASE = "https://api.education.gov.uk/statistics/v1"
UA = "Mozilla/5.0 (compatible; Schoolside/0.1; +https://github.com/jamiefuller320/Comparison-tool)"

# Phonics screening check attainment — by region and LA (NAT / REG / LA)
PHONICS_DATASET = "b3bd9901-cc50-f670-a18a-9bdb566d37d2"
PHONICS_YEAR = "2024/2025"

# Filter field IDs → Total option IDs (from dataset meta).
FILTER_TOTALS = {
    "wAqbx": "rH6Nj",  # disadvantage_status Total
    "okRmX": "yb2aB",  # first_language Total
    "9yy4v": "DJjQe",  # fsm_status Total
    "dom0Z": "IoRBz",  # ethnicity_minor Total
    "OfHCL": "YRZHK",  # sex Total
    "7FnXo": "cG031",  # sen_provision Total
}
FILTER_DISADVANTAGED = "UrmRF"  # disadvantage_status = Disadvantaged
YEAR_GROUP_Y1 = "fUQYF"
YEAR_GROUP_END_Y2 = "tScEm"
YEAR_GROUP_FIELD = "pToSo"
DISADVANTAGE_FIELD = "wAqbx"

INDICATOR_EXPECTED_PCT = "ijI6X"
INDICATOR_ELIGIBLE = "wIObx"


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
    if s == "" or s.lower() in {"z", "x", ":", "c", "u", "supp", "na", "n/a"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def build_la_map(meta: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for block in meta.get("locations") or []:
        level = (block.get("level") or {}).get("code")
        if level != "LA":
            continue
        for opt in block.get("options") or []:
            lid = opt.get("id")
            label = opt.get("label")
            if lid and label:
                out[lid] = label
    return out


def filter_match(filters: dict, year_group: str, disadvantaged: bool) -> bool:
    want = dict(FILTER_TOTALS)
    want[YEAR_GROUP_FIELD] = year_group
    if disadvantaged:
        want[DISADVANTAGE_FIELD] = FILTER_DISADVANTAGED
    return filters == want


def pull_level(
    level: str,
    year_group: str,
    *,
    early_stop_las: int | None = None,
) -> list[dict]:
    """Page through one geographic level × year group; return raw result rows.

    For LA pulls, stop once we have total + disadvantaged rows for enough
    authorities (DfE publishes ~153 usable LAs; the cross-tab is huge).
    """
    rows: list[dict] = []
    page = 1
    total_pages = 1
    while page <= total_pages:
        qs = (
            f"filters.eq={year_group}"
            f"&geographicLevels.eq={level}"
            f"&timePeriods.eq={urllib.parse.quote(f'{PHONICS_YEAR}|AY', safe='|/')}"
            f"&indicators={INDICATOR_EXPECTED_PCT},{INDICATOR_ELIGIBLE}"
            f"&page={page}&pageSize=5000"
        )
        data = get_json(f"{BASE}/data-sets/{PHONICS_DATASET}/query?{qs}")
        batch = data.get("results") or []
        rows.extend(batch)
        paging = data.get("paging") or {}
        total_pages = int(paging.get("totalPages") or 1)
        total = paging.get("totalResults")
        print(
            f"  {level} {year_group} page {page}/{total_pages} "
            f"(+{len(batch)}, {len(rows)}/{total})",
            flush=True,
        )

        if early_stop_las and level == "LA":
            totals: set[str] = set()
            disadv: set[str] = set()
            for row in rows:
                filters = row.get("filters") or {}
                lid = (row.get("locations") or {}).get("LA")
                if not lid:
                    continue
                if filter_match(filters, year_group, disadvantaged=False):
                    totals.add(lid)
                elif filter_match(filters, year_group, disadvantaged=True):
                    disadv.add(lid)
            if (
                len(totals) >= early_stop_las
                and len(disadv) >= max(1, early_stop_las - 5)
            ):
                print(
                    f"  early-stop: {len(totals)} LA totals, "
                    f"{len(disadv)} LA disadvantaged",
                    flush=True,
                )
                break

        page += 1
    return rows


def extract_benches(
    rows: list[dict],
    year_group: str,
    *,
    la_map: dict[str, str] | None = None,
) -> tuple[dict, dict[str, dict]]:
    """Return (england_slot, la_name → slot) for one year group."""
    england: dict = {}
    las: dict[str, dict] = {}

    for row in rows:
        filters = row.get("filters") or {}
        values = row.get("values") or {}
        locs = row.get("locations") or {}
        expected = parse_metric(values.get(INDICATOR_EXPECTED_PCT))
        eligible = parse_metric(values.get(INDICATOR_ELIGIBLE))

        is_total = filter_match(filters, year_group, disadvantaged=False)
        is_disadv = filter_match(filters, year_group, disadvantaged=True)
        if not is_total and not is_disadv:
            continue

        geo = row.get("geographicLevel")
        if geo == "NAT":
            slot = england
        elif geo == "LA":
            lid = locs.get("LA")
            if not lid:
                continue
            name = (la_map or {}).get(lid, lid)
            slot = las.setdefault(name, {})
        else:
            continue

        if year_group == YEAR_GROUP_Y1:
            if is_total:
                slot["year1Expected"] = expected
                slot["year1Eligible"] = eligible
            else:
                slot["year1DisadvantagedExpected"] = expected
        else:
            if is_total:
                slot["endYear2Expected"] = expected
                slot["endYear2Eligible"] = eligible
            else:
                slot["endYear2DisadvantagedExpected"] = expected

    return england, las


def merge_la(target: dict[str, dict], incoming: dict[str, dict]) -> None:
    for name, metrics in incoming.items():
        slot = target.setdefault(name, {})
        for key, value in metrics.items():
            if value is not None:
                slot[key] = value


def main() -> None:
    import argparse
    import sys
    from pathlib import Path as _Path

    scripts_dir = _Path(__file__).resolve().parent
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    from seed_scope import SEED_LOCAL_AUTHORITY, trim_la_benchmarks

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--seed-la",
        action="store_true",
        help=f"Keep England + {SEED_LOCAL_AUTHORITY} phonics benches only",
    )
    args = parser.parse_args()

    if not INDEX.exists():
        raise SystemExit(f"Missing {INDEX} — run harvest first")

    print("Loading schools index…", flush=True)
    payload = json.loads(INDEX.read_text(encoding="utf-8"))

    print("Fetching phonics dataset meta…", flush=True)
    meta = get_json(f"{BASE}/data-sets/{PHONICS_DATASET}/meta")
    la_map = build_la_map(meta)
    print(f"  LA locations in meta: {len(la_map)}", flush=True)

    england: dict = {"period": PHONICS_YEAR.replace("/", "-")}
    local_authorities: dict[str, dict] = {}

    for year_group, label in (
        (YEAR_GROUP_Y1, "Year 1"),
        (YEAR_GROUP_END_Y2, "end of Year 2"),
    ):
        print(f"Fetching England phonics ({label})…", flush=True)
        nat_rows = pull_level("NAT", year_group)
        eng_slot, _ = extract_benches(nat_rows, year_group)
        england.update({k: v for k, v in eng_slot.items() if v is not None})

        print(f"Fetching LA phonics ({label})…", flush=True)
        # Meta lists ~161 LAs; usable English totals settle around 153.
        la_rows = pull_level("LA", year_group, early_stop_las=150)
        _, la_slot = extract_benches(la_rows, year_group, la_map=la_map)
        merge_la(local_authorities, la_slot)
        print(f"  LAs with {label} totals so far: {len(local_authorities)}", flush=True)

    if args.seed_la:
        local_authorities = trim_la_benchmarks(local_authorities)
        print(
            f"  Seed-LA trim: kept {len(local_authorities)} LA phonics row(s) "
            f"for {SEED_LOCAL_AUTHORITY}",
            flush=True,
        )

    if england.get("year1Expected") is None:
        raise SystemExit("Phonics harvest failed — no England Year 1 expected %")

    phonics = {
        "period": PHONICS_YEAR,
        "note": (
            "DfE publishes phonics screening results for England and local "
            "authorities only — not for individual schools. KS1 teacher "
            "assessment is no longer collected nationally (from 2023/24)."
        ),
        "england": england,
        "localAuthorities": local_authorities,
    }

    benchmarks = payload.setdefault("benchmarks", {})
    benchmarks["phonics"] = phonics

    source = payload.setdefault("source", {})
    datasets = source.setdefault("datasets", {})
    datasets["phonicsByRegionAndLa"] = PHONICS_DATASET

    stats = payload.setdefault("stats", {})
    stats["phonicsPeriod"] = PHONICS_YEAR
    stats["phonicsLaCount"] = len(local_authorities)
    stats["phonicsEnriched"] = True

    # Keep generatedAt as the original harvest timestamp; note phonics refresh.
    payload["phonicsEnrichedAt"] = time.strftime("%Y-%m-%d")

    print("Writing schools-index.json…", flush=True)
    INDEX.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    summary = {
        "phonicsPeriod": PHONICS_YEAR,
        "phonicsLaCount": len(local_authorities),
        "englandYear1Expected": england.get("year1Expected"),
        "englandEndYear2Expected": england.get("endYear2Expected"),
        "englandYear1DisadvantagedExpected": england.get(
            "year1DisadvantagedExpected"
        ),
        "dataset": PHONICS_DATASET,
        "note": phonics["note"],
    }
    if SUMMARY.exists():
        try:
            existing = json.loads(SUMMARY.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}
        existing["phonics"] = summary
        SUMMARY.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    else:
        SUMMARY.write_text(
            json.dumps({"phonics": summary}, indent=2) + "\n", encoding="utf-8"
        )

    if SRC_SUMMARY.exists() or SRC_SUMMARY.parent.exists():
        try:
            existing = (
                json.loads(SRC_SUMMARY.read_text(encoding="utf-8"))
                if SRC_SUMMARY.exists()
                else {}
            )
        except json.JSONDecodeError:
            existing = {}
        existing["phonics"] = summary
        SRC_SUMMARY.parent.mkdir(parents=True, exist_ok=True)
        SRC_SUMMARY.write_text(
            json.dumps(existing, indent=2) + "\n", encoding="utf-8"
        )

    print(
        f"Done. England Year 1 expected={england.get('year1Expected')}%; "
        f"end Y2={england.get('endYear2Expected')}%; "
        f"LAs={len(local_authorities)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
