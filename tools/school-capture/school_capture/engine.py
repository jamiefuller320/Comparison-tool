"""Orchestrates source adapters and area assessment."""

from __future__ import annotations

from dataclasses import dataclass, field

from school_capture.analysis.assessor import assess_captures, dedupe_captures
from school_capture.learned_terms import update_learned_terms
from school_capture.models import (
    ENGINE_VERSION,
    QualitativeCaptureRecord,
    SchoolInput,
    today_iso,
)
from school_capture.page_cache import (
    PageCacheEntry,
    cache_key,
    entry_from_raw,
    index_page_cache,
    preserve_narratives,
)
from school_capture.sources.base import RawCapture, SourceAdapter
from school_capture.sources import default_adapters
from school_capture.sources.documents import SchoolDocumentsAdapter
from school_capture.sources.website import SchoolWebsiteAdapter


@dataclass
class CaptureEngine:
    adapters: list[SourceAdapter] = field(default_factory=default_adapters)
    max_urls_per_adapter: int = 18
    learned_terms: dict[str, int] | None = None

    def capture_school(
        self,
        school: SchoolInput,
        *,
        prior: QualitativeCaptureRecord | None = None,
    ) -> QualitativeCaptureRecord:
        notes: list[str] = []
        captures: list[RawCapture] = []
        source_types: set[str] = set()
        document_inventory: list[dict[str, str]] = []
        seen_doc_urls: set[str] = set()
        page_entries: list[PageCacheEntry] = []
        discovered_urls: list[str] = []
        reuse_count = 0
        fetch_count = 0

        prior_cache = index_page_cache(
            [PageCacheEntry.from_dict(row) for row in (prior.pageCache if prior else [])]
        )

        # Rebuild website adapter with this school's prior cache for conditional GETs.
        adapters = list(self.adapters)
        for i, adapter in enumerate(adapters):
            if isinstance(adapter, SchoolWebsiteAdapter):
                adapters[i] = SchoolWebsiteAdapter(
                    learned_terms=adapter._learned_terms,
                    hub_spoke=adapter._hub_spoke,
                    max_pages=adapter._max_pages,
                    page_cache=prior_cache,
                    prior_discovered_urls=list(prior.discoveredUrls) if prior else [],
                )

        for adapter in adapters:
            urls = adapter.discover(school)[: self.max_urls_per_adapter]
            if isinstance(adapter, SchoolWebsiteAdapter):
                discovered_urls = list(adapter.last_discovered_urls or urls)
            if not urls and adapter.source_type != "school-document":
                notes.append(f"No URLs discovered for {adapter.source_type}.")
                continue
            got = 0
            for url in urls:
                if isinstance(adapter, SchoolWebsiteAdapter):
                    raw = adapter.capture(
                        school,
                        url,
                        prior_page=prior_cache.get(cache_key(url)),
                    )
                else:
                    raw = adapter.capture(school, url)
                if raw:
                    captures.append(raw)
                    source_types.add(adapter.source_type)
                    got += 1
            if isinstance(adapter, SchoolWebsiteAdapter):
                page_entries.extend(adapter.last_page_entries)
                reuse_count += adapter.last_reuse_count
                fetch_count += adapter.last_fetch_count
            if isinstance(adapter, SchoolDocumentsAdapter):
                for row in adapter.last_inventory:
                    u = row.get("url", "")
                    if u and u not in seen_doc_urls:
                        seen_doc_urls.add(u)
                        document_inventory.append(row)
            elif got == 0 and urls:
                notes.append(
                    f"Fetched {len(urls)} {adapter.source_type} URL(s) but no usable text."
                )

        if reuse_count:
            notes.append(
                f"Reused {reuse_count} unchanged page(s) via validators/hash "
                f"({fetch_count} re-parsed)."
            )

        # All website pages unchanged and we have a prior assessment → skip re-assess.
        website_captures = [c for c in captures if c.source_type == "school-website"]
        all_reused = bool(website_captures) and all(
            (c.meta or {}).get("reused") == "1" for c in website_captures
        )
        non_website = [c for c in captures if c.source_type != "school-website"]
        if prior and all_reused and not non_website:
            verified = today_iso()
            notes = list(prior.captureNotes or []) + [
                n for n in notes if n not in (prior.captureNotes or [])
            ]
            notes.append(f"Change-detect verified unchanged on {verified}.")
            return QualitativeCaptureRecord(
                urn=prior.urn or school.urn,
                name=prior.name or school.name,
                assessedAt=prior.assessedAt,
                engineVersion=ENGINE_VERSION,
                sourcesScanned=prior.sourcesScanned,
                sourceTypes=list(prior.sourceTypes),
                areas=list(prior.areas),
                captureNotes=notes,
                documentsDiscovered=prior.documentsDiscovered,
                documentsExtracted=prior.documentsExtracted,
                documentInventory=list(prior.documentInventory),
                verifiedAt=verified,
                discoveredUrls=discovered_urls or list(prior.discoveredUrls),
                pageCache=[e.to_dict() for e in page_entries]
                or list(prior.pageCache),
            )

        captures = dedupe_captures(captures)
        areas = assess_captures(captures)
        if self.learned_terms is not None:
            for area in areas:
                signal_count = len(area.signals)
                if signal_count <= 0:
                    continue
                for signal in area.signals:
                    if signal.sourceType != "school-website":
                        continue
                    # Don't learn from reused pages — they already contributed.
                    if any(
                        (c.url == signal.sourceUrl and (c.meta or {}).get("reused") == "1")
                        for c in captures
                    ):
                        continue
                    update_learned_terms(
                        self.learned_terms,
                        url=signal.sourceUrl,
                        area=area.area,
                        signal_count=signal_count,
                        urn=school.urn,
                    )
        docs_extracted = sum(1 for d in document_inventory if d.get("status") == "extracted")

        if not page_entries:
            # Backfill cache from fresh website captures when adapter didn't record.
            for raw in captures:
                if raw.source_type == "school-website":
                    page_entries.append(entry_from_raw(raw))

        record = QualitativeCaptureRecord(
            urn=school.urn,
            name=school.name,
            assessedAt=today_iso(),
            engineVersion=ENGINE_VERSION,
            sourcesScanned=len(captures),
            sourceTypes=sorted(source_types),
            areas=areas,
            captureNotes=notes,
            documentsDiscovered=len(document_inventory),
            documentsExtracted=docs_extracted,
            documentInventory=document_inventory,
            verifiedAt=today_iso(),
            discoveredUrls=discovered_urls,
            pageCache=[e.to_dict() for e in page_entries],
        )
        if prior:
            record = preserve_narratives(prior, record)
        return record
