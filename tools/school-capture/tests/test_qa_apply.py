"""Apply QA strip/thin findings and rebuild honest narratives."""

from __future__ import annotations

from school_capture.models import (
    QualitativeCaptureRecord,
    QualitativeSignal,
    SubjectAreaAssessment,
)
from school_capture.qa_apply import apply_suspect_findings, learning_events_from_suspect
from school_capture.qa_heuristics import AreaQaFinding, SchoolQaSuspect


def test_strip_removes_chrome_offerings_and_learns_phrases():
    record = QualitativeCaptureRecord(
        urn="116277",
        name="Test Primary",
        assessedAt="2026-08-01",
        areas=[
            SubjectAreaAssessment(
                area="send",
                score=75,
                confidence=0.7,
                summary="SEND",
                offerings=["Ofsted Report", "Parent View", "Zones of Regulation"],
                signals=[
                    QualitativeSignal(
                        text="Ofsted Report",
                        sourceUrl="https://school.example/",
                        sourceType="school-website",
                        capturedAt="2026-08-01",
                    )
                ],
                narrativeSummary="Ofsted Report links sit in the footer.",
                synthesisMethod="deterministic",
            )
        ],
    )
    suspect = SchoolQaSuspect(
        urn=record.urn,
        name=record.name,
        score=9.0,
        flags=["chrome"],
        findings=[
            AreaQaFinding(
                area="send",
                action="strip",
                reason="Chrome offerings",
                junkClass="chrome",
                offendingExcerpts=["Ofsted Report", "Parent View"],
            )
        ],
    )
    updated, changes = apply_suspect_findings(record, suspect)
    assert changes == 1
    send = next(a for a in updated.areas if a.area == "send")
    assert "Ofsted Report" not in send.offerings
    assert "Parent View" not in send.offerings
    assert "Zones of Regulation" in send.offerings
    # One surviving offering is thin, so the inflated score is capped.
    assert send.score == 40
    assert send.confidence == 0.4
    assert not any((s.text or "") == "Ofsted Report" for s in send.signals)
    assert any("QA heuristic" in n for n in (updated.captureNotes or []))

    events = learning_events_from_suspect(suspect)
    phrases = {e["phrase"].lower() for e in events}
    assert "ofsted report" in phrases
    assert "parent view" in phrases


def test_strip_keeps_score_when_several_offerings_remain():
    record = QualitativeCaptureRecord(
        urn="148724",
        name="Stafford Junior",
        assessedAt="2026-11-08",
        areas=[
            SubjectAreaAssessment(
                area="ethos",
                score=78,
                confidence=0.8,
                summary=(
                    "Strong publicly visible evidence for ethos and values "
                    "(4 specific items). Listed provision includes respect, "
                    "vision, mission, resilience."
                ),
                offerings=["respect", "vision", "mission", "resilience", "Term Dates"],
                signals=[
                    QualitativeSignal(
                        text="Term Dates",
                        sourceUrl="https://stafford.example/vision",
                        sourceType="school-website",
                        capturedAt="2026-11-08",
                    )
                ],
                narrativeSummary="The school website lists respect, vision, mission and resilience.",
                synthesisMethod="deterministic",
            )
        ],
    )
    suspect = SchoolQaSuspect(
        urn=record.urn,
        name=record.name,
        score=3.0,
        flags=["chrome"],
        findings=[
            AreaQaFinding(
                area="ethos",
                action="strip",
                reason="Chrome signal",
                junkClass="chrome",
                offendingExcerpts=["Term Dates"],
            )
        ],
    )
    updated, changes = apply_suspect_findings(record, suspect)
    assert changes == 1
    ethos = updated.areas[0]
    assert ethos.offerings == ["respect", "vision", "mission", "resilience"]
    assert ethos.score == 78
    assert ethos.confidence == 0.8
    assert ethos.summary.startswith("Strong publicly visible evidence")


def test_thin_remainder_rewrites_strong_summary():
    record = QualitativeCaptureRecord(
        urn="1",
        name="Thin Ethos",
        assessedAt="2026-11-08",
        areas=[
            SubjectAreaAssessment(
                area="ethos",
                score=80,
                confidence=0.9,
                summary="Strong publicly visible evidence for ethos and values (1 specific item).",
                offerings=["vision", "Contact Details"],
                signals=[],
                narrativeSummary="Values.",
                synthesisMethod="deterministic",
            )
        ],
    )
    suspect = SchoolQaSuspect(
        urn="1",
        name="Thin Ethos",
        score=3.0,
        findings=[
            AreaQaFinding(
                area="ethos",
                action="strip",
                reason="Chrome offering",
                junkClass="chrome",
                offendingExcerpts=["Contact Details"],
            )
        ],
    )
    updated, _changes = apply_suspect_findings(record, suspect)
    ethos = updated.areas[0]
    assert ethos.offerings == ["vision"]
    assert ethos.score == 40
    assert ethos.summary.startswith("Moderate publicly visible evidence")


def test_thin_clears_mid_sentence_fragment():
    record = QualitativeCaptureRecord(
        urn="1",
        name="Fragment School",
        assessedAt="2026-08-01",
        areas=[
            SubjectAreaAssessment(
                area="ethos",
                score=60,
                confidence=0.5,
                summary="Ethos",
                offerings=[],
                signals=[],
                narrativeSummary="by creating this policy we hope staff will…",
                synthesisMethod="deterministic",
            )
        ],
    )
    suspect = SchoolQaSuspect(
        urn="1",
        name="Fragment School",
        score=4.0,
        findings=[
            AreaQaFinding(
                area="ethos",
                action="thin",
                reason="Mid-sentence fragment",
                junkClass="boilerplate",
                offendingExcerpts=["by creating this policy we hope staff will…"],
            )
        ],
    )
    updated, changes = apply_suspect_findings(record, suspect)
    assert changes == 1
    ethos = updated.areas[0]
    assert ethos.synthesisMethod == "deterministic"
    # Thin wipe → honest empty / little-evidence narrative
    assert ethos.narrativeSummary
    assert "by creating this policy" not in (ethos.narrativeSummary or "").lower()
