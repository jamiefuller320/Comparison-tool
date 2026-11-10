#!/usr/bin/env python3
"""Search Console signals for pack-quality précis targeting.

School pages averaging position 4–20 without a précis are prioritised ahead of
the sitemap open-% ordering when ``search-console-latest.json`` is present and
``status`` is ``ok``. Missing or non-ok files disable this layer cleanly.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LATEST = ROOT / "public" / "data" / "search-console-latest.json"

GSC_PRECIS_POS_MIN = 4.0
GSC_PRECIS_POS_MAX = 20.0


@dataclass
class GscPrecisTargeting:
    """Loaded GSC précis opportunities, or empty when unavailable."""

    active: bool = False
    by_urn: dict[str, dict] = field(default_factory=dict)
    # area slug -> list of urns (highest impressions first)
    urns_by_area: dict[str, list[str]] = field(default_factory=dict)
    # area slug -> aggregate stats for pack ordering
    stats_by_area: dict[str, dict] = field(default_factory=dict)

    @property
    def school_count(self) -> int:
        return len(self.by_urn)


def _page_opportunity(page: dict) -> dict | None:
    if page.get("pageKind") != "school":
        return None
    if page.get("hasPrecis"):
        return None
    try:
        position = float(page.get("position"))
    except (TypeError, ValueError):
        return None
    if position < GSC_PRECIS_POS_MIN or position > GSC_PRECIS_POS_MAX:
        return None
    urn = str(page.get("urn") or "").strip()
    if not urn:
        return None
    area = str(page.get("area") or "").strip()
    try:
        impressions = int(page.get("impressions") or 0)
    except (TypeError, ValueError):
        impressions = 0
    return {
        "urn": urn,
        "area": area,
        "position": position,
        "impressions": impressions,
    }


def load_gsc_precis_targeting(path: Path | None = None) -> GscPrecisTargeting:
    path = path or DEFAULT_LATEST
    if not path.exists():
        return GscPrecisTargeting()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return GscPrecisTargeting()
    if not isinstance(data, dict) or data.get("status") != "ok":
        return GscPrecisTargeting()

    opportunities: list[dict] = []
    for page in data.get("pages") or []:
        if not isinstance(page, dict):
            continue
        opp = _page_opportunity(page)
        if opp:
            opportunities.append(opp)

    opportunities.sort(key=lambda row: (-row["impressions"], row["position"], row["urn"]))

    by_urn: dict[str, dict] = {}
    urns_by_area: dict[str, list[str]] = {}
    stats_by_area: dict[str, dict] = {}
    for row in opportunities:
        urn = row["urn"]
        by_urn[urn] = row
        area = row["area"]
        if area:
            urns_by_area.setdefault(area, []).append(urn)
            bucket = stats_by_area.setdefault(
                area,
                {"gscPrecisOpportunity": 0, "gscPrecisImpressions": 0},
            )
            bucket["gscPrecisOpportunity"] += 1
            bucket["gscPrecisImpressions"] += row["impressions"]

    return GscPrecisTargeting(
        active=True,
        by_urn=by_urn,
        urns_by_area=urns_by_area,
        stats_by_area=stats_by_area,
    )


def annotate_pack_rows_for_gsc(
    rows: list[dict], targeting: GscPrecisTargeting
) -> list[dict]:
    """Attach per-pack GSC précis opportunity counts for target ordering."""
    if not targeting.active:
        return rows
    out: list[dict] = []
    for row in rows:
        merged = dict(row)
        slug = str(row.get("slug") or "")
        stats = targeting.stats_by_area.get(slug) or {}
        merged["gscPrecisOpportunity"] = int(stats.get("gscPrecisOpportunity") or 0)
        merged["gscPrecisImpressions"] = int(stats.get("gscPrecisImpressions") or 0)
        out.append(merged)
    return out


def priority_urns_for_area(targeting: GscPrecisTargeting, area_slug: str) -> list[str]:
    if not targeting.active:
        return []
    return list(targeting.urns_by_area.get(area_slug) or [])
