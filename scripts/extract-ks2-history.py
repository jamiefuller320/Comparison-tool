#!/usr/bin/env python3
"""Build multi-year KS2 history archive from Compare School Performance CSVs.

Same source as the Bartley Insight CSP extract, but collated for every school
in the national tables (RECTYPE 1) plus England benchmarks. Written as:
  public/data/ks2-history/meta.json   — periods, England series, provenance
  public/data/ks2-history/uXX.json    — school series sharded by last 2 URN digits

Years skip 2019/20–2021/22 (COVID cancellation / not in performance tables).
2014/15 and earlier use a different assessment framework and are excluded.

Usage:
  python3 scripts/extract-ks2-history.py
  python3 scripts/extract-ks2-history.py --years 2023-2024,2024-2025
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "data" / "ks2-history"
CACHE = Path("/tmp/csp-ks2")

DEFAULT_YEARS = [
    "2015-2016",
    "2016-2017",
    "2017-2018",
    "2018-2019",
    "2022-2023",
    "2023-2024",
    "2024-2025",
]

# Keys aligned with PARENT_METRICS / SchoolRecord fields.
METRIC_COLS: dict[str, tuple[str, ...]] = {
    "rwmExpected": ("PTRWM_EXP",),
    "rwmHigher": ("PTRWM_HIGH",),
    "readingExpected": ("PTREAD_EXP",),
    "writingExpected": ("PTWRITTA_EXP",),
    "mathsExpected": ("PTMAT_EXP",),
    "gpsExpected": ("PTGPS_EXP",),
    "scienceExpected": ("PTSCITA_EXP",),
    "readingScaled": ("READ_AVERAGE",),
    "mathsScaled": ("MAT_AVERAGE", "MATTAVERAGE"),
    "eligiblePupils": ("TELIG",),
    "disadvantagedPercent": ("PTFSM6CLA1A",),
    "boysRwmExpected": ("PTRWM_EXP_B",),
    "girlsRwmExpected": ("PTRWM_EXP_G",),
    "disadvantagedRwmExpected": ("PTRWM_EXP_FSM6CLA1A",),
}

UA_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; Schoolside/0.1; "
        "+https://github.com/jamiefuller320/Comparison-tool)"
    ),
    "Accept": "text/csv,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Referer": "https://www.compare-school-performance.service.gov.uk/download-data",
}


def parse_metric(raw: str | None) -> float | int | None:
    if raw is None:
        return None
    text = str(raw).strip().replace("%", "")
    if not text or text.lower() in {
        "na",
        "n/a",
        "supp",
        "suppressed",
        "ne",
        "np",
        "low",
        ".",
        "z",
        "x",
        ":",
    }:
        return None
    try:
        value = float(text)
    except ValueError:
        return None
    if value.is_integer():
        return int(value)
    return value


def first(row: dict[str, str], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None


def download_year(year: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"ks2-{year}.bin"
    if path.exists() and path.stat().st_size > 100_000:
        print(f"  cached {year} ({path.stat().st_size:,} bytes)", flush=True)
        return path

    url = (
        "https://www.compare-school-performance.service.gov.uk/download-data"
        f"?download=true&regions=0&filters=KS2&fileformat=csv&year={year}&meta=false"
    )
    print(f"  downloading {year}…", flush=True)
    last: Exception | None = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA_HEADERS)
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = resp.read()
            path.write_bytes(data)
            print(
                f"    {len(data):,} bytes in {time.time() - t0:.1f}s",
                flush=True,
            )
            return path
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to download KS2 CSV for {year}: {last}")


def pad_school(bucket: dict[str, list], n: int) -> None:
    for series in bucket.values():
        while len(series) < n:
            series.append(None)


def extract_years(years: list[str]) -> tuple[list[str], dict, dict[str, dict]]:
    periods: list[str] = []
    england: dict[str, list] = {key: [] for key in METRIC_COLS}
    schools: dict[str, dict[str, list]] = {}

    for year in years:
        period = year.replace("-", "/")
        periods.append(period)
        path = download_year(year)
        text = path.read_bytes().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))

        eng_row: dict[str, str] | None = None
        school_rows = 0
        cohort_total = 0.0
        cohort_records = 0
        for row in reader:
            rectype = row.get("RECTYPE")
            if rectype == "1":
                urn = str(row.get("URN") or "").strip()
                if not urn:
                    continue
                bucket = schools.setdefault(
                    urn, {key: [] for key in METRIC_COLS}
                )
                pad_school(bucket, len(periods) - 1)
                for metric, cols in METRIC_COLS.items():
                    value = parse_metric(first(row, cols))
                    bucket[metric].append(value)
                    if metric == "eligiblePupils" and value is not None:
                        cohort_total += float(value)
                        cohort_records += 1
                school_rows += 1
            elif rectype in {"4", "5"} and eng_row is None:
                eng_row = row

        for metric, cols in METRIC_COLS.items():
            if metric == "eligiblePupils":
                # National TELIG is a pupil total (~650k). For cohort-size charts
                # parents need mean school size: total ÷ KS2 school records.
                if cohort_records > 0:
                    avg = cohort_total / cohort_records
                    england[metric].append(
                        int(round(avg)) if abs(avg - round(avg)) < 1e-9 else round(avg, 1)
                    )
                else:
                    england[metric].append(None)
                continue
            england[metric].append(
                parse_metric(first(eng_row, cols)) if eng_row else None
            )

        for bucket in schools.values():
            pad_school(bucket, len(periods))

        print(
            f"  {period}: {school_rows:,} school rows · "
            f"{len(schools):,} urns · England RWM {england['rwmExpected'][-1]} · "
            f"mean cohort {england['eligiblePupils'][-1]} "
            f"(n={cohort_records:,})",
            flush=True,
        )

    # Drop empty schools / all-null metric series.
    slim_schools: dict[str, dict[str, list]] = {}
    for urn, bucket in schools.items():
        slim = {
            metric: series
            for metric, series in bucket.items()
            if any(value is not None for value in series)
        }
        if slim:
            slim_schools[urn] = slim

    return periods, england, slim_schools


def shard_key(urn: str) -> str:
    digits = "".join(ch for ch in urn if ch.isdigit())
    if len(digits) >= 2:
        return digits[-2:]
    return digits.zfill(2)


def write_archive(
    periods: list[str],
    england: dict,
    schools: dict[str, dict[str, list]],
    years: list[str],
) -> None:
    if OUT_DIR.exists():
        for old in OUT_DIR.glob("u*.json"):
            old.unlink()
    else:
        OUT_DIR.mkdir(parents=True, exist_ok=True)

    shards: dict[str, dict[str, dict[str, list]]] = {}
    for urn, series in schools.items():
        shards.setdefault(shard_key(urn), {})[urn] = series

    for key, payload in shards.items():
        path = OUT_DIR / f"u{key}.json"
        path.write_text(
            json.dumps(payload, separators=(",", ":")),
            encoding="utf-8",
        )

    meta = {
        "generatedAt": time.strftime("%Y-%m-%d"),
        "periods": periods,
        "metrics": list(METRIC_COLS.keys()),
        "england": england,
        "schoolCount": len(schools),
        "shardCount": len(shards),
        "source": {
            "name": "Compare school and college performance — KS2 downloadable data",
            "url": "https://www.compare-school-performance.service.gov.uk/download-data",
            "note": (
                "School-level KS2 performance tables (RECTYPE 1) plus England "
                "(RECTYPE 4/5). eligiblePupils England series is the mean Year 6 "
                "cohort (sum of school TELIG ÷ number of KS2 school records with "
                "a published cohort), not the national pupil total. "
                "No tables for 2019/20–2021/22 (COVID). "
                "2014/15 and earlier excluded (different assessment framework)."
            ),
            "years": years,
        },
    }
    (OUT_DIR / "meta.json").write_text(
        json.dumps(meta, indent=2) + "\n",
        encoding="utf-8",
    )

    total = sum(p.stat().st_size for p in OUT_DIR.glob("*.json"))
    print(
        f"Wrote {len(shards)} shards + meta for {len(schools):,} schools "
        f"({total / 1_000_000:.1f} MB) → {OUT_DIR}",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--years",
        default=",".join(DEFAULT_YEARS),
        help="Comma-separated CSP year tokens (YYYY-YYYY)",
    )
    args = parser.parse_args()
    years = [y.strip() for y in args.years.split(",") if y.strip()]
    if not years:
        raise SystemExit("No years provided")

    print(f"Extracting KS2 history for {len(years)} years…", flush=True)
    periods, england, schools = extract_years(years)
    write_archive(periods, england, schools, years)


if __name__ == "__main__":
    main()
