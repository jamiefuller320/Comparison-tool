#!/usr/bin/env python3
"""Build multi-year KS2 history archive from Compare School Performance CSVs.

Same source as the Bartley Insight CSP extract, but collated for every school
in the national tables (RECTYPE 1) plus England benchmarks. Written as:
  public/data/ks2-history/meta.json   — periods, England series, provenance
  public/data/ks2-history/uXX.json    — school series sharded by last 2 URN digits

Years skip 2019/20–2021/22 (COVID cancellation / not in performance tables).
2014/15 and earlier use a different assessment framework and are excluded.

CSP occasionally returns HTTP 403 (WAF / rate-limit). By default this script:
  • retries with backoff and rotating browser UAs
  • recovers a failed year from the committed archive when possible
  • skips years that cannot be fetched or recovered
  • leaves the existing archive untouched if nothing usable was built
Use --strict to fail hard instead (local debugging).

Usage:
  python3 scripts/extract-ks2-history.py
  python3 scripts/extract-ks2-history.py --seed-la
  python3 scripts/extract-ks2-history.py --years 2023-2024,2024-2025
  python3 scripts/extract-ks2-history.py --strict
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

# CSP returns 403 for custom bot UAs; mainstream browser UAs are required.
# Rotate on retries — intermittent WAF blocks are common from GitHub Actions.
UA_POOL = (
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.6 Safari/605.1.15"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) "
        "Gecko/20100101 Firefox/128.0"
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) "
        "Gecko/20100101 Firefox/129.0"
    ),
)


class DownloadError(RuntimeError):
    """Persistent failure downloading a CSP KS2 year CSV."""


def request_headers(attempt: int) -> dict[str, str]:
    ua = UA_POOL[attempt % len(UA_POOL)]
    return {
        "User-Agent": ua,
        "Accept": "text/csv,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Referer": "https://www.compare-school-performance.service.gov.uk/download-data",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
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


def backoff_seconds(attempt: int, exc: BaseException) -> float:
    """Longer waits for 403/429; still escalate for other transient errors."""
    base = 2.0 * (2**attempt)
    if isinstance(exc, urllib.error.HTTPError) and exc.code in {403, 429, 503}:
        return min(90.0, base * 2.5)
    return min(45.0, base)


def download_year(year: str, *, attempts: int = 6) -> Path:
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
    last: BaseException | None = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=request_headers(attempt))
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = resp.read()
            if len(data) < 100_000:
                raise RuntimeError(
                    f"KS2 CSV for {year} too small ({len(data):,} bytes)"
                )
            path.write_bytes(data)
            print(
                f"    {len(data):,} bytes in {time.time() - t0:.1f}s "
                f"(attempt {attempt + 1})",
                flush=True,
            )
            return path
        except Exception as exc:  # noqa: BLE001
            last = exc
            wait = backoff_seconds(attempt, exc)
            print(
                f"    attempt {attempt + 1}/{attempts} failed: {exc} "
                f"— retry in {wait:.1f}s",
                flush=True,
            )
            if attempt + 1 < attempts:
                time.sleep(wait)
    raise DownloadError(f"Failed to download KS2 CSV for {year}: {last}")


def pad_school(bucket: dict[str, list], n: int) -> None:
    for series in bucket.values():
        while len(series) < n:
            series.append(None)


def load_existing_archive(
    directory: Path | None = None,
) -> tuple[list[str], dict[str, list], dict[str, dict[str, list]]] | None:
    """Load committed meta + shards for soft recovery. Returns None if missing."""
    root = directory or OUT_DIR
    meta_path = root / "meta.json"
    if not meta_path.exists():
        return None
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    periods = list(meta.get("periods") or [])
    if not periods:
        return None
    england_raw = meta.get("england") or {}
    england: dict[str, list] = {
        key: list(england_raw.get(key) or [None] * len(periods))
        for key in METRIC_COLS
    }
    schools: dict[str, dict[str, list]] = {}
    for shard in sorted(root.glob("u*.json")):
        try:
            payload = json.loads(shard.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(payload, dict):
            continue
        for urn, series in payload.items():
            if not isinstance(series, dict):
                continue
            bucket = {
                key: list(series.get(key) or [None] * len(periods))
                for key in METRIC_COLS
            }
            # Preserve known lengths even if a metric was slimmed out.
            for key in METRIC_COLS:
                while len(bucket[key]) < len(periods):
                    bucket[key].append(None)
            schools[str(urn)] = bucket
    if not schools:
        return None
    return periods, england, schools


def append_period_from_existing(
    period: str,
    existing: tuple[list[str], dict[str, list], dict[str, dict[str, list]]],
    periods: list[str],
    england: dict[str, list],
    schools: dict[str, dict[str, list]],
) -> bool:
    existing_periods, existing_england, existing_schools = existing
    if period not in existing_periods:
        return False
    idx = existing_periods.index(period)
    periods.append(period)
    for metric in METRIC_COLS:
        series = existing_england.get(metric) or []
        england[metric].append(series[idx] if idx < len(series) else None)

    for urn, existing_bucket in existing_schools.items():
        bucket = schools.setdefault(urn, {key: [] for key in METRIC_COLS})
        pad_school(bucket, len(periods) - 1)
        for metric in METRIC_COLS:
            series = existing_bucket.get(metric) or []
            bucket[metric].append(series[idx] if idx < len(series) else None)

    for bucket in schools.values():
        pad_school(bucket, len(periods))
    return True


def ingest_csv_year(
    path: Path,
    period: str,
    periods: list[str],
    england: dict[str, list],
    schools: dict[str, dict[str, list]],
) -> tuple[int, int]:
    periods.append(period)
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
            bucket = schools.setdefault(urn, {key: [] for key in METRIC_COLS})
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

    return school_rows, cohort_records


def extract_years(
    years: list[str],
    *,
    existing: tuple[list[str], dict[str, list], dict[str, dict[str, list]]]
    | None = None,
    download_fn=download_year,
) -> tuple[list[str], dict, dict[str, dict], dict[str, list[str]]]:
    periods: list[str] = []
    england: dict[str, list] = {key: [] for key in METRIC_COLS}
    schools: dict[str, dict[str, list]] = {}
    report: dict[str, list[str]] = {
        "downloaded": [],
        "recovered": [],
        "skipped": [],
    }

    for year in years:
        period = year.replace("-", "/")
        try:
            path = download_fn(year)
            school_rows, cohort_records = ingest_csv_year(
                path, period, periods, england, schools
            )
            report["downloaded"].append(year)
            print(
                f"  {period}: {school_rows:,} school rows · "
                f"{len(schools):,} urns · England RWM {england['rwmExpected'][-1]} · "
                f"mean cohort {england['eligiblePupils'][-1]} "
                f"(n={cohort_records:,})",
                flush=True,
            )
            continue
        except DownloadError as exc:
            print(f"  WARNING: {exc}", flush=True)

        if existing and append_period_from_existing(
            period, existing, periods, england, schools
        ):
            report["recovered"].append(year)
            print(
                f"  {period}: recovered from committed archive "
                f"(England RWM {england['rwmExpected'][-1]})",
                flush=True,
            )
            continue

        report["skipped"].append(year)
        print(
            f"  {period}: skipped (download failed and no committed period to reuse)",
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

    return periods, england, slim_schools, report


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
    *,
    notes: list[str] | None = None,
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

    source_note = (
        "School-level KS2 performance tables (RECTYPE 1) plus England "
        "(RECTYPE 4/5). eligiblePupils England series is the mean Year 6 "
        "cohort (sum of school TELIG ÷ number of KS2 school records with "
        "a published cohort), not the national pupil total. "
        "No tables for 2019/20–2021/22 (COVID). "
        "2014/15 and earlier excluded (different assessment framework)."
    )
    if notes:
        source_note = source_note + " " + " ".join(notes)

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
            "note": source_note,
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


def main(argv: list[str] | None = None) -> int:
    import sys
    from pathlib import Path as _Path

    scripts_dir = _Path(__file__).resolve().parent
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    from seed_scope import SEED_LOCAL_AUTHORITY

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--years",
        default=",".join(DEFAULT_YEARS),
        help="Comma-separated CSP year tokens (YYYY-YYYY)",
    )
    parser.add_argument(
        "--seed-la",
        action="store_true",
        help=(
            f"Keep history only for URNs in the {SEED_LOCAL_AUTHORITY} "
            "schools-index.json maintained set"
        ),
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help=(
            "Fail hard if any requested year cannot be downloaded or recovered "
            "(default: soft-keep / partial write so scheduled refresh can continue)"
        ),
    )
    args = parser.parse_args(argv)
    years = [y.strip() for y in args.years.split(",") if y.strip()]
    if not years:
        raise SystemExit("No years provided")

    existing = load_existing_archive()
    if existing:
        print(
            f"Committed archive available ({len(existing[0])} periods, "
            f"{len(existing[2]):,} schools) for soft recovery",
            flush=True,
        )

    print(f"Extracting KS2 history for {len(years)} years…", flush=True)
    periods, england, schools, report = extract_years(years, existing=existing)

    if not periods:
        msg = (
            "KS2 history extract produced no periods "
            f"(downloaded={report['downloaded']}, recovered={report['recovered']}, "
            f"skipped={report['skipped']})"
        )
        if existing and not args.strict:
            print(
                f"WARNING: {msg}. Leaving committed archive untouched.",
                flush=True,
            )
            return 0
        raise SystemExit(msg)

    if args.seed_la:
        index_path = ROOT / "public" / "data" / "schools-index.json"
        if not index_path.exists():
            raise SystemExit(f"Missing {index_path} for --seed-la filter")
        index = json.loads(index_path.read_text(encoding="utf-8"))
        keep = {
            str(s.get("urn"))
            for s in (index.get("schools") or [])
            if s.get("urn")
        }
        before = len(schools)
        schools = {urn: series for urn, series in schools.items() if urn in keep}
        print(
            f"Seed-LA history filter: {before:,} → {len(schools):,} URNs "
            f"({SEED_LOCAL_AUTHORITY} index)",
            flush=True,
        )

    notes: list[str] = []
    if report["recovered"]:
        notes.append(
            "Recovered from committed archive after CSP download failure: "
            + ", ".join(report["recovered"])
            + "."
        )
    if report["skipped"]:
        notes.append(
            "Skipped unavailable years: " + ", ".join(report["skipped"]) + "."
        )

    if args.strict and (report["recovered"] or report["skipped"]):
        raise SystemExit(
            "Strict mode: incomplete KS2 history "
            f"(recovered={report['recovered']}, skipped={report['skipped']})"
        )

    write_years = [y for y in years if y in report["downloaded"] or y in report["recovered"]]
    write_archive(periods, england, schools, write_years, notes=notes or None)
    if report["skipped"] or report["recovered"]:
        print(
            "KS2 history soft-complete: "
            f"downloaded={len(report['downloaded'])} "
            f"recovered={len(report['recovered'])} "
            f"skipped={len(report['skipped'])}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
