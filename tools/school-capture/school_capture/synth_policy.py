"""Gates for when LLM / Cursor synthesis is worth running."""

from __future__ import annotations

from school_capture.models import QualitativeCaptureRecord, SubjectAreaAssessment

# At least this many areas must have usable scan evidence before spending an
# agent turn on the whole school.
DEFAULT_MIN_DOCUMENTED_AREAS = 2
DEFAULT_MIN_SIGNALS = 1


def area_has_evidence(
    area: SubjectAreaAssessment,
    *,
    min_signals: int = DEFAULT_MIN_SIGNALS,
) -> bool:
    signals = area.signals or []
    offerings = area.offerings or []
    if len(signals) >= min_signals:
        return True
    if offerings:
        return True
    return False


def documented_area_count(
    record: QualitativeCaptureRecord,
    *,
    min_signals: int = DEFAULT_MIN_SIGNALS,
) -> int:
    return sum(
        1 for area in record.areas if area_has_evidence(area, min_signals=min_signals)
    )


def should_synthesize_record(
    record: QualitativeCaptureRecord,
    *,
    min_documented_areas: int = DEFAULT_MIN_DOCUMENTED_AREAS,
    min_signals: int = DEFAULT_MIN_SIGNALS,
) -> bool:
    """True when the school has enough scan evidence to justify synthesis."""
    return (
        documented_area_count(record, min_signals=min_signals) >= min_documented_areas
    )


def area_needs_narrative(
    area: SubjectAreaAssessment,
    *,
    only_missing: bool = True,
    min_signals: int = DEFAULT_MIN_SIGNALS,
) -> bool:
    """True when this area should receive a (re)generated narrative."""
    if not area_has_evidence(area, min_signals=min_signals):
        return False
    if only_missing and (area.narrativeSummary or "").strip():
        return False
    return True


def record_needs_synthesis(
    record: QualitativeCaptureRecord,
    *,
    only_missing: bool = True,
    min_documented_areas: int = DEFAULT_MIN_DOCUMENTED_AREAS,
    min_signals: int = DEFAULT_MIN_SIGNALS,
) -> bool:
    if not should_synthesize_record(
        record,
        min_documented_areas=min_documented_areas,
        min_signals=min_signals,
    ):
        return False
    if not only_missing:
        return True
    return any(
        area_needs_narrative(area, only_missing=True, min_signals=min_signals)
        for area in record.areas
    )
