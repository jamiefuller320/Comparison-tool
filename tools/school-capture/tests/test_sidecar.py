from pathlib import Path

from school_capture.models import QualitativeCaptureRecord, SubjectAreaAssessment
from school_capture.sidecar import (
    assemble_capture_from_shards,
    ensure_capture_sidecar,
    existing_urns,
    upsert_records,
)


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


def test_assemble_and_ensure_capture_from_shards(tmp_path: Path):
    shards = tmp_path / "shards"
    shards.mkdir()
    capture = tmp_path / "capture.json"

    first = QualitativeCaptureRecord(
        urn="100001",
        name="Alpha School",
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
    second = QualitativeCaptureRecord(
        urn="100002",
        name="Beta School",
        assessedAt="2026-08-02",
        areas=[],
    )
    (shards / "100001.json").write_text(
        __import__("json").dumps(first.to_dict(), separators=(",", ":")),
        encoding="utf-8",
    )
    (shards / "100002.json").write_text(
        __import__("json").dumps(second.to_dict(), separators=(",", ":")),
        encoding="utf-8",
    )
    # Non-URN junk file should be ignored.
    (shards / "manifest.json").write_text("{}", encoding="utf-8")

    index = assemble_capture_from_shards(shards, capture)
    assert index.schoolCount == 2
    assert {r.urn for r in index.records} == {"100001", "100002"}
    assert capture.is_file()

    # Idempotent when already complete.
    again = ensure_capture_sidecar(capture, shards)
    assert again["hydrated"] is False
    assert again["schoolCount"] == 2

    # Missing sidecar rehydrates.
    capture.unlink()
    hydrated = ensure_capture_sidecar(capture, shards)
    assert hydrated["hydrated"] is True
    assert hydrated["schoolCount"] == 2
    assert capture.is_file()

    # Stale sidecar (fewer records than shards) rehydrates.
    capture.write_text(
        __import__("json").dumps(
            {
                "generatedAt": "2026-08-01",
                "engineVersion": "0.7.5",
                "schoolCount": 1,
                "records": [first.to_dict()],
                "stats": {},
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    assert len(existing_urns(capture)) == 1
    refreshed = ensure_capture_sidecar(capture, shards)
    assert refreshed["hydrated"] is True
    assert refreshed["schoolCount"] == 2
