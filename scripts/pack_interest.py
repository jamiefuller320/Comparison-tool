#!/usr/bin/env python3
"""Area interest scores for pack quality target selection.

Phase 2 of continuous data-quality automation. Combines *offline* signals:
  - LA-pack request stamps (`manifest.requestedAt` + interest-log)
  - Missing-school force-refresh (school → LA when resolvable)
  - Product-feedback intake (pageUrl area/school paths + optional shortlistLas)

Does **not** scrape private shortlists. Soft-fails when `gh` / intake is
unavailable so scheduled polish still runs on weakness alone.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    la_slug,
    normalize_la_name,
)

MANIFEST_PATH = ROOT / "public" / "data" / "packs" / "manifest.json"
INTEREST_LOG = ROOT / "public" / "data" / "packs" / "interest-log.jsonl"
FORCE_REFRESH_STATE = ROOT / "public" / "data" / "force-refresh-state.json"
SCHOOLS_INDEX = ROOT / "public" / "data" / "schools-index.json"

# Soft weights — weakness remains primary; interest nudges among near-peers.
WEIGHT_LA_PACK_REQUEST = 3.0
WEIGHT_MISSING_SCHOOL = 2.0
WEIGHT_FEEDBACK_AREA = 1.0
WEIGHT_FEEDBACK_SHORTLIST_LA = 1.5
WEIGHT_MANIFEST_REQUEST_RECENCY = 1.0  # scaled by age
INTEREST_PCT_BOOST_PER_POINT = 4.0
INTEREST_PCT_BOOST_CAP = 18.0

AREA_PATH_RE = re.compile(
    r"/areas/([a-z0-9-]+)(?:/|$)",
    re.IGNORECASE,
)
SCHOOL_PATH_RE = re.compile(
    r"/schools/(\d{4,7})(?:/|$)",
)
MACHINE_RE = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)


def _parse_iso(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _days_ago(value: str | None, *, now: datetime | None = None) -> float | None:
    dt = _parse_iso(value)
    if not dt:
        return None
    now = now or datetime.now(timezone.utc)
    return max(0.0, (now - dt).total_seconds() / 86400.0)


def _recency_weight(days: float | None, *, half_life_days: float = 45.0) -> float:
    """1.0 at age 0 → ~0.5 at half_life → asymptote to 0."""
    if days is None:
        return 0.0
    return 0.5 ** (days / half_life_days)


def load_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.exists():
        return {}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def append_interest_event(event: dict[str, Any]) -> None:
    """Append one interest signal (workflows / local tooling)."""
    INTEREST_LOG.parent.mkdir(parents=True, exist_ok=True)
    payload = dict(event)
    payload.setdefault(
        "at", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    with INTEREST_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, separators=(",", ":")) + "\n")


def load_interest_log() -> list[dict[str, Any]]:
    if not INTEREST_LOG.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in INTEREST_LOG.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict):
            rows.append(row)
    return rows


def _urn_to_la_lookup() -> dict[str, str]:
    """URN → LA label from Hampshire seed + ready pack indexes (best effort)."""
    mapping: dict[str, str] = {}

    def ingest(path: Path) -> None:
        if not path.exists():
            return
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        schools = payload.get("schools") if isinstance(payload, dict) else None
        if not isinstance(schools, list):
            return
        for school in schools:
            if not isinstance(school, dict):
                continue
            urn = str(school.get("urn") or "").strip()
            la = normalize_la_name(school.get("localAuthority"))
            if urn and la:
                mapping[urn] = la

    ingest(SCHOOLS_INDEX)
    packs_root = ROOT / "public" / "data" / "packs"
    if packs_root.is_dir():
        for child in packs_root.iterdir():
            if child.is_dir():
                ingest(child / "schools-index.json")
    return mapping


def _resolve_school_query_to_la(
    query: str | None, *, urn_to_la: dict[str, str] | None = None
) -> str | None:
    """Map a missing-school query (URN or name fragment) to an LA label."""
    q = (query or "").strip()
    if not q:
        return None
    lookup = urn_to_la if urn_to_la is not None else _urn_to_la_lookup()
    if q.isdigit() and q in lookup:
        return lookup[q]

    # Name search across seed + packs (case-insensitive contains).
    needle = re.sub(r"\s+", " ", q).lower()
    hits: list[str] = []

    def scan(path: Path) -> None:
        if not path.exists():
            return
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        schools = payload.get("schools") if isinstance(payload, dict) else None
        if not isinstance(schools, list):
            return
        for school in schools:
            if not isinstance(school, dict):
                continue
            name = str(school.get("name") or "").lower()
            la = normalize_la_name(school.get("localAuthority"))
            if la and needle in name:
                hits.append(la)

    scan(SCHOOLS_INDEX)
    packs_root = ROOT / "public" / "data" / "packs"
    if packs_root.is_dir():
        for child in packs_root.iterdir():
            if child.is_dir():
                scan(child / "schools-index.json")

    if not hits:
        return None
    # Prefer a unique LA; otherwise the most common hit.
    counts = Counter(hits)
    top_la, top_n = counts.most_common(1)[0]
    if top_n >= 1 and (len(counts) == 1 or top_n > 1):
        return top_la
    return top_la if len(hits) == 1 else None


def scores_from_manifest(
    manifest: dict[str, Any] | None = None, *, now: datetime | None = None
) -> Counter[str]:
    """Recency-weighted score from pack `requestedAt` stamps."""
    manifest = manifest if manifest is not None else load_manifest()
    packs = (manifest or {}).get("packs") or {}
    scores: Counter[str] = Counter()
    now = now or datetime.now(timezone.utc)
    for slug, meta in packs.items():
        if not isinstance(meta, dict):
            continue
        if meta.get("status") and meta.get("status") != "ready":
            # Still count building/requested packs — parents asked for them.
            pass
        days = _days_ago(meta.get("requestedAt"), now=now)
        weight = _recency_weight(days) * WEIGHT_MANIFEST_REQUEST_RECENCY
        if weight > 0:
            scores[str(slug)] += weight
    return scores


def scores_from_interest_log(
    rows: list[dict[str, Any]] | None = None, *, now: datetime | None = None
) -> Counter[str]:
    rows = rows if rows is not None else load_interest_log()
    scores: Counter[str] = Counter()
    now = now or datetime.now(timezone.utc)
    urn_to_la: dict[str, str] | None = None
    for row in rows:
        kind = str(row.get("kind") or "").strip().lower()
        days = _days_ago(row.get("at") or row.get("requestedAt"), now=now)
        age = _recency_weight(days)
        if age <= 0:
            continue
        if kind in {"la-pack", "pack-request"}:
            la = normalize_la_name(row.get("localAuthority"))
            if la:
                scores[la_slug(la)] += WEIGHT_LA_PACK_REQUEST * age
        elif kind in {"missing-school", "force-refresh"}:
            la = normalize_la_name(row.get("localAuthority"))
            if not la:
                if urn_to_la is None:
                    urn_to_la = _urn_to_la_lookup()
                la = _resolve_school_query_to_la(
                    row.get("school"), urn_to_la=urn_to_la
                ) or ""
            if la:
                scores[la_slug(la)] += WEIGHT_MISSING_SCHOOL * age
    return scores


def scores_from_force_refresh(
    state: dict[str, Any] | None = None, *, now: datetime | None = None
) -> Counter[str]:
    if state is None:
        if not FORCE_REFRESH_STATE.exists():
            return Counter()
        try:
            state = json.loads(FORCE_REFRESH_STATE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return Counter()
    if not isinstance(state, dict):
        return Counter()
    school = state.get("school")
    if not school:
        return Counter()
    la = _resolve_school_query_to_la(str(school))
    if not la:
        return Counter()
    days = _days_ago(
        state.get("lastForcedAt") or state.get("lastForcedDate"), now=now
    )
    age = _recency_weight(days, half_life_days=30.0)
    return Counter({la_slug(la): WEIGHT_MISSING_SCHOOL * max(age, 0.25)})


def extract_machine(body: str) -> dict[str, Any] | None:
    match = MACHINE_RE.search(body or "")
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def las_from_page_url(
    page_url: str | None, *, urn_to_la: dict[str, str] | None = None
) -> list[str]:
    """Return LA slugs inferred from SEO / deep-link paths."""
    if not page_url:
        return []
    try:
        path = urlparse(page_url).path or ""
    except ValueError:
        path = page_url
    slugs: list[str] = []
    for match in AREA_PATH_RE.finditer(path):
        slug = match.group(1).lower()
        if slug and slug not in {"hampshire"}:  # seed is never a polish target
            slugs.append(slug)
    for match in SCHOOL_PATH_RE.finditer(path):
        urn = match.group(1)
        lookup = urn_to_la if urn_to_la is not None else _urn_to_la_lookup()
        la = lookup.get(urn)
        if la and normalize_la_name(la) != SEED_LOCAL_AUTHORITY:
            slugs.append(la_slug(la))
    return slugs


def scores_from_feedback_rows(
    rows: list[dict[str, Any]], *, now: datetime | None = None
) -> Counter[str]:
    """Score from already-parsed machine payloads (tests / digest JSONL)."""
    scores: Counter[str] = Counter()
    now = now or datetime.now(timezone.utc)
    urn_to_la: dict[str, str] | None = None
    for row in rows:
        days = _days_ago(row.get("requestedAt"), now=now)
        age = _recency_weight(days, half_life_days=60.0)
        if age <= 0 and row.get("requestedAt"):
            continue
        age = age or 1.0
        page_url = row.get("pageUrl")
        if page_url and urn_to_la is None:
            urn_to_la = _urn_to_la_lookup()
        for slug in las_from_page_url(page_url, urn_to_la=urn_to_la):
            scores[slug] += WEIGHT_FEEDBACK_AREA * age
        shortlist = row.get("shortlistLas") or (row.get("usage") or {}).get(
            "shortlistLas"
        )
        if isinstance(shortlist, list):
            for la in shortlist:
                label = normalize_la_name(la)
                if not label or label == SEED_LOCAL_AUTHORITY:
                    continue
                scores[la_slug(label)] += WEIGHT_FEEDBACK_SHORTLIST_LA * age
        topics = row.get("topics") or []
        if isinstance(topics, list) and "coverage" in topics:
            # Coverage topic without an area path — weak global nudge only via
            # shortlistLas/pageUrl already counted; no blanket boost.
            pass
    return scores


def fetch_feedback_machine_rows(
    *, repo: str | None = None, limit: int = 100
) -> list[dict[str, Any]]:
    """Load product-feedback issues via `gh`. Returns [] on soft failure."""
    cmd = [
        "gh",
        "issue",
        "list",
        "--label",
        "product-feedback",
        "--state",
        "all",
        "--limit",
        str(limit),
        "--json",
        "number,body,createdAt",
    ]
    if repo:
        cmd.extend(["--repo", repo])
    try:
        proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return []
    try:
        issues = json.loads(proc.stdout or "[]")
    except json.JSONDecodeError:
        return []
    rows: list[dict[str, Any]] = []
    for issue in issues:
        machine = extract_machine(issue.get("body") or "")
        if not machine:
            continue
        if not machine.get("requestedAt"):
            machine["requestedAt"] = issue.get("createdAt")
        rows.append(machine)
    return rows


def combine_interest_scores(
    *,
    include_feedback: bool = True,
    feedback_repo: str | None = None,
    feedback_rows: list[dict[str, Any]] | None = None,
    now: datetime | None = None,
) -> dict[str, float]:
    """Return slug → interest score (higher = parents touched this area more)."""
    now = now or datetime.now(timezone.utc)
    combined: Counter[str] = Counter()
    combined.update(scores_from_manifest(now=now))
    combined.update(scores_from_interest_log(now=now))
    combined.update(scores_from_force_refresh(now=now))
    if include_feedback:
        rows = (
            feedback_rows
            if feedback_rows is not None
            else fetch_feedback_machine_rows(
                repo=feedback_repo or os.environ.get("CHALLENGE_INTAKE_REPO")
            )
        )
        combined.update(scores_from_feedback_rows(rows, now=now))

    # Drop seed — Hampshire is maintained, never a pack polish target.
    seed = la_slug(SEED_LOCAL_AUTHORITY)
    combined.pop(seed, None)
    return {slug: round(score, 3) for slug, score in combined.items() if score > 0}


def interest_pct_boost(score: float) -> float:
    """Convert interest points into an indie-% equivalent boost (capped)."""
    if score <= 0:
        return 0.0
    return min(INTEREST_PCT_BOOST_CAP, score * INTEREST_PCT_BOOST_PER_POINT)


def rank_key_with_interest(row: dict[str, Any], interest_by_slug: dict[str, float]):
    """Sort key: lower first. Weakness primary; interest lowers effective indie%."""
    indie_pct = (row.get("independentPrecis") or {}).get("pct") or 0.0
    slug = str(row.get("slug") or "")
    boost = interest_pct_boost(interest_by_slug.get(slug, 0.0))
    isi_gap = max(
        0, (row.get("independentCount") or 0) - (row.get("independentWithIsiUrl") or 0)
    )
    return (
        indie_pct - boost,
        -isi_gap,
        row.get("precisPct") or 0.0,
        row.get("localAuthority") or "",
    )


if __name__ == "__main__":
    scores = combine_interest_scores()
    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
    print(json.dumps({"interestBySlug": dict(ranked)}, indent=2))
