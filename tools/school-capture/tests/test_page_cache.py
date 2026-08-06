"""Change-aware page cache + stale refresh selection."""

from __future__ import annotations

from datetime import date
from unittest.mock import patch

from school_capture.http_utils import FetchResult
from school_capture.models import (
    QualitativeCaptureRecord,
    QualitativeSignal,
    SubjectAreaAssessment,
    today_iso,
)
from school_capture.page_cache import (
    PageCacheEntry,
    content_hash,
    is_stale,
    preserve_narratives,
    raw_from_cache,
    select_stale_urns,
)
from school_capture.sources.website import SchoolWebsiteAdapter


def test_content_hash_stable():
    assert content_hash(b"abc") == content_hash("abc")
    assert content_hash(b"abc") != content_hash(b"abd")


def test_raw_from_cache_marks_reuse():
    entry = PageCacheEntry(
        url="https://school.example/curriculum",
        finalUrl="https://school.example/curriculum",
        text="A broad and balanced curriculum for all pupils across the school.",
        pageTitle="Curriculum",
        section="curriculum",
        etag='"v1"',
        contentHash="abc",
    )
    raw = raw_from_cache(entry, reason="http-304")
    assert raw is not None
    assert raw.meta["reused"] == "1"
    assert raw.meta["reuseReason"] == "http-304"
    assert "broad and balanced" in raw.text


def test_select_stale_urns_oldest_first():
    records = [
        QualitativeCaptureRecord(
            urn="1", name="A", assessedAt="2026-07-01", verifiedAt="2026-07-01"
        ),
        QualitativeCaptureRecord(
            urn="2", name="B", assessedAt="2026-08-01", verifiedAt="2026-08-01"
        ),
        QualitativeCaptureRecord(
            urn="3", name="C", assessedAt="2026-06-01", verifiedAt="2026-06-01"
        ),
        QualitativeCaptureRecord(
            urn="4", name="D", assessedAt="2026-08-05", verifiedAt="2026-08-05"
        ),
    ]
    today = date(2026, 8, 6)
    assert is_stale(records[0], stale_days=28, today=today)
    assert not is_stale(records[3], stale_days=28, today=today)
    urns = select_stale_urns(records, stale_days=28, limit=2, today=today)
    assert urns == ["3", "1"]


def test_preserve_narratives_keeps_prior_cursor_text():
    prior = QualitativeCaptureRecord(
        urn="1",
        name="A",
        assessedAt="2026-07-01",
        areas=[
            SubjectAreaAssessment(
                area="curriculum",
                score=50,
                confidence=0.5,
                summary="old",
                narrativeSummary="Parent-facing curriculum note [1].",
                synthesisMethod="cursor",
                signals=[
                    QualitativeSignal(
                        text="Maths is taught daily.",
                        sourceUrl="https://school.example/curriculum",
                        sourceType="school-website",
                        capturedAt="2026-07-01",
                    )
                ],
            )
        ],
    )
    fresh = QualitativeCaptureRecord(
        urn="1",
        name="A",
        assessedAt=today_iso(),
        areas=[
            SubjectAreaAssessment(
                area="curriculum",
                score=55,
                confidence=0.6,
                summary="new",
                signals=prior.areas[0].signals,
            )
        ],
    )
    merged = preserve_narratives(prior, fresh)
    assert merged.areas[0].narrativeSummary.startswith("Parent-facing")
    assert merged.areas[0].synthesisMethod == "cursor"


