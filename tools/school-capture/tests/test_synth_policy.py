from school_capture.models import QualitativeCaptureRecord, QualitativeSignal, SubjectAreaAssessment
from school_capture.synth_policy import (
    evidence_priority,
    record_needs_synthesis,
    should_synthesize_record,
)


def _area(name: str, *, signals: int = 0, narrative: str | None = None) -> SubjectAreaAssessment:
    sigs = [
        QualitativeSignal(
            text=f"signal {i}",
            sourceUrl=f"https://example.test/{name}/{i}",
            sourceType="school-website",
            capturedAt="2026-08-06",
        )
        for i in range(signals)
    ]
    return SubjectAreaAssessment(
        area=name,
        score=50,
        confidence=0.5,
        summary="summary",
        signals=sigs,
        narrativeSummary=narrative,
        synthesisMethod="cursor" if narrative else None,
    )


def test_should_synthesize_requires_documented_areas():
    thin = QualitativeCaptureRecord(
        urn="1",
        name="Thin",
        assessedAt="2026-08-06",
        areas=[_area("curriculum", signals=0), _area("enrichment", signals=0)],
    )
    assert should_synthesize_record(thin) is False

    rich = QualitativeCaptureRecord(
        urn="2",
        name="Rich",
        assessedAt="2026-08-06",
        areas=[_area("curriculum", signals=2), _area("enrichment", signals=1)],
    )
    assert should_synthesize_record(rich) is True


def test_only_missing_skips_complete_records():
    done = QualitativeCaptureRecord(
        urn="3",
        name="Done",
        assessedAt="2026-08-06",
        areas=[
            _area("curriculum", signals=2, narrative="Already written [1]."),
            _area("enrichment", signals=2, narrative="Clubs listed [1]."),
        ],
    )
    assert record_needs_synthesis(done, only_missing=True) is False
    assert record_needs_synthesis(done, only_missing=False) is True


def test_evidence_priority_ranks_richer_schools_first():
    thin = QualitativeCaptureRecord(
        urn="1",
        name="Thin",
        assessedAt="2026-08-06",
        areas=[_area("curriculum", signals=1), _area("enrichment", signals=0)],
    )
    rich = QualitativeCaptureRecord(
        urn="2",
        name="Rich",
        assessedAt="2026-08-06",
        areas=[
            _area("curriculum", signals=3),
            _area("enrichment", signals=2),
            _area("ethos", signals=1),
            _area("send", signals=1),
        ],
    )
    ordered = sorted([thin, rich], key=evidence_priority)
    assert ordered[0].urn == "2"
