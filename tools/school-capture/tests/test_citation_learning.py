"""Citation-validated URL learning from Cursor narratives."""

from __future__ import annotations

from school_capture.analysis.synthesis import cited_source_urls, synthesize_record
from school_capture.citation_learning import learn_from_record
from school_capture.models import (
    QualitativeCaptureRecord,
    QualitativeSignal,
    SubjectAreaAssessment,
)
from unittest.mock import patch


def _area(**kwargs) -> SubjectAreaAssessment:
    defaults = dict(
        area="enrichment",
        score=50,
        confidence=0.6,
        summary="Clubs",
        themes=["clubs"],
        offerings=["football", "choir"],
        signals=[
            QualitativeSignal(
                text="After-school clubs include football and choir.",
                sourceUrl="https://school.example/clubs-and-activities",
                sourceType="school-website",
                capturedAt="2026-08-06",
                pageTitle="Clubs",
            ),
            QualitativeSignal(
                text="Breakfast club runs from 7:45am.",
                sourceUrl="https://school.example/wraparound-care",
                sourceType="school-website",
                capturedAt="2026-08-06",
                pageTitle="Wraparound",
            ),
        ],
        narrativeSummary=(
            "The school offers football and choir after school [1], "
            "with breakfast club from 7:45am [2]."
        ),
        synthesisMethod="cursor",
    )
    defaults.update(kwargs)
    return SubjectAreaAssessment(**defaults)


def test_cited_source_urls_maps_markers():
    urls = cited_source_urls(_area())
    assert urls == [
        "https://school.example/clubs-and-activities",
        "https://school.example/wraparound-care",
    ]


def test_learn_from_record_boosts_cited_paths():
    store: dict[str, int] = {}
    record = QualitativeCaptureRecord(
        urn="116338",
        name="Test School",
        assessedAt="2026-08-06",
        areas=[_area()],
    )
    events = learn_from_record(store, record)
    assert events == 2
    assert any("clubs" in term or "activities" in term for term in store)
    assert any("wraparound" in term or "care" in term for term in store)


@patch("school_capture.analysis.synthesis._cursor_agent_prompt")
def test_only_missing_preserves_cursor_and_fills_gap(mock_prompt):
    mock_prompt.return_value = (
        '{"curriculum": "Maths and English are described on the curriculum page [1]."}'
    )
    existing = _area()
    missing = SubjectAreaAssessment(
        area="curriculum",
        score=40,
        confidence=0.5,
        summary="Curriculum",
        themes=[],
        offerings=["maths", "english"],
        signals=[
            QualitativeSignal(
                text="We teach maths and English every day.",
                sourceUrl="https://school.example/curriculum",
                sourceType="school-website",
                capturedAt="2026-08-06",
            )
        ],
    )
    record = QualitativeCaptureRecord(
        urn="116338",
        name="Test School",
        assessedAt="2026-08-06",
        areas=[existing, missing],
    )
    out = synthesize_record(
        record,
        use_llm=True,
        provider="cursor",
        api_key="crsr_test",
        only_missing=True,
        preserve_llm=True,
    )
    by_area = {a.area: a for a in out.areas}
    assert by_area["enrichment"].synthesisMethod == "cursor"
    assert by_area["enrichment"].narrativeSummary == existing.narrativeSummary
    assert by_area["curriculum"].synthesisMethod == "cursor"
    assert "[1]" in (by_area["curriculum"].narrativeSummary or "")
    # Prompt should only include the missing area payload.
    prompt = mock_prompt.call_args.kwargs["prompt"]
    assert '"area": "curriculum"' in prompt
    assert '"area": "enrichment"' not in prompt


@patch("school_capture.analysis.synthesis._cursor_agent_prompt")
def test_preserve_llm_keeps_cursor_when_rewrite_fails(mock_prompt):
    mock_prompt.return_value = '{"enrichment": "Clubs with no citations at all."}'
    existing = _area()
    record = QualitativeCaptureRecord(
        urn="116338",
        name="Test School",
        assessedAt="2026-08-06",
        areas=[existing],
    )
    out = synthesize_record(
        record,
        use_llm=True,
        provider="cursor",
        api_key="crsr_test",
        only_missing=False,
        preserve_llm=True,
    )
    assert out.areas[0].synthesisMethod == "cursor"
    assert out.areas[0].narrativeSummary == existing.narrativeSummary