def test_website_capture_reuses_on_304():
    prior = PageCacheEntry(
        url="https://school.example/curriculum",
        finalUrl="https://school.example/curriculum",
        text="Pupils study a broad curriculum including maths and reading every day.",
        pageTitle="Curriculum",
        section="curriculum",
        etag='"abc"',
        contentHash="deadbeef",
    )
    adapter = SchoolWebsiteAdapter(page_cache={prior.url: prior}, hub_spoke=False)
    with patch(
        "school_capture.sources.website.safe_fetch_cached",
        return_value=FetchResult(
            ok=True,
            final_url=prior.url,
            status=304,
            etag='"abc"',
            not_modified=True,
        ),
    ):
        from school_capture.models import SchoolInput

        raw = adapter.capture(
            SchoolInput(urn="1", name="Test", schoolWebsite="https://school.example"),
            prior.url,
            prior_page=prior,
        )
    assert raw is not None
    assert raw.meta["reuseReason"] == "http-304"
    assert adapter.last_reuse_count == 1
    assert adapter.last_fetch_count == 0


def test_website_capture_reuses_on_matching_content_hash():
    body = b"<html><body><main><p>Pupils study a broad curriculum including maths and reading every day at this school.</p></main></body></html>"
    digest = content_hash(body)
    prior = PageCacheEntry(
        url="https://school.example/curriculum",
        finalUrl="https://school.example/curriculum",
        text="Pupils study a broad curriculum including maths and reading every day at this school.",
        pageTitle="Curriculum",
        section="curriculum",
        contentHash=digest,
    )
    adapter = SchoolWebsiteAdapter(hub_spoke=False)
    with patch(
        "school_capture.sources.website.safe_fetch_cached",
        return_value=FetchResult(
            ok=True,
            final_url=prior.url,
            status=200,
            body=body,
            text=body.decode(),
            content_hash=digest,
            content_length=len(body),
        ),
    ):
        from school_capture.models import SchoolInput

        raw = adapter.capture(
            SchoolInput(urn="1", name="Test", schoolWebsite="https://school.example"),
            prior.url,
            prior_page=prior,
        )
    assert raw is not None
    assert raw.meta["reuseReason"] == "content-hash"
    assert adapter.last_reuse_count == 1


def test_engine_short_circuits_when_all_pages_reused():
    from school_capture.engine import CaptureEngine
    from school_capture.models import SchoolInput

    prior_entry = PageCacheEntry(
        url="https://school.example/",
        finalUrl="https://school.example/",
        text="Welcome to our school with a broad curriculum for every pupil.",
        pageTitle="Home",
        section="homepage",
        etag='"home"',
        contentHash="h1",
    )
    prior = QualitativeCaptureRecord(
        urn="9",
        name="Test School",
        assessedAt="2026-07-01",
        verifiedAt="2026-07-01",
        sourcesScanned=1,
        sourceTypes=["school-website"],
        areas=[
            SubjectAreaAssessment(
                area="curriculum",
                score=40,
                confidence=0.4,
                summary="Prior summary",
                narrativeSummary="Kept narrative.",
                synthesisMethod="none",
            )
        ],
        discoveredUrls=["https://school.example/"],
        pageCache=[prior_entry.to_dict()],
        captureNotes=["first capture"],
    )
    website = SchoolWebsiteAdapter(
        page_cache={prior_entry.url: prior_entry},
        prior_discovered_urls=prior.discoveredUrls,
        hub_spoke=False,
    )
    engine = CaptureEngine(adapters=[website], learned_terms=None)

    with patch(
        "school_capture.url_discovery.safe_fetch_cached",
        return_value=FetchResult(
            ok=True, final_url=prior_entry.url, status=304, etag='"home"', not_modified=True
        ),
    ), patch(
        "school_capture.sources.website.safe_fetch_cached",
        return_value=FetchResult(
            ok=True, final_url=prior_entry.url, status=304, etag='"home"', not_modified=True
        ),
    ):
        record = engine.capture_school(
            SchoolInput(
                urn="9",
                name="Test School",
                schoolWebsite="https://school.example/",
            ),
            prior=prior,
        )

    assert record.assessedAt == "2026-07-01"
    assert record.verifiedAt == today_iso()
    assert record.areas[0].narrativeSummary == "Kept narrative."
    assert any("unchanged" in n.lower() for n in record.captureNotes)
