"""Orchestrate qualitative QA: rank suspects → heuristic/agent → apply → learn."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from school_capture.learned_qa_patterns import record_qa_learning_events
from school_capture.models import QualitativeCaptureIndex, QualitativeCaptureRecord, today_iso
from school_capture.qa_agent import enrich_suspect_with_agent
from school_capture.qa_apply import apply_suspect_findings, learning_events_from_suspect
from school_capture.qa_heuristics import SchoolQaSuspect, rank_suspects
from school_capture.sidecar import load_capture_index, upsert_records

DEFAULT_CAPTURE = Path("output/qualitative-capture.json")
DEFAULT_DIGEST = Path("public/data/packs/qualitative-qa-latest.json")
DEFAULT_QUEUE = Path("output/qualitative-qa-queue.json")
DEFAULT_LEARNED = Path("output/learned-qa-patterns.json")


@dataclass
class QaRunResult:
    reviewed: int = 0
    changedSchools: int = 0
    findingsApplied: int = 0
    learningAdded: int = 0
    suspects: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    provider: str = "none"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def run_qualitative_qa(
    *,
    capture_path: Path = DEFAULT_CAPTURE,
    digest_path: Path = DEFAULT_DIGEST,
    queue_path: Path = DEFAULT_QUEUE,
    learned_path: Path = DEFAULT_LEARNED,
    limit: int = 8,
    min_score: float = 2.0,
    provider: str = "none",
    model: str | None = None,
    apply: bool = True,
    learn: bool = True,
    dry_run: bool = False,
    cwd: str | None = None,
) -> QaRunResult:
    """Run QA over the qualitative sidecar and optionally persist fixes."""
    index = load_capture_index(capture_path)
    result = QaRunResult(provider=provider)
    if not index or not index.records:
        result.notes.append("No qualitative capture records to review.")
        _write_digest(digest_path, result, dry_run=dry_run)
        return result

    suspects = rank_suspects(index.records, limit=limit, min_score=min_score)
    result.reviewed = len(suspects)
    if not suspects:
        result.notes.append("No suspicious schools above the QA threshold.")
        _write_digest(digest_path, result, dry_run=dry_run)
        _write_queue(queue_path, [], dry_run=dry_run)
        return result

    by_urn = {r.urn: r for r in index.records}
    updated_records: list[QualitativeCaptureRecord] = []
    learning_events: list[dict[str, str]] = []
    queue_rows: list[dict[str, Any]] = []

    for suspect in suspects:
        record = by_urn.get(suspect.urn)
        if not record:
            continue

        working = suspect
        if provider not in {"none", ""}:
            working = enrich_suspect_with_agent(
                record,
                suspect,
                provider=provider,
                model=model,
                cwd=cwd,
            )

        if not working.findings:
            queue_rows.append(
                {
                    **working.to_dict(),
                    "status": "watch",
                    "note": "Suspicious but no auto-actionable findings",
                }
            )
            result.suspects.append(working.to_dict())
            continue

        if apply and not dry_run:
            new_record, changes = apply_suspect_findings(record, working)
            if changes:
                updated_records.append(new_record)
                by_urn[record.urn] = new_record
                result.changedSchools += 1
                result.findingsApplied += changes
                if learn:
                    learning_events.extend(learning_events_from_suspect(working))
                queue_rows.append(
                    {
                        **working.to_dict(),
                        "status": "auto_fixed",
                        "changes": changes,
                    }
                )
            else:
                queue_rows.append({**working.to_dict(), "status": "no_change"})
        else:
            queue_rows.append(
                {
                    **working.to_dict(),
                    "status": "dry_run" if dry_run else "report_only",
                }
            )
        result.suspects.append(working.to_dict())

    if updated_records and not dry_run:
        upsert_records(
            capture_path,
            updated_records,
            stats={
                "qaReviewed": result.reviewed,
                "qaChanged": result.changedSchools,
                "qaProvider": provider,
                "updatedAt": today_iso(),
            },
        )
        result.notes.append(
            f"Applied QA fixes to {result.changedSchools} school(s) "
            f"({result.findingsApplied} area finding(s))."
        )

    if learning_events and learn and not dry_run:
        learned = record_qa_learning_events(learning_events, learned_path)
        result.learningAdded = int(learned.get("added") or 0)
        result.notes.append(
            f"Learned {result.learningAdded} new junk phrase(s) "
            f"(store size {learned.get('phraseCount', 0)})."
        )

    result.notes.append(
        f"Reviewed top {result.reviewed} suspect(s); provider={provider}."
    )
    _write_digest(digest_path, result, dry_run=dry_run)
    _write_queue(queue_path, queue_rows, dry_run=dry_run)
    return result


def _write_digest(path: Path, result: QaRunResult, *, dry_run: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "dryRun": dry_run,
        **result.to_dict(),
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    md_path = path.with_suffix(".md")
    lines = [
        "# Qualitative QA loop",
        "",
        f"- Ran at: `{payload['ranAt']}`",
        f"- Provider: `{result.provider}`",
        f"- Reviewed: `{result.reviewed}`",
        f"- Schools changed: `{result.changedSchools}`",
        f"- Findings applied: `{result.findingsApplied}`",
        f"- New learned phrases: `{result.learningAdded}`",
        f"- Dry run: `{dry_run}`",
        "",
    ]
    if result.notes:
        lines.append("## Notes")
        lines.append("")
        for note in result.notes:
            lines.append(f"- {note}")
        lines.append("")
    if result.suspects:
        lines.append("## Suspects")
        lines.append("")
        for row in result.suspects[:20]:
            lines.append(
                f"- `{row.get('urn')}` {row.get('name')} — score {row.get('score')} "
                f"flags={','.join(row.get('flags') or []) or '—'}"
            )
        lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")


def _write_queue(path: Path, rows: list[dict[str, Any]], *, dry_run: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "generatedAt": today_iso(),
                "dryRun": dry_run,
                "count": len(rows),
                "schools": rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
