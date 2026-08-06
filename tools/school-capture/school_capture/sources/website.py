"""Crawl school websites for curriculum, enrichment, and ethos pages."""

from __future__ import annotations

import re
from urllib.parse import urlparse

from school_capture.filters import classify_page_type, is_blocked_url
from school_capture.html_sections import parse_structured_page
from school_capture.http_utils import normalize_url, safe_fetch_cached
from school_capture.models import SchoolInput
from school_capture.page_cache import PageCacheEntry, cache_key, raw_from_cache
from school_capture.section_patterns import SECTION_PATTERNS
from school_capture.sources.base import RawCapture, StructuredSection
from school_capture.url_discovery import discover_site_pages


class SchoolWebsiteAdapter:
    source_type = "school-website"

    def __init__(
        self,
        *,
        learned_terms: dict[str, int] | None = None,
        hub_spoke: bool = True,
        max_pages: int = 18,
        page_cache: dict[str, PageCacheEntry] | None = None,
        prior_discovered_urls: list[str] | None = None,
    ) -> None:
        self._learned_terms = learned_terms
        self._hub_spoke = hub_spoke
        self._max_pages = max_pages
        self._page_cache = page_cache or {}
        self._prior_discovered_urls = list(prior_discovered_urls or [])
        self.last_discovered_urls: list[str] = []
        self.last_page_entries: list[PageCacheEntry] = []
        self.last_reuse_count = 0
        self.last_fetch_count = 0

    def discover(self, school: SchoolInput) -> list[str]:
        root = normalize_url(school.schoolWebsite or "")
        if not root:
            return []
        prior_home = self._page_cache.get(cache_key(root))
        urls = discover_site_pages(
            root,
            learned_terms=self._learned_terms,
            hub_spoke=self._hub_spoke,
            max_pages=self._max_pages,
            prior_home=prior_home,
            prior_urls=self._prior_discovered_urls,
            page_cache=self._page_cache,
        )
        self.last_discovered_urls = list(urls)
        return urls

    def capture(
        self,
        school: SchoolInput,
        url: str,
        *,
        prior_page: PageCacheEntry | None = None,
    ) -> RawCapture | None:
        if is_blocked_url(url):
            return None
        prior = prior_page or self._page_cache.get(cache_key(url))
        result = safe_fetch_cached(
            url,
            etag=prior.etag if prior else None,
            last_modified=prior.lastModified if prior else None,
        )
        if not result.ok:
            return None

        if result.not_modified and prior:
            reused = raw_from_cache(prior, reason="http-304")
            if reused:
                self.last_reuse_count += 1
                entry = PageCacheEntry.from_dict(
                    {
                        **prior.to_dict(),
                        "fetchedAt": prior.fetchedAt,
                        "etag": result.etag or prior.etag,
                        "lastModified": result.last_modified or prior.lastModified,
                    }
                )
                self.last_page_entries.append(entry)
                return reused
            # 304 but no reusable text — fall through without validators.
            result = safe_fetch_cached(url)

        if (
            prior
            and result.content_hash
            and prior.contentHash
            and result.content_hash == prior.contentHash
            and prior.text
        ):
            reused = raw_from_cache(prior, reason="content-hash")
            if reused:
                self.last_reuse_count += 1
                entry = PageCacheEntry.from_dict(
                    {
                        **prior.to_dict(),
                        "etag": result.etag or prior.etag,
                        "lastModified": result.last_modified or prior.lastModified,
                        "contentLength": result.content_length or prior.contentLength,
                        "contentHash": result.content_hash,
                    }
                )
                self.last_page_entries.append(entry)
                return reused

        final = result.final_url
        html = result.text
        if not final or not html:
            return None
        if is_blocked_url(final):
            return None

        self.last_fetch_count += 1
        parsed = parse_structured_page(html)
        text = parsed.flat_text
        if len(text) < 40:
            return None

        title = parsed.title or school.name
        page_type = classify_page_type(final, title)
        section = self._infer_section(final, title)
        text = re.sub(r"\n{3,}", "\n\n", text)
        if len(text) > 14000:
            text = text[:14000]

        structured = [
            StructuredSection(
                heading=sec.heading,
                inferred_section=sec.inferred_section,
                paragraphs=sec.paragraphs,
                list_items=sec.list_items,
            )
            for sec in parsed.sections
            if sec.paragraphs or sec.list_items
        ]
        all_list_items: list[str] = []
        for sec in parsed.sections:
            all_list_items.extend(sec.list_items)
        all_list_items.extend(parsed.orphan_list_items)

        meta = {
            "pageType": page_type.value,
            "sectionCount": str(len(structured)),
            "listItemCount": str(len(all_list_items)),
        }
        if result.etag:
            meta["etag"] = result.etag
        if result.last_modified:
            meta["lastModified"] = result.last_modified
        if result.content_hash:
            meta["contentHash"] = result.content_hash
        if result.content_length is not None:
            meta["contentLength"] = str(result.content_length)

        raw = RawCapture(
            url=final,
            source_type=self.source_type,
            text=text,
            page_title=title,
            section=section,
            meta=meta,
            structured_sections=structured,
            list_items=all_list_items,
        )
        from school_capture.page_cache import entry_from_raw

        self.last_page_entries.append(
            entry_from_raw(
                raw,
                etag=result.etag,
                last_modified=result.last_modified,
                content_length=result.content_length,
                body_hash=result.content_hash,
            )
        )
        return raw

    def _infer_section(self, url: str, title: str) -> str:
        blob = f"{url} {title}".lower()
        best = "general"
        best_score = 0
        for section, patterns in SECTION_PATTERNS.items():
            score = sum(1 for p in patterns if p in blob)
            if score > best_score:
                best_score = score
                best = section
        path = urlparse(url).path.lower()
        if path in ("", "/"):
            return "homepage"
        return best
