"""Deterministic qualitative QA ranking and findings."""

from __future__ import annotations

from school_capture.models import (
    QualitativeCaptureRecord,
    QualitativeSignal,
    SubjectAreaAssessment,
)
from school_capture.qa_heuristics import heuristic_area_findings, rank_suspects


def _signal(text: str) -> QualitativeSignal:
    return QualitativeSignal(
        text=text,
        sourceUrl="https://school.example/page",
        sourceType="school-website",
        capturedAt="2026-08-01",
        pageTitle="Page",
    )


def _area(
    area: str,
    *,
    offerings: list[str] | None = None,
    narrative: str | None = None,
    signals: list[QualitativeSignal] | None = None,
    score: int = 70,
) -> SubjectAreaAssessment:
    return SubjectAreaAssessment(
        area=area,
        score=score,
        confidence=0.6,
        summary=f"{area} summary",
        offerings=offerings or [],
        signals=signals or [],
        narrativeSummary=narrative,
        synthesisMethod="deterministic" if narrative else None,
    )


def test_chrome_offerings_produce_strip_finding():
    area = _area(
        "send",
        offerings=["Ofsted Report", "Parent View", "Zones of Regulation"],
    )
    findings = heuristic_area_findings(area)
    assert findings
    assert any(f.action == "strip" for f in findings)
    classes = {f.junkClass for f in findings}
    assert "chrome" in classes or "policy_toc" in classes


def test_admissions_marketing_stripped_from_enrichment():
    tip = (
        "Stay & Play sessions help new starters settle in before Year R 2026. "
        "We warmly welcome visits from families who have not yet applied for a place."
    )
    area = _area(
        "enrichment",
        narrative=tip,
        signals=[_signal(tip)],
    )
    findings = heuristic_area_findings(area)
    assert any(f.junkClass == "admissions" and f.action == "strip" for f in findings)


def test_policy_boilerplate_ethos_stripped():
    area = _area(
        "ethos",
        narrative="By creating this policy we aim to set out staff expectations.",
        offerings=["Safeguarding", "Code of Conduct", "Whistleblowing"],
    )
    findings = heuristic_area_findings(area)
    assert any(
        f.junkClass in {"policy_boilerplate", "policy_toc", "chrome"} for f in findings
    )


def test_long_prose_signals_are_not_treated_as_chrome():
    area = _area(
        "enrichment",
        offerings=["Football club", "Choir"],
        narrative="Pupils can join football and choir after school.",
        signals=[
            _signal(
                "We enable students to apply their school-based learning outside "
                "the classroom through trips and clubs."
            )
        ],
    )
    findings = heuristic_area_findings(area)
    assert not any(f.junkClass == "chrome" for f in findings)


def test_send_need_labels_are_not_junk_offerings():
    area = _area(
        "send",
        offerings=[
            "Cognition & Learning:",
            "Communication and Interaction:",
            "Ofsted Report",
        ],
    )
    findings = heuristic_area_findings(area)
    excerpts = []
    for f in findings:
        excerpts.extend(f.offendingExcerpts)
    assert "Ofsted Report" in excerpts
    assert not any("cognition" in e.lower() for e in excerpts)


def test_rank_suspects_orders_worst_first():
    clean = QualitativeCaptureRecord(
        urn="1",
        name="Clean School",
        assessedAt="2026-08-01",
        areas=[
            _area(
                "enrichment",
                offerings=["Football club", "Choir"],
                narrative="Pupils can join football and choir after school.",
                signals=[_signal("Football club runs on Tuesdays for pupils.")],
            )
        ],
    )
    junk = QualitativeCaptureRecord(
        urn="2",
        name="Junk School",
        assessedAt="2026-08-01",
        areas=[
            _area(
                "enrichment",
                offerings=["Ofsted Report", "Parent View"],
                narrative="Stay & Play for new starters who have not yet applied for a place.",
                signals=[_signal("Ofsted Report")],
            ),
            _area(
                "ethos",
                narrative="By creating this policy the governors set expectations.",
                offerings=["Manual of Personnel Practice"],
            ),
        ],
    )
    ranked = rank_suspects([clean, junk], limit=5, min_score=1.0)
    assert ranked
    assert ranked[0].urn == "2"
    assert ranked[0].findings
