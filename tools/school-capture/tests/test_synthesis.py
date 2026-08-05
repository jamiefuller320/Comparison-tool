"""Tests for parent-facing narrative synthesis."""

from __future__ import annotations

from unittest.mock import patch

from school_capture.analysis.synthesis import (
    deterministic_parent_paragraph,
    llm_parent_paragraph,
    resolve_provider,
    synthesize_area,
    synthesize_record,
)
from school_capture.models import (
    QualitativeCaptureRecord,
    QualitativeSignal,
    SubjectAreaAssessment,
)


def _area(**kwargs) -> SubjectAreaAssessment:
    defaults = dict(
        area="enrichment",
        score=50,
        confidence=0.6,
        summary="Clubs and activities.",
        themes=["clubs"],
        offerings=["football", "choir", "homework club"],
        signals=[
            QualitativeSignal(
                text="After-school clubs include football and choir.",
                sourceUrl="https://school.example/clubs",
                sourceType="school-website",
                capturedAt="2026-08-05",
            ),
            QualitativeSignal(
                text="Breakfast club runs from 7:45am.",
                sourceUrl="https://school.example/wraparound",
                sourceType="school-website",
                capturedAt="2026-08-05",
            ),
        ],
    )
    defaults.update(kwargs)
    return SubjectAreaAssessment(**defaults)


def test_deterministic_lists_offerings():
    text = deterministic_parent_paragraph(_area())
    assert "football" in text
    assert "choir" in text


def test_deterministic_empty_area():
    text = deterministic_parent_paragraph(
        _area(offerings=[], signals=[], confidence=0.0, score=0)
    )
    assert "did not find much" in text.lower()


def test_synthesize_area_without_key_uses_deterministic():
    out = synthesize_area(_area(), use_llm=True, api_key=None)
    assert out.narrativeSummary
    assert out.synthesisMethod == "deterministic"


@patch("school_capture.analysis.synthesis._openai_chat")
def test_synthesize_area_uses_openai_when_valid(mock_chat):
    mock_chat.return_value = (
        "The school offers football and choir after school [1], with breakfast club from 7:45am [2]."
    )
    out = synthesize_area(
        _area(), use_llm=True, api_key="test-key", provider="openai"
    )
    assert out.synthesisMethod == "openai"
    assert "[1]" in out.narrativeSummary


@patch("school_capture.analysis.synthesis._openai_chat")
def test_llm_rejects_missing_citations(mock_chat):
    mock_chat.return_value = "The school has many clubs and activities."
    assert llm_parent_paragraph(_area(), api_key="test-key") is None


def test_synthesize_record_attaches_all_areas():
    record = QualitativeCaptureRecord(
        urn="116338",
        name="Test School",
        assessedAt="2026-08-05",
        areas=[_area(), _area(area="curriculum", offerings=["maths", "english"])],
    )
    out = synthesize_record(record, use_llm=False)
    assert len(out.areas) == 2
    assert all(a.narrativeSummary for a in out.areas)
    payload = out.to_dict()
    assert payload["areas"][0]["narrativeSummary"]


def test_resolve_provider_auto_prefers_cursor():
    resolved, key = resolve_provider(
        "auto", cursor_key="crsr_test", openai_key="sk-test"
    )
    assert resolved == "cursor"
    assert key == "crsr_test"


def test_resolve_provider_auto_falls_back_to_openai():
    resolved, key = resolve_provider("auto", cursor_key=None, openai_key="sk-test")
    assert resolved == "openai"
    assert key == "sk-test"


@patch("school_capture.analysis.synthesis._cursor_agent_prompt")
def test_cursor_synthesize_record_parses_json(mock_prompt):
    mock_prompt.return_value = json_blob = (
        '{\n'
        '  "enrichment": "The school offers football and choir after school [1], '
        'with breakfast club from 7:45am [2].",\n'
        '  "curriculum": "Maths and English are listed on the curriculum pages [1]."\n'
        "}"
    )
    assert "enrichment" in json_blob
    record = QualitativeCaptureRecord(
        urn="116338",
        name="Test School",
        assessedAt="2026-08-05",
        areas=[
            _area(),
            _area(
                area="curriculum",
                offerings=["maths", "english"],
                signals=[
                    QualitativeSignal(
                        text="We teach maths and English every day.",
                        sourceUrl="https://school.example/curriculum",
                        sourceType="school-website",
                        capturedAt="2026-08-05",
                    )
                ],
            ),
        ],
    )
    out = synthesize_record(
        record, use_llm=True, provider="cursor", api_key="crsr_test", model="composer-2.5"
    )
    assert out.areas[0].synthesisMethod == "cursor"
    assert "[1]" in (out.areas[0].narrativeSummary or "")
    mock_prompt.assert_called_once()


@patch("school_capture.analysis.synthesis._cursor_agent_prompt")
def test_cursor_falls_back_when_citations_invalid(mock_prompt):
    mock_prompt.return_value = '{"enrichment": "Lots of clubs with no citations."}'
    record = QualitativeCaptureRecord(
        urn="116338",
        name="Test School",
        assessedAt="2026-08-05",
        areas=[_area()],
    )
    out = synthesize_record(
        record, use_llm=True, provider="cursor", api_key="crsr_test"
    )
    assert out.areas[0].synthesisMethod == "deterministic"
