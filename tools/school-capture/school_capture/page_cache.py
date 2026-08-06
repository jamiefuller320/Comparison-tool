"""Per-URL page cache validators for cheap website re-screens.

Stores ETag / Last-Modified / content hash / extracted text so later crawls
can conditional-GET and skip re-parse when a page is unchanged.
"""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from typing import Any, Iterable

from school_capture.http_utils import normalize_url
from school_capture.models import QualitativeCaptureRecord, today_iso
from school_capture.sources.base import RawCapture


def content_hash(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8", errors="replace")
    return hashlib.sha256(data).hexdigest()


@dataclass
class PageCacheEntry:
    """Validators + extracted text for one successfully captured page."""

    url: str
    finalUrl: str = ""
    fetchedAt: str = ""
    etag: str | None = None
    lastModified: str | None = None
    contentLength: int | None = None
    contentHash: str | None = None
    textHash: str | None = None
    pageTitle: str | None = None
    section: str | None = None
    text: str = ""
    listItems: list[str] = field(default_factory=list)
    meta: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        out = asdict(self)
        return {k: v for k, v in out.items() if v is not None and v != "" and v != []}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PageCacheEntry:
        list_items = [str(x) for x in (data.get("listItems") or []) if str(x).strip()]
        meta_raw = data.get("meta") or {}
        meta = (
            {str(k): str(v) for k, v in meta_raw.items()}
            if isinstance(meta_raw, dict)
            else {}
        )
        content_length = data.get("contentLength")
        return cls(
            url=str(data.get("url") or ""),
            finalUrl=str(data.get("finalUrl") or data.get("url") or ""),
            fetchedAt=str(data.get("fetchedAt") or ""),
            etag=(str(data["etag"]) if data.get("etag") else None),
            lastModified=(
                str(data["lastModified"]) if data.get("lastModified") else None
            ),
            contentLength=(int(content_length) if content_length is not None else None),
            contentHash=(str(data["contentHash"]) if data.get("contentHash") else None),
            textHash=(str(data["textHash"]) if data.get("textHash") else None),
            pageTitle=(str(data["pageTitle"]) if data.get("pageTitle") else None),
            section=(str(data["section"]) if data.get("section") else None),
            text=str(data.get("text") or ""),
            listItems=list_items,
            meta=meta,
        )


def cache_key(url: str) -> str:
    return (normalize_url(url) or url or "").strip()


def index_page_cache(
    entries: Iterable[PageCacheEntry] | None,
) -> dict[str, PageCacheEntry]:
    out: dict[str, PageCacheEntry] = {}
    for entry in entries or []:
        for key in (entry.url, entry.finalUrl):
            normalized = cache_key(key)
            if normalized:
                out[normalized] = entry
    return out


def entry_from_raw(
    raw: RawCapture,
    *,
    etag: str | None = None,
    last_modified: str | None = None,
    content_length: int | None = None,
    body_hash: str | None = None,
    reused: bool = False,
) -> PageCacheEntry:
    meta = dict(raw.meta or {})
    if reused:
        meta["reused"] = meta.get("reused") or "1"
    text = raw.text or ""
    return PageCacheEntry(
        url=raw.url,
        finalUrl=raw.url,
        fetchedAt=today_iso(),
        etag=etag or meta.get("etag") or None,
        lastModified=last_modified or meta.get("lastModified") or None,
        contentLength=content_length
        if content_length is not None
        else (
            int(meta["contentLength"])
            if meta.get("contentLength", "").isdigit()
            else None
        ),
        contentHash=body_hash or meta.get("contentHash") or None,
        textHash=content_hash(text) if text else None,
        pageTitle=raw.page_title,
        section=raw.section,
        text=text,
        listItems=list(raw.list_items or []),
        meta={k: v for k, v in meta.items() if k not in {"etag", "lastModified", "contentHash", "contentLength", "reused", "reuseReason"}},
    )


def raw_from_cache(entry: PageCacheEntry, *, reason: str) -> RawCapture | None:
    if not (entry.text or "").strip():
        return None
    meta = dict(entry.meta or {})
    meta["reused"] = "1"
    meta["reuseReason"] = reason
    if entry.etag:
        meta["etag"] = entry.etag
    if entry.lastModified:
        meta["lastModified"] = entry.lastModified
    if entry.contentHash:
        meta["contentHash"] = entry.contentHash
    if entry.contentLength is not None:
        meta["contentLength"] = str(entry.contentLength)
    return RawCapture(
        url=entry.finalUrl or entry.url,
        source_type="school-website",
        text=entry.text,
        page_title=entry.pageTitle,
        section=entry.section,
        meta=meta,
        list_items=list(entry.listItems or []),
    )


def record_freshness_date(record: QualitativeCaptureRecord) -> str:
    """Prefer verifiedAt (last change-detect pass), else assessedAt."""
    return (record.verifiedAt or record.assessedAt or "").strip()


def is_stale(record: QualitativeCaptureRecord, *, stale_days: int, today: date | None = None) -> bool:
    if stale_days <= 0:
        return False
    stamp = record_freshness_date(record)
    if not stamp:
        return True
    try:
        assessed = date.fromisoformat(stamp[:10])
    except ValueError:
        return True
    cutoff = (today or date.today()) - timedelta(days=stale_days)
    return assessed <= cutoff


def select_stale_urns(
    records: Iterable[QualitativeCaptureRecord],
    *,
    stale_days: int,
    limit: int,
    today: date | None = None,
) -> list[str]:
    """Oldest-first URNs whose capture is older than stale_days."""
    if stale_days <= 0 or limit <= 0:
        return []
    stale = [r for r in records if r.urn and is_stale(r, stale_days=stale_days, today=today)]
    stale.sort(key=lambda r: (record_freshness_date(r), r.urn))
    return [r.urn for r in stale[:limit]]


def preserve_narratives(
    prior: QualitativeCaptureRecord,
    fresh: QualitativeCaptureRecord,
) -> QualitativeCaptureRecord:
    """Keep accepted narratives when a refresh re-assesses areas."""
    prior_by_area = {a.area: a for a in prior.areas}
    for area in fresh.areas:
        old = prior_by_area.get(area.area)
        if not old:
            continue
        if (area.narrativeSummary or "").strip():
            continue
        if (old.narrativeSummary or "").strip():
            area.narrativeSummary = old.narrativeSummary
            area.synthesisMethod = old.synthesisMethod
    return fresh
