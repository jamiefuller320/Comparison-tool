"""Apply qualitative QA findings to capture records."""

from __future__ import annotations

from dataclasses import replace

from school_capture.analysis.synthesis import deterministic_parent_paragraph
from school_capture.models import (
    QualitativeCaptureRecord,
    SubjectAreaAssessment,
    today_iso,
)
from school_capture.qa_heuristics import AreaQaFinding, SchoolQaSuspect
from school_capture.synth_policy import area_has_evidence


def _excerpt_hits(text: str, excerpts: list[str]) -> bool:
    blob = (text or "").lower()
    for ex in excerpts:
        fragment = (ex or "").strip().lower()
        if fragment and fragment[:48] in blob:
            return True
    return False


def apply_area_finding(
    area: SubjectAreaAssessment,
    finding: AreaQaFinding,
) -> SubjectAreaAssessment:
    action = (finding.action or "keep").lower()
    if action == "keep":
        return area

    offerings = list(area.offerings or [])
    signals = list(area.signals or [])
    narrative = area.narrativeSummary
    method = area.synthesisMethod
    excerpts = finding.offendingExcerpts or []

    if action in {"strip", "thin"} and excerpts:
        offerings = [o for o in offerings if not _excerpt_hits(o, excerpts)]
        signals = [s for s in signals if not _excerpt_hits(s.text or "", excerpts)]
        if narrative and _excerpt_hits(narrative, excerpts):
            narrative = None
            method = None
    elif action in {"strip", "thin"}:
        # Whole-area wipe of junk classes when no excerpts given.
        offerings = []
        signals = []
        narrative = None
        method = None

    if action == "thin":
        offerings = []
        signals = []
        narrative = None
        method = None

    next_area = replace(
        area,
        offerings=offerings,
        signals=signals,
        narrativeSummary=narrative,
        synthesisMethod=method,
        score=0 if not offerings and not signals else min(area.score, 40),
        confidence=0.05 if not offerings and not signals else min(area.confidence, 0.4),
    )

    # Rebuild a honest thin/deterministic narrative after stripping.
    if not area_has_evidence(next_area) or action == "thin" or not (
        next_area.narrativeSummary or ""
    ).strip():
        next_area = replace(
            next_area,
            narrativeSummary=deterministic_parent_paragraph(next_area),
            synthesisMethod="deterministic",
            summary=(
                next_area.summary
                if area_has_evidence(next_area)
                else f"Little public evidence found about {next_area.area} from scanned sources."
            ),
        )
    return next_area


def apply_suspect_findings(
    record: QualitativeCaptureRecord,
    suspect: SchoolQaSuspect,
) -> tuple[QualitativeCaptureRecord, int]:
    """Apply strip/thin findings. Returns (record, changes)."""
    if not suspect.findings:
        return record, 0

    by_area = {a.area: a for a in record.areas}
    changes = 0
    notes = list(record.captureNotes or [])

    for finding in suspect.findings:
        if finding.action not in {"strip", "thin", "reclassify"}:
            continue
        area = by_area.get(finding.area)
        if not area:
            continue
        before = (
            list(area.offerings or []),
            [(s.text or "") for s in (area.signals or [])],
            area.narrativeSummary,
        )
        updated = apply_area_finding(area, finding)
        after = (
            list(updated.offerings or []),
            [(s.text or "") for s in (updated.signals or [])],
            updated.narrativeSummary,
        )
        if before != after:
            by_area[finding.area] = updated
            changes += 1
            notes.append(
                f"QA {finding.source}: {finding.action} {finding.area} "
                f"({finding.junkClass or 'junk'}) — {finding.reason}"
            )

    if not changes:
        return record, 0

    areas = [by_area.get(a.area, a) for a in record.areas]
    return (
        replace(
            record,
            areas=areas,
            captureNotes=notes,
            verifiedAt=today_iso(),
        ),
        changes,
    )


def learning_events_from_suspect(suspect: SchoolQaSuspect) -> list[dict[str, str]]:
    """Extract learnable phrases from applied strip/thin findings."""
    events: list[dict[str, str]] = []
    for finding in suspect.findings:
        if finding.action not in {"strip", "thin"}:
            continue
        junk_class = finding.junkClass or "other"
        for excerpt in finding.offendingExcerpts or []:
            # Prefer short offering-like phrases over long narrative blobs.
            phrase = excerpt.strip()
            if len(phrase.split()) > 12:
                # Take first clause for learning.
                phrase = phrase.split(".")[0].split("–")[0].strip()
            if phrase:
                events.append({"phrase": phrase, "junkClass": junk_class})
    return events
