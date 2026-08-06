from pathlib import Path

from school_capture.models import QualitativeCaptureRecord, SubjectAreaAssessment
from school_capture.sidecar import existing_urns, upsert_records


def test_upsert_merges_by_urn(tmp_path: Path):
    path = tmp_path / "capture.json"
    first = QualitativeCaptureRecord(
        urn="100",
        name="Alpha",
        assessedAt="2026-08-01",
        areas=[
            SubjectAreaAssessment(
                area="curriculum",
                score=10,
                confidence=0.2,
                summary="a",
            )
        ],
    )
    upsert_records(path, [first])
    assert existing_urns(path) == {"100"}

    second = QualitativeCaptureRecord(
        urn="200",
        name="Beta",
        assessedAt="2026-08-02",
        areas=[],
    )
    updated_first = QualitativeCaptureRecord(
        urn="100",
        name="Alpha Updated",
        assessedAt="2026-08-03",
        areas=first.areas,
    )
    index = upsert_records(path, [second, updated_first])
    assert index.schoolCount == 2
    by_urn = {r.urn: r for r in index.records}
    assert by_urn["100"].name == "Alpha Updated"
    assert by_urn["200"].name == "Beta"
