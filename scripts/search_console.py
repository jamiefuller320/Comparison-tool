#!/usr/bin/env python3
"""Pull Google Search Console performance into the SEO coverage digest.

Weekly job (see .github/workflows/search-console.yml). Uses the Search
Analytics API for the domain property ``sc-domain:schoolcompass.uk`` and a
service-account JSON key in the repository secret ``GSC_SERVICE_ACCOUNT_JSON``.

When that secret is unset the command prints a notice and exits 0. It does
not invent a zero-impression read and it does not rewrite the digest.

Rows are page URLs. This script maps them onto School Compass paths and
rolls school pages up by area, town, and school type (phase bucket), plus
page kind and London vs South East. Cap, eviction, and Wiltshire stay
human decisions; the digest only records the read those decisions need.

Usage:
  python3 scripts/search_console.py
  python3 scripts/search_console.py --fixture rows.json
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    is_coverage_region_local_authority,
    is_london_borough_local_authority,
    la_slug,
)

DEFAULT_SITE_URL = "sc-domain:schoolcompass.uk"
SECRET_ENV = "GSC_SERVICE_ACCOUNT_JSON"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"
META_DEPLOY = date(2026, 10, 7)
BASELINE_START = date(2026, 9, 7)
BASELINE_END = date(2026, 10, 6)
DATA_LAG_DAYS = 3
ROLLING_DAYS = 28
TOP_QUERY_ROWS = 200
TOP_PAGE_QUERY_FETCH = 5000
TOP_PAGE_QUERY_STORE = 400
TOP_QUERY_PER_SEGMENT = 25
# Keep the 7 Oct 2026 meta-deploy window while it is still the decision sample.
MAX_META_WINDOW_DAYS = 90
IMPRESSION_FLOOR = 50
TOP_POSITION = 3.0
PRECIS_TURN_ON = 70.0
ROW_LIMIT = 25000
BRANDED_QUERY_RE = re.compile(r"school\s*compass|schoolcompass", re.I)
SECTION_START = "<!-- search-console:start -->"
SECTION_END = "<!-- search-console:end -->"

SKIP_NOTICE = (
    "NOTICE: Search Console fetch skipped. Repository secret "
    "GSC_SERVICE_ACCOUNT_JSON is not set. No performance data was written. "
    "Cap, eviction, and Wiltshire decisions still have no new Search Console read."
)

MISSING_NOTICE = (
    "Search Console was not read. The weekly job skips when the repository "
    "secret GSC_SERVICE_ACCOUNT_JSON is absent. Cap, eviction, and Wiltshire "
    "decisions stay blocked until a read exists."
)

SCHOOL_TYPE_LABELS = {
    "primary": "Primary",
    "secondary": "Secondary",
    "all-through": "All-through",
    "early-years": "Early years",
    "special": "Special",
    "childminders": "Childminders",
    "other": "Other",
}

PHASE_TO_SCHOOL_TYPE = {
    "primary": "primary",
    "junior": "primary",
    "infant": "primary",
    "ks1": "primary",
    "ks2": "primary",
    "secondary": "secondary",
    "ks3": "secondary",
    "ks4": "secondary",
    "all-through": "all-through",
    "early-years": "early-years",
    "nursery": "early-years",
    "special": "special",
}

STAGE_SCHOOL_TYPE = {
    "early-years": "early-years",
    "childminders": "childminders",
    "ks1": "primary",
    "primary": "primary",
    "secondary": "secondary",
}

STAGE_SLUGS = "|".join(STAGE_SCHOOL_TYPE)
SCHOOL_RE = re.compile(r"^/schools/([^/]+)/$")
TOWN_RE = re.compile(r"^/areas/([^/]+)/towns/([^/]+)/$")
TOWNS_INDEX_RE = re.compile(r"^/areas/([^/]+)/towns/$")
STAGE_RE = re.compile(rf"^/areas/([^/]+)/({STAGE_SLUGS})/$")
AREA_RE = re.compile(r"^/areas/([^/]+)/$")

BOILERPLATE_RE = (
    re.compile(r"^we did not find much about", re.I),
    re.compile(r"^the school website lists", re.I),
    re.compile(r"^little public evidence", re.I),
    re.compile(r"worth asking on a visit", re.I),
    re.compile(r"^some material related to", re.I),
)

HttpJson = Callable[[str, dict[str, Any] | bytes, dict[str, str]], dict[str, Any]]


class SearchConsoleError(RuntimeError):
    """A configured fetch failed. A missing secret is not this error."""


def utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def default_latest_path() -> Path:
    return ROOT / "public" / "data" / "search-console-latest.json"


def default_digest_json() -> Path:
    return ROOT / "public" / "data" / "seo-coverage-loop-latest.json"


def default_digest_md() -> Path:
    return ROOT / "public" / "data" / "seo-coverage-loop-latest.md"


def latest_path() -> Path:
    override = (os.environ.get("SEARCH_CONSOLE_LATEST") or "").strip()
    return Path(override) if override else default_latest_path()


def digest_json_path() -> Path:
    override = (os.environ.get("SEO_DIGEST_JSON") or "").strip()
    return Path(override) if override else default_digest_json()


def digest_md_path() -> Path:
    override = (os.environ.get("SEO_DIGEST_MD") or "").strip()
    return Path(override) if override else default_digest_md()


def secret_raw() -> str:
    return (os.environ.get(SECRET_ENV) or "").lstrip("\ufeff").strip()


def site_url() -> str:
    raw = (os.environ.get("GSC_SITE_URL") or "").strip()
    return raw or DEFAULT_SITE_URL


def parse_iso_date(value: str, env_name: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise SearchConsoleError(
            f"{env_name} must be YYYY-MM-DD, not a Search Console query."
        ) from exc


def default_window(today: date | None = None) -> tuple[date, date]:
    """End 3 days ago (final data lag). Start on the 7 Oct 2026 metas while recent."""
    today = today or datetime.now(timezone.utc).date()
    end = today - timedelta(days=DATA_LAG_DAYS)
    if end < META_DEPLOY:
        end = META_DEPLOY
    if (end - META_DEPLOY).days <= MAX_META_WINDOW_DAYS:
        start = META_DEPLOY
    else:
        start = end - timedelta(days=ROLLING_DAYS - 1)
    start_env = (os.environ.get("GSC_START_DATE") or "").strip()
    end_env = (os.environ.get("GSC_END_DATE") or "").strip()
    if start_env:
        start = parse_iso_date(start_env, "GSC_START_DATE")
    if end_env:
        end = parse_iso_date(end_env, "GSC_END_DATE")
    if start > end:
        raise SearchConsoleError("Search Console start date is after the end date.")
    return start, end


def baseline_window() -> tuple[date, date]:
    """Pre-meta-deploy window for before/after CTR reads (default 7 Sep – 6 Oct 2026)."""
    start = BASELINE_START
    end = BASELINE_END
    start_env = (os.environ.get("GSC_BASELINE_START_DATE") or "").strip()
    end_env = (os.environ.get("GSC_BASELINE_END_DATE") or "").strip()
    if start_env:
        start = parse_iso_date(start_env, "GSC_BASELINE_START_DATE")
    if end_env:
        end = parse_iso_date(end_env, "GSC_BASELINE_END_DATE")
    if start > end:
        raise SearchConsoleError("Search Console baseline start date is after the end date.")
    return start, end


def query_brand_class(query: str) -> str:
    return "branded" if BRANDED_QUERY_RE.search(query or "") else "nonBranded"


def slugify_town(town: str) -> str:
    """Match src/lib/seoSchools.ts slugifyTown."""
    text = unicodedata.normalize("NFKD", town)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def region_for_la(name: str | None) -> str:
    if is_london_borough_local_authority(name):
        return "london"
    if is_coverage_region_local_authority(name):
        return "south-east"
    return "other"


def school_type_key(school: dict[str, Any]) -> str:
    """Parental phase bucket. Governance labels (Academy, Foundation) stay off this key."""
    label = f"{school.get('schoolTypeLabel') or ''} {school.get('schoolType') or ''}"
    phase = str(school.get("phase") or "").strip().lower()
    if "special" in label.lower() or phase == "special":
        return "special"
    mapped = PHASE_TO_SCHOOL_TYPE.get(phase)
    if mapped:
        return mapped
    phases = [str(item).lower() for item in (school.get("phases") or [])]
    secondary = "ks3" in phases or "ks4" in phases
    primary = "ks1" in phases or "ks2" in phases
    if secondary and primary:
        return "all-through"
    if secondary:
        return "secondary"
    if primary:
        return "primary"
    if "early-years" in phases:
        return "early-years"
    return "other"


def has_precis(school: dict[str, Any]) -> bool:
    return bool(str(school.get("inspectionPrecis") or "").strip())


def _boilerplate(text: str) -> bool:
    cleaned = text.strip()
    if len(cleaned) < 80:
        return True
    return any(pattern.search(cleaned) for pattern in BOILERPLATE_RE)


def publishable_website_evidence(record: dict[str, Any]) -> bool:
    """Mirror the quality gate in src/lib/seoQualitative.ts (score, source, length)."""
    for area in record.get("areas") or []:
        if not isinstance(area, dict):
            continue
        if float(area.get("score") or 0) < 50:
            continue
        if float(area.get("confidence") or 0) < 0.6:
            continue
        signals = area.get("signals") or []
        if not signals:
            continue
        narrative = str(area.get("narrativeSummary") or "")
        if _boilerplate(narrative):
            continue
        if not any(len(str((sig or {}).get("text") or "").strip()) >= 60 for sig in signals):
            continue
        return True
    return False


def website_evidence(urn: str, shards_dir: Path) -> bool:
    shard = shards_dir / f"{urn}.json"
    if not shard.is_file():
        return False
    try:
        record = json.loads(shard.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    if not isinstance(record, dict):
        return False
    return publishable_website_evidence(record)


def index_path(root: Path, slug: str) -> Path:
    if slug == la_slug(SEED_LOCAL_AUTHORITY):
        return root / "public" / "data" / "schools-index.json"
    return root / "public" / "data" / "packs" / slug / "schools-index.json"


def _load_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SearchConsoleError(f"{path} is not a JSON object.")
    return data


def _open_schools(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    data = _load_json(path)
    return [
        school
        for school in data.get("schools") or []
        if isinstance(school, dict) and not school.get("closed")
    ]


def place_name(school: dict[str, Any], area_slug: str) -> str:
    if area_slug == "city-of-london":
        return "City of London"
    return str(school.get("town") or "").strip()


def _area_label(slug: str, schools: list[dict[str, Any]]) -> str:
    for school in schools:
        name = str(school.get("localAuthority") or "").strip()
        if name and la_slug(name) == slug:
            return name
    if slug == la_slug(SEED_LOCAL_AUTHORITY):
        return SEED_LOCAL_AUTHORITY
    return slug


def wiltshire_decision(
    schools: list[dict[str, Any]] | None,
    *,
    in_coverage: bool,
    pack_present: bool,
) -> dict[str, Any]:
    total = len(schools or [])
    with_precis = sum(1 for school in schools or [] if has_precis(school))
    precis_pct = round(100.0 * with_precis / total, 1) if total else None
    reasons = [
        "This job does not turn Wiltshire SEO on and does not raise the cap.",
    ]
    if not pack_present:
        reasons.append("No Wiltshire pack index was found.")
    elif not in_coverage:
        reasons.append(
            "Wiltshire is not in seo-coverage.json, so its schools stay off the sitemap."
        )
    if precis_pct is None:
        reasons.append("Pack précis is unknown.")
    elif precis_pct < PRECIS_TURN_ON:
        reasons.append(
            f"Pack précis is {precis_pct}% ({with_precis}/{total}). "
            "Turn SEO on only after it is above about 70%."
        )
    reasons.append(
        "When the other gates pass, raise the cap by the whole Wiltshire ring "
        "in one reviewed step."
    )
    return {
        "slug": "wiltshire",
        "packPresent": pack_present,
        "inCoverage": in_coverage,
        "seoOn": in_coverage,
        "schoolCount": total if pack_present else None,
        "withPrecis": with_precis if pack_present else None,
        "precisPct": precis_pct,
        "recommendation": "keep-off",
        "reasons": reasons,
    }


def load_catalog(root: Path | None = None) -> dict[str, Any]:
    root = root or ROOT
    coverage_path = root / "public" / "data" / "seo-coverage.json"
    coverage = _load_json(coverage_path) if coverage_path.is_file() else {}
    included = [
        str(slug)
        for slug in (coverage.get("includedAreaSlugs") or [la_slug(SEED_LOCAL_AUTHORITY)])
    ]
    schools: dict[str, dict[str, Any]] = {}
    areas: dict[str, dict[str, str]] = {}
    for slug in included:
        rows = _open_schools(index_path(root, slug))
        label = _area_label(slug, rows)
        region = region_for_la(label)
        areas[slug] = {"label": label, "region": region}
        for school in rows:
            urn = str(school.get("urn") or "").strip()
            if not urn:
                continue
            place = place_name(school, slug)
            schools[urn] = {
                "area": slug,
                "areaLabel": label,
                "town": place or None,
                "townSlug": slugify_town(place) if place else None,
                "schoolType": school_type_key(school),
                "region": region,
                "hasPrecis": has_precis(school),
            }
    wiltshire_rows = _open_schools(index_path(root, "wiltshire"))
    pack_present = index_path(root, "wiltshire").is_file()
    budget = coverage.get("pageBudget") or {}
    stats = coverage.get("stats") or {}
    return {
        "schools": schools,
        "areas": areas,
        "coverage": {
            "includedAreaSlugs": included,
            "maxSchoolPages": budget.get("maxSchoolPages"),
            "maxTownPages": budget.get("maxTownPages"),
            "schoolPages": stats.get("schoolPages"),
            "townPages": stats.get("townPages"),
        },
        "wiltshire": wiltshire_decision(
            wiltshire_rows,
            in_coverage="wiltshire" in included,
            pack_present=pack_present,
        ),
        "shardsDir": root / "public" / "data" / "qualitative",
    }


def canonical_url(url: str) -> tuple[str | None, str]:
    """Return (host, path-or-raw). Host is schoolcompass.uk, or None when it is not ours."""
    raw = (url or "").strip()
    if not raw:
        return None, ""
    if raw.startswith("/"):
        parsed = urllib.parse.urlparse("https://schoolcompass.uk" + raw)
        host = "schoolcompass.uk"
    else:
        parsed = urllib.parse.urlparse(raw)
        host = (parsed.netloc or "").lower()
        if host.startswith("www."):
            host = host[4:]
    path = urllib.parse.unquote(parsed.path or "/")
    if not path.startswith("/"):
        path = "/" + path
    path = re.sub(r"/+", "/", path)
    if host == "schoolcompass.uk":
        if path != "/" and not path.endswith("/"):
            path += "/"
        return host, path
    bare = urllib.parse.urlunparse(parsed._replace(query="", fragment=""))
    return None, bare or raw


def classify_path(path: str, catalog: dict[str, Any]) -> dict[str, Any]:
    areas: dict[str, dict[str, str]] = catalog.get("areas") or {}
    schools: dict[str, dict[str, Any]] = catalog.get("schools") or {}

    def area_bits(slug: str) -> dict[str, Any]:
        meta = areas.get(slug) or {}
        return {
            "area": slug,
            "areaLabel": meta.get("label") or slug,
            "region": meta.get("region"),
        }

    base: dict[str, Any] = {"path": path, "pageKind": "other"}
    if path == "/":
        base["pageKind"] = "home"
        return base
    if path == "/areas/":
        base["pageKind"] = "areas-index"
        return base
    match = SCHOOL_RE.match(path)
    if match:
        urn = urllib.parse.unquote(match.group(1))
        base["pageKind"] = "school"
        base["urn"] = urn
        school = schools.get(urn)
        if school:
            base.update(school)
        return base
    match = TOWN_RE.match(path)
    if match:
        base["pageKind"] = "town"
        base.update(area_bits(match.group(1)))
        base["townSlug"] = urllib.parse.unquote(match.group(2))
        return base
    match = TOWNS_INDEX_RE.match(path)
    if match:
        base["pageKind"] = "towns-index"
        base.update(area_bits(match.group(1)))
        return base
    match = STAGE_RE.match(path)
    if match:
        stage = match.group(2)
        base["pageKind"] = f"stage:{stage}"
        base["schoolType"] = STAGE_SCHOOL_TYPE[stage]
        base.update(area_bits(match.group(1)))
        return base
    match = AREA_RE.match(path)
    if match:
        base["pageKind"] = "area"
        base.update(area_bits(match.group(1)))
        return base
    if path.startswith("/guides/"):
        base["pageKind"] = "guide"
    return base


def _as_int(value: Any) -> int:
    try:
        return int(round(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def _as_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


class _Bucket:
    def __init__(self) -> None:
        self.clicks = 0
        self.impressions = 0
        self.position_weight = 0.0

    def add(self, clicks: int, impressions: int, position: float) -> None:
        self.clicks += clicks
        self.impressions += impressions
        self.position_weight += position * impressions

    def metrics(self) -> dict[str, Any]:
        ctr = (self.clicks / self.impressions) if self.impressions else 0.0
        position = (
            (self.position_weight / self.impressions) if self.impressions else 0.0
        )
        return {
            "clicks": self.clicks,
            "impressions": self.impressions,
            "ctr": round(ctr, 6),
            "position": round(position, 2),
        }


def _round_page(page: dict[str, Any]) -> dict[str, Any]:
    impressions = page["impressions"]
    clicks = page["clicks"]
    ctr = (clicks / impressions) if impressions else 0.0
    out = {
        "path": page["path"],
        "pageKind": page["pageKind"],
        "clicks": clicks,
        "impressions": impressions,
        "ctr": round(ctr, 6),
        "position": round(page["position"], 2),
    }
    for key in (
        "urn",
        "area",
        "areaLabel",
        "town",
        "townSlug",
        "schoolType",
        "region",
        "hasPrecis",
        "hasWebsiteEvidence",
    ):
        if page.get(key) is not None:
            out[key] = page[key]
    if page.get("evictionReview"):
        out["evictionReview"] = True
    return out


def _segment_rows(buckets: dict[str, tuple[dict[str, Any], _Bucket]]) -> list[dict[str, Any]]:
    rows = []
    for key, (meta, bucket) in buckets.items():
        row = {"key": key, **meta, **bucket.metrics()}
        rows.append(row)
    rows.sort(key=lambda row: (-row["impressions"], str(row["key"])))
    return rows


def _add_segment(
    buckets: dict[str, tuple[dict[str, Any], _Bucket]],
    key: str,
    meta: dict[str, Any],
    page: dict[str, Any],
) -> None:
    pair = buckets.get(key)
    if pair is None:
        pair = (meta, _Bucket())
        buckets[key] = pair
    pair[1].add(page["clicks"], page["impressions"], page["position"])


def _round_metrics(bucket: _Bucket) -> dict[str, Any]:
    return bucket.metrics()


def _query_row_metrics(row: dict[str, Any]) -> tuple[int, int, float]:
    clicks = _as_int(row.get("clicks"))
    impressions = _as_int(row.get("impressions"))
    position = _as_float(row.get("position"))
    return clicks, impressions, position


def _trim_query_rows(rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    trimmed = rows[:limit]
    for row in trimmed:
        row.pop("_sort_impressions", None)
    return trimmed


def build_query_tables(
    query_rows: list[dict[str, Any]],
    page_query_rows: list[dict[str, Any]],
    catalog: dict[str, Any],
) -> dict[str, Any]:
    """Top queries overall and per segment from query + page×query dimensions."""
    top_overall: list[dict[str, Any]] = []
    for row in query_rows:
        keys = row.get("keys") or []
        if not keys:
            continue
        q = str(keys[0])
        clicks, impressions, position = _query_row_metrics(row)
        top_overall.append(
            {
                "query": q,
                "brandClass": query_brand_class(q),
                "clicks": clicks,
                "impressions": impressions,
                "ctr": round((clicks / impressions) if impressions else 0.0, 6),
                "position": round(position, 2),
            }
        )
    top_overall.sort(key=lambda r: (-r["impressions"], r["query"]))
    top_overall = top_overall[:TOP_QUERY_ROWS]

    brand_buckets = {"branded": _Bucket(), "nonBranded": _Bucket()}
    brand_query_lists: dict[str, list[dict[str, Any]]] = {
        "branded": [],
        "nonBranded": [],
    }
    for row in query_rows:
        keys = row.get("keys") or []
        if not keys:
            continue
        q = str(keys[0])
        clicks, impressions, position = _query_row_metrics(row)
        brand = query_brand_class(q)
        brand_buckets[brand].add(clicks, impressions, position)
        brand_query_lists[brand].append(
            {
                "query": q,
                "brandClass": brand,
                "clicks": clicks,
                "impressions": impressions,
                "ctr": round((clicks / impressions) if impressions else 0.0, 6),
                "position": round(position, 2),
                "_sort_impressions": impressions,
            }
        )

    segment_buckets: dict[str, tuple[dict[str, Any], _Bucket, list[dict[str, Any]]]] = {}
    for key, label in (
        ("branded", "Branded queries"),
        ("nonBranded", "Non-branded queries"),
    ):
        segment_buckets[key] = (
            {"label": label},
            brand_buckets[key],
            brand_query_lists[key],
        )

    page_kind_labels = {
        "school": "School pages",
        "town": "Town hubs",
        "area": "Area hubs",
        "home": "Home",
    }

    def segment_for_page(classified: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        kind = classified.get("pageKind") or "other"
        if kind in page_kind_labels:
            out.append((f"pageKind:{kind}", {"label": page_kind_labels[kind]}))
        if kind == "school" and classified.get("region"):
            region = classified["region"]
            if region in {"london", "south-east"}:
                label = "London school pages" if region == "london" else "South East school pages"
                out.append((f"regionSchool:{region}", {"label": label}))
        return out

    pq_sorted: list[dict[str, Any]] = []
    for row in page_query_rows:
        keys = row.get("keys") or []
        if len(keys) < 2:
            continue
        host, path = canonical_url(str(keys[0]))
        query = str(keys[1])
        if host == "schoolcompass.uk":
            classified = classify_path(path, catalog)
        else:
            classified = {"path": path or str(keys[0]), "pageKind": "other"}
        clicks, impressions, position = _query_row_metrics(row)
        brand = query_brand_class(query)
        record = {
            "path": classified.get("path") or path,
            "pageKind": classified.get("pageKind"),
            "query": query,
            "brandClass": brand,
            "clicks": clicks,
            "impressions": impressions,
            "ctr": round((clicks / impressions) if impressions else 0.0, 6),
            "position": round(position, 2),
            "_sort_impressions": impressions,
        }
        if classified.get("region"):
            record["region"] = classified["region"]
        if classified.get("area"):
            record["area"] = classified["area"]
        pq_sorted.append(record)

        for seg_key, meta in segment_for_page(classified):
            if seg_key not in segment_buckets:
                segment_buckets[seg_key] = (meta, _Bucket(), [])
            segment_buckets[seg_key][1].add(clicks, impressions, position)
            segment_buckets[seg_key][2].append(
                {
                    "query": query,
                    "brandClass": brand,
                    "clicks": clicks,
                    "impressions": impressions,
                    "ctr": record["ctr"],
                    "position": position,
                    "_sort_impressions": impressions,
                }
            )

    pq_sorted.sort(key=lambda r: (-r["_sort_impressions"], r["path"], r["query"]))
    page_query_top = _trim_query_rows(pq_sorted, TOP_PAGE_QUERY_STORE)

    by_segment: dict[str, Any] = {}
    for key, (meta, bucket, queries) in segment_buckets.items():
        queries.sort(key=lambda r: (-r["_sort_impressions"], r["query"]))
        by_segment[key] = {
            **meta,
            **_round_metrics(bucket),
            "topQueries": _trim_query_rows(
                [
                    {
                        "query": q["query"],
                        "brandClass": q["brandClass"],
                        "clicks": q["clicks"],
                        "impressions": q["impressions"],
                        "ctr": q["ctr"],
                        "position": q["position"],
                    }
                    for q in queries
                ],
                TOP_QUERY_PER_SEGMENT,
            ),
        }

    return {
        "topOverall": top_overall,
        "pageQueryTop": page_query_top,
        "bySegment": by_segment,
        "apiQueryRows": len(query_rows),
        "apiPageQueryRows": len(page_query_rows),
    }


def build_comparison(
    current_pages: dict[str, Any],
    baseline_pages: dict[str, Any],
    current_queries: dict[str, Any],
    baseline_queries: dict[str, Any],
    *,
    baseline_start: date,
    baseline_end: date,
) -> dict[str, Any]:
    def delta(cur: float | int | None, base: float | int | None) -> float | int | None:
        if cur is None or base is None:
            return None
        return cur - base  # type: ignore[operator]

    cur_tot = current_pages.get("totals") or {}
    base_tot = baseline_pages.get("totals") or {}

    def segment_map(report: dict[str, Any], segment_key: str) -> dict[str, dict[str, Any]]:
        rows = (report.get("segments") or {}).get(segment_key) or []
        return {str(row["key"]): row for row in rows}

    region_current = segment_map(current_pages, "regionPageKind")
    region_baseline = segment_map(baseline_pages, "regionPageKind")
    region_keys = sorted(set(region_current) | set(region_baseline))
    region_compare = []
    for key in region_keys:
        cur = region_current.get(key) or {}
        base = region_baseline.get(key) or {}
        region_compare.append(
            {
                "key": key,
                "region": cur.get("region") or base.get("region"),
                "pageKind": cur.get("pageKind") or base.get("pageKind"),
                "current": _pick_metrics(cur),
                "baseline": _pick_metrics(base),
                "deltaCtr": delta(cur.get("ctr"), base.get("ctr")),
                "deltaImpressions": delta(cur.get("impressions"), base.get("impressions")),
            }
        )

    qc_keys = sorted(
        set((current_queries.get("bySegment") or {}))
        | set((baseline_queries.get("bySegment") or {}))
    )
    query_class_compare = []
    for key in qc_keys:
        cur = (current_queries.get("bySegment") or {}).get(key) or {}
        base = (baseline_queries.get("bySegment") or {}).get(key) or {}
        query_class_compare.append(
            {
                "key": key,
                "label": cur.get("label") or base.get("label") or key,
                "current": _pick_metrics(cur),
                "baseline": _pick_metrics(base),
                "deltaCtr": delta(cur.get("ctr"), base.get("ctr")),
                "deltaImpressions": delta(cur.get("impressions"), base.get("impressions")),
            }
        )

    return {
        "baselineStartDate": baseline_start.isoformat(),
        "baselineEndDate": baseline_end.isoformat(),
        "totals": {
            "current": _pick_metrics(cur_tot),
            "baseline": _pick_metrics(base_tot),
            "deltaCtr": delta(cur_tot.get("ctr"), base_tot.get("ctr")),
            "deltaImpressions": delta(cur_tot.get("impressions"), base_tot.get("impressions")),
            "deltaClicks": delta(cur_tot.get("clicks"), base_tot.get("clicks")),
        },
        "regionPageKind": region_compare,
        "querySegments": query_class_compare,
        "note": (
            "Baseline is the calendar month before the 7 Oct 2026 meta deploy. "
            "Query segments use the query dimension plus page×query rollups; "
            "brandClass splits on “school compass” / “schoolcompass” in the query text."
        ),
    }


def _pick_metrics(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "clicks": row.get("clicks", 0),
        "impressions": row.get("impressions", 0),
        "ctr": row.get("ctr", 0.0),
        "position": row.get("position", 0.0),
    }


def cap_decision(coverage: dict[str, Any]) -> dict[str, Any]:
    used = coverage.get("schoolPages")
    maximum = coverage.get("maxSchoolPages")
    remaining = None
    if isinstance(used, int) and isinstance(maximum, int):
        remaining = max(0, maximum - used)
    return {
        "maxSchoolPages": maximum,
        "schoolPages": used,
        "remaining": remaining,
        "raiseCap": False,
        "note": (
            "This job does not raise the cap or remove pages. "
            "Use London vs South East school CTR and the eviction review list, "
            "then change the cap in one reviewed step."
        ),
    }


def _thin_reasons(page: dict[str, Any]) -> list[str]:
    reasons = []
    if page.get("hasPrecis") is False:
        reasons.append("no inspection précis")
    if page.get("hasWebsiteEvidence") is False:
        reasons.append("no website evidence")
    return reasons


def build_report(
    api_rows: list[dict[str, Any]],
    catalog: dict[str, Any],
    *,
    start: date,
    end: date,
    property_url: str,
    fetched_at: str | None = None,
    evidence_fn: Callable[[str], bool] | None = None,
) -> dict[str, Any]:
    merged: dict[str, dict[str, Any]] = {}
    api_count = 0
    for row in api_rows:
        keys = row.get("keys") or []
        if not keys:
            continue
        api_count += 1
        host, path = canonical_url(str(keys[0]))
        if host == "schoolcompass.uk":
            classified = classify_path(path, catalog)
        else:
            classified = {"path": path or str(keys[0]), "pageKind": "other"}
        clicks = _as_int(row.get("clicks"))
        impressions = _as_int(row.get("impressions"))
        position = _as_float(row.get("position"))
        current = merged.get(classified["path"])
        if current is None:
            current = {
                **classified,
                "clicks": 0,
                "impressions": 0,
                "position_weight": 0.0,
            }
            merged[classified["path"]] = current
        current["clicks"] += clicks
        current["impressions"] += impressions
        current["position_weight"] += position * impressions

    pages: list[dict[str, Any]] = []
    for page in merged.values():
        impressions = page["impressions"]
        page["position"] = (
            page["position_weight"] / impressions if impressions else 0.0
        )
        pages.append(page)

    shards = catalog.get("shardsDir") or (ROOT / "public" / "data" / "qualitative")

    def evidence(urn: str) -> bool:
        if evidence_fn is not None:
            return evidence_fn(urn)
        return website_evidence(urn, Path(shards))

    area_buckets: dict[str, tuple[dict[str, Any], _Bucket]] = {}
    town_buckets: dict[str, tuple[dict[str, Any], _Bucket]] = {}
    type_buckets: dict[str, tuple[dict[str, Any], _Bucket]] = {}
    kind_buckets: dict[str, tuple[dict[str, Any], _Bucket]] = {}
    region_kind_buckets: dict[str, tuple[dict[str, Any], _Bucket]] = {}
    totals = _Bucket()

    for page in pages:
        totals.add(page["clicks"], page["impressions"], page["position"])
        _add_segment(
            kind_buckets,
            page["pageKind"],
            {"label": page["pageKind"]},
            page,
        )
        if page.get("region") and page["pageKind"] in {"school", "town", "area"}:
            key = f"{page['region']}:{page['pageKind']}"
            _add_segment(
                region_kind_buckets,
                key,
                {"region": page["region"], "pageKind": page["pageKind"]},
                page,
            )
        if page["pageKind"] != "school":
            continue
        if page.get("area"):
            _add_segment(
                area_buckets,
                page["area"],
                {
                    "label": page.get("areaLabel") or page["area"],
                    "region": page.get("region"),
                },
                page,
            )
        if page.get("townSlug") and page.get("area"):
            _add_segment(
                town_buckets,
                f"{page['area']}/{page['townSlug']}",
                {
                    "area": page["area"],
                    "areaLabel": page.get("areaLabel"),
                    "town": page.get("town") or page["townSlug"],
                    "region": page.get("region"),
                },
                page,
            )
        if page.get("schoolType"):
            key = page["schoolType"]
            _add_segment(
                type_buckets,
                key,
                {"label": SCHOOL_TYPE_LABELS.get(key, key)},
                page,
            )

    def baseline(region: str) -> dict[str, Any] | None:
        pair = region_kind_buckets.get(f"{region}:school")
        if pair is None:
            return None
        return pair[1].metrics()

    london = baseline("london")
    south_east = baseline("south-east")
    baselines = {"london": london, "south-east": south_east}

    eviction: list[dict[str, Any]] = []
    judgeable = 0
    for page in pages:
        if page["pageKind"] != "school" or page["impressions"] < IMPRESSION_FLOOR:
            continue
        judgeable += 1
        region = page.get("region")
        segment = baselines.get(region) if region in baselines else None
        if segment is None or page["position"] <= TOP_POSITION:
            continue
        page_ctr = (
            page["clicks"] / page["impressions"] if page["impressions"] else 0.0
        )
        segment_ctr = (
            segment["clicks"] / segment["impressions"]
            if segment["impressions"]
            else 0.0
        )
        if page_ctr >= segment_ctr:
            continue
        urn = str(page.get("urn") or "")
        if "hasWebsiteEvidence" not in page and urn:
            page["hasWebsiteEvidence"] = evidence(urn)
        thin = _thin_reasons(page)
        if not thin:
            continue
        page["evictionReview"] = True
        region_label = "London" if region == "london" else "South East"
        eviction.append(
            {
                "path": page["path"],
                "urn": page.get("urn"),
                "area": page.get("area"),
                "areaLabel": page.get("areaLabel"),
                "town": page.get("town"),
                "schoolType": page.get("schoolType"),
                "region": region,
                "clicks": page["clicks"],
                "impressions": page["impressions"],
                "ctr": round(page_ctr, 6),
                "position": round(page["position"], 2),
                "segmentCtr": round(segment_ctr, 6),
                "reasons": [
                    f"CTR below the {region_label} school segment",
                    "average position outside the top 3",
                    *thin,
                    "Confirm this URL was in the sitemap before 7 Oct 2026 before removing it.",
                ],
                "action": "review",
            }
        )

    eviction.sort(key=lambda row: (-row["impressions"], row["path"]))
    pages.sort(key=lambda row: (-row["impressions"], row["path"]))
    rounded_pages = [_round_page(page) for page in pages]
    covers_meta = start <= META_DEPLOY <= end
    usable = totals.impressions > 0 and judgeable > 0
    return {
        "status": "ok",
        "property": property_url,
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "fetchedAt": fetched_at or utc_now_iso(),
        "metaDeployDate": META_DEPLOY.isoformat(),
        "coversMetaDeploy": covers_meta,
        "apiRows": api_count,
        "pageCount": len(rounded_pages),
        "totals": totals.metrics(),
        "segments": {
            "area": _segment_rows(area_buckets),
            "town": _segment_rows(town_buckets),
            "schoolType": _segment_rows(type_buckets),
            "pageKind": _segment_rows(kind_buckets),
            "regionPageKind": _segment_rows(region_kind_buckets),
        },
        "pages": rounded_pages,
        "decisions": {
            "impressionFloor": IMPRESSION_FLOOR,
            "topPosition": TOP_POSITION,
            "usable": usable,
            "judgeableSchoolPages": judgeable,
            "londonSchool": london,
            "southEastSchool": south_east,
            "evictionReview": eviction,
            "evictionCount": len(eviction),
            "cap": cap_decision(catalog.get("coverage") or {}),
            "wiltshire": catalog.get("wiltshire")
            or wiltshire_decision([], in_coverage=False, pack_present=False),
            "note": (
                "Zero impressions usually means not crawled yet. "
                "Town and area hubs are not eviction candidates. "
                "A page in positions 1–3 with a weak CTR is a snippet problem, not a removal. "
                "Confirm a URL was in the sitemap before 7 Oct 2026 before anyone removes it."
                if usable
                else "No judgeable school pages (50+ impressions) in this window. Do not evict on zeroes."
            ),
        },
    }


def missing_report() -> dict[str, Any]:
    return {"status": "missing", "notice": MISSING_NOTICE}


def load_latest(path: Path | None = None) -> dict[str, Any] | None:
    path = path or latest_path()
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    return data


def for_digest() -> dict[str, Any]:
    """Payload the SEO coverage loop copies into its digest. Never fetches."""
    loaded = load_latest()
    if loaded and loaded.get("status") in {"ok", "missing"}:
        return loaded
    return missing_report()


def _pct(ctr: float | None) -> str:
    if ctr is None:
        return "—"
    return f"{ctr * 100:.2f}%"


def _metric_cells(row: dict[str, Any]) -> str:
    return (
        f"{row.get('clicks', 0)} | {row.get('impressions', 0)} | "
        f"{_pct(row.get('ctr'))} | {row.get('position', 0):.1f}"
    )


def _markdown_table(headers: list[str], lines: list[str]) -> list[str]:
    align = ["---"] + ["---:"] * (len(headers) - 1)
    return [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(align) + " |",
        *lines,
    ]


def render_markdown(report: dict[str, Any]) -> str:
    if report.get("status") != "ok":
        notice = report.get("notice") or MISSING_NOTICE
        body = "\n".join(
            [
                "## Search Console",
                "",
                f"- Status: **missing**",
                f"- {notice}",
            ]
        )
        return f"{SECTION_START}\n{body}\n{SECTION_END}"

    totals = report["totals"]
    decisions = report["decisions"]
    segments = report["segments"]
    lines = [
        "## Search Console",
        "",
        "- Status: **ok**",
        f"- Property: `{report['property']}`",
        f"- Window: {report['startDate']} → {report['endDate']}"
        + (
            " (includes the 7 Oct 2026 meta deploy)"
            if report.get("coversMetaDeploy")
            else " (does not cover the 7 Oct 2026 meta deploy)"
        ),
        f"- Fetched: `{report['fetchedAt']}`",
        (
            f"- Clicks / impressions / CTR / position: **{totals['clicks']}** / "
            f"**{totals['impressions']}** / **{_pct(totals['ctr'])}** / "
            f"**{totals['position']:.1f}**"
        ),
        f"- Pages: **{report['pageCount']}** (per-page rows are in the JSON digest)",
        "",
        "School-page rows are grouped by area, town, and school type (phase). "
        "Town hubs, area hubs, and stage landings stay in the page-kind table "
        "and are not mixed into those CTR figures.",
        "",
        "### By page kind",
        "",
    ]
    if segments["pageKind"]:
        lines.extend(
            _markdown_table(
                ["Page kind", "Clicks", "Impressions", "CTR", "Position"],
                [
                    f"| {row['label']} | {_metric_cells(row)} |"
                    for row in segments["pageKind"]
                ],
            )
        )
    else:
        lines.append("_No rows._")
    lines.extend(["", "### London vs South East", ""])
    if segments["regionPageKind"]:
        lines.extend(
            _markdown_table(
                ["Segment", "Clicks", "Impressions", "CTR", "Position"],
                [
                    f"| {row['region']} {row['pageKind']} | {_metric_cells(row)} |"
                    for row in segments["regionPageKind"]
                ],
            )
        )
    else:
        lines.append("_No rows._")
    lines.extend(["", "### By area (school pages)", ""])
    if segments["area"]:
        lines.extend(
            _markdown_table(
                ["Area", "Region", "Clicks", "Impressions", "CTR", "Position"],
                [
                    f"| {row['label']} | {row.get('region') or '—'} | {_metric_cells(row)} |"
                    for row in segments["area"]
                ],
            )
        )
    else:
        lines.append("_No school-page rows._")
    lines.extend(["", "### By town (school pages)", ""])
    if segments["town"]:
        lines.extend(
            _markdown_table(
                ["Town", "Area", "Clicks", "Impressions", "CTR", "Position"],
                [
                    f"| {row['town']} | {row.get('areaLabel') or row['area']} | {_metric_cells(row)} |"
                    for row in segments["town"]
                ],
            )
        )
    else:
        lines.append("_No school-page rows._")
    lines.extend(["", "### By school type (school pages)", ""])
    if segments["schoolType"]:
        lines.extend(
            _markdown_table(
                ["School type", "Clicks", "Impressions", "CTR", "Position"],
                [
                    f"| {row['label']} | {_metric_cells(row)} |"
                    for row in segments["schoolType"]
                ],
            )
        )
    else:
        lines.append("_No school-page rows._")

    queries = report.get("queries") or {}
    if queries.get("topOverall"):
        lines.extend(["", "### Top queries (current window)", ""])
        lines.extend(
            _markdown_table(
                ["Query", "Class", "Clicks", "Impressions", "CTR", "Position"],
                [
                    f"| {row['query'][:80]} | {row['brandClass']} | {_metric_cells(row)} |"
                    for row in queries["topOverall"][:20]
                ],
            )
        )
        if len(queries["topOverall"]) > 20:
            lines.append("")
            lines.append(
                f"_Showing 20 of {len(queries['topOverall'])}. "
                "The JSON digest lists more (capped for size)._"
            )
    by_segment = queries.get("bySegment") or {}
    branded = by_segment.get("branded")
    non_branded = by_segment.get("nonBranded")
    if branded or non_branded:
        lines.extend(["", "### Query class (current window)", ""])
        rows = []
        for key in ("branded", "nonBranded"):
            row = by_segment.get(key)
            if not row:
                continue
            rows.append(
                f"| {row.get('label', key)} | {_metric_cells(row)} |"
            )
        if rows:
            lines.extend(
                _markdown_table(
                    ["Class", "Clicks", "Impressions", "CTR", "Position"],
                    rows,
                )
            )

    comparison = report.get("comparison")
    if comparison:
        tot = comparison.get("totals") or {}
        cur = tot.get("current") or {}
        base = tot.get("baseline") or {}
        lines.extend(
            [
                "",
                "### Baseline comparison",
                "",
                f"- Baseline window: **{comparison['baselineStartDate']} → "
                f"{comparison['baselineEndDate']}**",
                (
                    f"- Totals: current **{_pct(cur.get('ctr'))}** CTR "
                    f"({cur.get('impressions', 0)} impr.) vs baseline "
                    f"**{_pct(base.get('ctr'))}** ({base.get('impressions', 0)} impr.)"
                ),
            ]
        )
        delta_ctr = tot.get("deltaCtr")
        if delta_ctr is not None:
            sign = "+" if delta_ctr >= 0 else ""
            lines.append(f"- CTR delta: **{sign}{delta_ctr * 100:.2f} pp**")
        qcmp = [
            row
            for row in (comparison.get("querySegments") or [])
            if row.get("key") in {"branded", "nonBranded"}
        ]
        if qcmp:
            lines.extend(["", "| Query class | Current CTR | Baseline CTR | Δ impr. |", "| --- | ---: | ---: | ---: |"])
            for row in qcmp:
                c = row.get("current") or {}
                b = row.get("baseline") or {}
                dimpr = row.get("deltaImpressions")
                dimpr_s = f"{dimpr:+d}" if isinstance(dimpr, int) else "—"
                lines.append(
                    f"| {row.get('label', row['key'])} | {_pct(c.get('ctr'))} | "
                    f"{_pct(b.get('ctr'))} | {dimpr_s} |"
                )
        lines.append(f"- {comparison.get('note', '')}")

    cap = decisions["cap"]
    wiltshire = decisions["wiltshire"]
    lines.extend(
        [
            "",
            "### Cap, eviction, Wiltshire",
            "",
            f"- {cap['note']}",
        ]
    )
    if cap.get("schoolPages") is not None and cap.get("maxSchoolPages") is not None:
        lines.append(
            f"- School pages in coverage: **{cap['schoolPages']}** / "
            f"{cap['maxSchoolPages']} ({cap['remaining']} left). Raise cap: **no**."
        )
    lines.append(
        f"- School pages with at least {IMPRESSION_FLOOR} impressions: "
        f"**{decisions['judgeableSchoolPages']}**."
    )
    london = decisions.get("londonSchool")
    south_east = decisions.get("southEastSchool")
    if london:
        lines.append(
            f"- London school pages: **{_pct(london['ctr'])}** CTR, "
            f"position {london['position']:.1f}, {london['impressions']} impressions."
        )
    if south_east:
        lines.append(
            f"- South East school pages: **{_pct(south_east['ctr'])}** CTR, "
            f"position {south_east['position']:.1f}, {south_east['impressions']} impressions."
        )
    lines.append(f"- {decisions['note']}")
    lines.append(
        f"- Eviction review (not applied): **{decisions['evictionCount']}** school page(s)."
    )
    if decisions["evictionReview"]:
        lines.extend(
            [
                "",
                "| Page | Area | School type | Impressions | CTR | Position | Why |",
                "| --- | --- | --- | ---: | ---: | ---: | --- |",
            ]
        )
        for row in decisions["evictionReview"][:30]:
            why = "; ".join(row["reasons"][:3])
            lines.append(
                f"| `{row['path']}` | {row.get('areaLabel') or '—'} | "
                f"{SCHOOL_TYPE_LABELS.get(row.get('schoolType') or '', row.get('schoolType') or '—')} | "
                f"{row['impressions']} | {_pct(row['ctr'])} | {row['position']:.1f} | {why} |"
            )
        if decisions["evictionCount"] > 30:
            lines.append("")
            lines.append(
                f"_Showing 30 of {decisions['evictionCount']}. The JSON digest lists every row._"
            )
    precis = wiltshire.get("precisPct")
    precis_text = f"{precis}%" if precis is not None else "unknown"
    lines.extend(
        [
            "",
            f"- Wiltshire SEO: **{'on' if wiltshire.get('seoOn') else 'off'}** "
            f"(recommendation **{wiltshire.get('recommendation')}**). "
            f"Précis {precis_text}.",
        ]
    )
    for reason in wiltshire.get("reasons") or []:
        lines.append(f"  - {reason}")
    body = "\n".join(lines).rstrip()
    return f"{SECTION_START}\n{body}\n{SECTION_END}"


def upsert_markdown(markdown: str, section: str) -> str:
    if SECTION_START in markdown and SECTION_END in markdown:
        pre = markdown.split(SECTION_START, 1)[0].rstrip()
        post = markdown.split(SECTION_END, 1)[1].lstrip("\n")
        return f"{pre}\n\n{section}\n" + (f"\n{post}" if post else "")
    return markdown.rstrip() + "\n\n" + section + "\n"


def merge_into_digest(
    report: dict[str, Any],
    *,
    digest_json: Path | None = None,
    digest_md: Path | None = None,
) -> None:
    digest_json = digest_json or digest_json_path()
    digest_md = digest_md or digest_md_path()
    if digest_json.is_file():
        try:
            payload = json.loads(digest_json.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
    else:
        payload = {}
    payload["searchConsole"] = report
    digest_json.parent.mkdir(parents=True, exist_ok=True)
    digest_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    section = render_markdown(report)
    existing = digest_md.read_text(encoding="utf-8") if digest_md.is_file() else ""
    digest_md.write_text(upsert_markdown(existing, section), encoding="utf-8")


def write_latest(report: dict[str, Any], path: Path | None = None) -> Path:
    path = path or latest_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return path


def parse_service_account(raw: str) -> dict[str, Any]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise SearchConsoleError(
            "GSC_SERVICE_ACCOUNT_JSON is not valid JSON. "
            "Paste the downloaded service-account key file."
        ) from None
    if not isinstance(data, dict):
        raise SearchConsoleError("GSC_SERVICE_ACCOUNT_JSON must be a JSON object.")
    email = str(data.get("client_email") or "")
    key = data.get("private_key")
    if not email or not isinstance(key, str) or "BEGIN" not in key:
        raise SearchConsoleError(
            "GSC_SERVICE_ACCOUNT_JSON is missing client_email or private_key. "
            "Use a Google Cloud service account key file, not an API key."
        )
    return data


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _openssl_sign(private_key_pem: str, payload: bytes) -> bytes:
    with tempfile.NamedTemporaryFile("w", delete=False) as handle:
        handle.write(private_key_pem)
        if not private_key_pem.endswith("\n"):
            handle.write("\n")
        key_path = handle.name
    os.chmod(key_path, 0o600)
    try:
        proc = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_path],
            input=payload,
            capture_output=True,
            check=False,
        )
    finally:
        os.unlink(key_path)
    if proc.returncode != 0:
        detail = proc.stderr.decode("utf-8", "replace").strip() or "openssl failed"
        raise SearchConsoleError(f"Could not sign the Search Console JWT ({detail}).")
    return proc.stdout


def fetch_access_token(
    service_account: dict[str, Any],
    *,
    http: HttpJson | None = None,
    now: int | None = None,
) -> str:
    http = http or default_http_json
    token_uri = str(service_account.get("token_uri") or DEFAULT_TOKEN_URI)
    issued = int(now if now is not None else datetime.now(timezone.utc).timestamp())
    header = _b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = _b64url(
        json.dumps(
            {
                "iss": service_account["client_email"],
                "scope": SCOPE,
                "aud": token_uri,
                "iat": issued,
                "exp": issued + 3600,
            },
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{claims}".encode()
    signature = _openssl_sign(str(service_account["private_key"]), signing_input)
    assertion = signing_input.decode("ascii") + "." + _b64url(signature)
    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        }
    ).encode()
    payload = http(
        token_uri,
        body,
        {"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = payload.get("access_token")
    if not isinstance(token, str) or not token:
        raise SearchConsoleError("Search Console token response had no access_token.")
    return token


def query_analytics(
    token: str,
    *,
    site: str,
    start: date,
    end: date,
    dimensions: list[str],
    http: HttpJson | None = None,
    row_limit: int = ROW_LIMIT,
    max_rows: int | None = None,
) -> list[dict[str, Any]]:
    http = http or default_http_json
    encoded = urllib.parse.quote(site, safe="")
    url = (
        "https://www.googleapis.com/webmasters/v3/sites/"
        f"{encoded}/searchAnalytics/query"
    )
    aggregation = "byPage" if dimensions == ["page"] else "auto"
    rows: list[dict[str, Any]] = []
    start_row = 0
    cap = max_rows if max_rows is not None else ROW_LIMIT * 20
    while len(rows) < cap:
        body = {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": dimensions,
            "rowLimit": min(row_limit, cap - len(rows)),
            "startRow": start_row,
            "dataState": "final",
            "type": "web",
            "aggregationType": aggregation,
        }
        try:
            payload = http(
                url,
                body,
                {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
        except SearchConsoleError as exc:
            if str(exc).startswith("HTTP 403"):
                raise SearchConsoleError(
                    f"{exc} Add the service account as a Full user on {site}."
                ) from None
            raise
        batch = payload.get("rows") or []
        if not isinstance(batch, list):
            raise SearchConsoleError("Search Analytics response rows were not a list.")
        rows.extend(batch)
        if len(batch) < body["rowLimit"]:
            break
        start_row += body["rowLimit"]
    return rows


def query_pages(
    token: str,
    *,
    site: str,
    start: date,
    end: date,
    http: HttpJson | None = None,
    row_limit: int = ROW_LIMIT,
) -> list[dict[str, Any]]:
    return query_analytics(
        token,
        site=site,
        start=start,
        end=end,
        dimensions=["page"],
        http=http,
        row_limit=row_limit,
    )


def default_http_json(
    url: str,
    body: dict[str, Any] | bytes,
    headers: dict[str, str],
) -> dict[str, Any]:
    if isinstance(body, dict):
        data = json.dumps(body).encode()
        headers = {**headers, "Content-Type": "application/json"}
    else:
        data = body
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:400]
        raise SearchConsoleError(f"HTTP {exc.code} from Search Console: {detail}") from None
    except urllib.error.URLError as exc:
        raise SearchConsoleError(f"Search Console request failed: {exc.reason}") from None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        raise SearchConsoleError("Search Console returned non-JSON.") from None
    if not isinstance(payload, dict):
        raise SearchConsoleError("Search Console returned a non-object JSON body.")
    return payload


def load_fixture(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return {"pages": data}
    if not isinstance(data, dict):
        raise SearchConsoleError("--fixture must be Search Analytics rows or a fixture object.")
    return {
        "pages": data.get("pages") or data.get("rows") or [],
        "queries": data.get("queries") or [],
        "pageQueries": data.get("pageQueries") or [],
        "baseline": data.get("baseline") or {},
    }


def run_fetch(
    *,
    fixture: Path | None = None,
    catalog: dict[str, Any] | None = None,
    http: HttpJson | None = None,
) -> dict[str, Any] | None:
    """Return the report, or None when the secret is absent and there is no fixture."""
    catalog = catalog if catalog is not None else load_catalog()
    start, end = default_window()
    baseline_start, baseline_end = baseline_window()
    pages: list[dict[str, Any]] = []
    query_rows: list[dict[str, Any]] = []
    page_query_rows: list[dict[str, Any]] = []
    baseline_pages: list[dict[str, Any]] = []
    baseline_query_rows: list[dict[str, Any]] = []
    baseline_page_query_rows: list[dict[str, Any]] = []

    if fixture is not None:
        loaded = load_fixture(fixture)
        pages = loaded["pages"]
        query_rows = loaded["queries"]
        page_query_rows = loaded["pageQueries"]
        base = loaded["baseline"]
        baseline_pages = base.get("pages") or []
        baseline_query_rows = base.get("queries") or []
        baseline_page_query_rows = base.get("pageQueries") or []
    elif not secret_raw():
        print(SKIP_NOTICE)
        return None
    else:
        account = parse_service_account(secret_raw())
        token = fetch_access_token(account, http=http)
        site = site_url()
        pages = query_pages(token, site=site, start=start, end=end, http=http)
        query_rows = query_analytics(
            token,
            site=site,
            start=start,
            end=end,
            dimensions=["query"],
            http=http,
            row_limit=ROW_LIMIT,
            max_rows=TOP_QUERY_ROWS,
        )
        page_query_rows = query_analytics(
            token,
            site=site,
            start=start,
            end=end,
            dimensions=["page", "query"],
            http=http,
            row_limit=ROW_LIMIT,
            max_rows=TOP_PAGE_QUERY_FETCH,
        )
        baseline_pages = query_pages(
            token,
            site=site,
            start=baseline_start,
            end=baseline_end,
            http=http,
        )
        baseline_query_rows = query_analytics(
            token,
            site=site,
            start=baseline_start,
            end=baseline_end,
            dimensions=["query"],
            http=http,
            row_limit=ROW_LIMIT,
            max_rows=TOP_QUERY_ROWS,
        )
        baseline_page_query_rows = query_analytics(
            token,
            site=site,
            start=baseline_start,
            end=baseline_end,
            dimensions=["page", "query"],
            http=http,
            row_limit=ROW_LIMIT,
            max_rows=TOP_PAGE_QUERY_FETCH,
        )
        print(
            f"Search Console token ok for {account['client_email']} "
            f"on {site} ({start.isoformat()} → {end.isoformat()}); "
            f"baseline {baseline_start.isoformat()} → {baseline_end.isoformat()}."
        )

    report = build_report(
        pages,
        catalog,
        start=start,
        end=end,
        property_url=site_url(),
    )
    report["queries"] = build_query_tables(query_rows, page_query_rows, catalog)
    if baseline_pages or baseline_query_rows:
        baseline_report = build_report(
            baseline_pages,
            catalog,
            start=baseline_start,
            end=baseline_end,
            property_url=site_url(),
        )
        baseline_queries = build_query_tables(
            baseline_query_rows,
            baseline_page_query_rows,
            catalog,
        )
        report["comparison"] = build_comparison(
            report,
            baseline_report,
            report["queries"],
            baseline_queries,
            baseline_start=baseline_start,
            baseline_end=baseline_end,
        )
    write_latest(report)
    merge_into_digest(report)
    decisions = report["decisions"]
    q = report.get("queries") or {}
    print(
        f"Search Console: {report['pageCount']} pages, "
        f"{len(report['segments']['area'])} areas, "
        f"{len(report['segments']['town'])} towns, "
        f"{len(report['segments']['schoolType'])} school types, "
        f"top queries {len(q.get('topOverall') or [])}, "
        f"eviction review {decisions['evictionCount']}. "
        f"Wiltshire recommendation {decisions['wiltshire'].get('recommendation')}."
    )
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fixture",
        type=Path,
        help="Search Analytics rows JSON. Skips Google auth (tests and local mocks).",
    )
    args = parser.parse_args(argv)
    try:
        run_fetch(fixture=args.fixture)
    except SearchConsoleError as exc:
        print(f"Search Console fetch failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
