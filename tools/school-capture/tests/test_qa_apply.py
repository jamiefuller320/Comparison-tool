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
    assert not any((s.text or "") == "Ofsted Report" for s in send.signals)
    assert any("QA heuristic" in n for n in (updated.captureNotes or []))

    events = learning_events_from_suspect(suspect)
    phrases = {e["phrase"].lower() for e in events}
    assert "ofsted report" in phrases
    assert "parent view" in phrases


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
