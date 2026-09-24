#!/usr/bin/env python3
"""Re-apply offering chrome / PDF-junk filters across published qualitative shards.

Used after extractor denylist / hygiene upgrades so existing URN shards pick up
fixes without a full website recrawl. Prefer this for known junk patterns
(Dinner Menu family, ALL-CAPS PDF questions, club→ethos mis-buckets).

Usage:
  python3 scripts/refilter-qualitative-offerings.py
  python3 scripts/refilter-qualitative-offerings.py --urns 147519,135086,150721
  python3 scripts/refilter-qualitative-offerings.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
sys.path.insert(0, str(CAPTURE_ROOT))

from school_capture.analysis.synthesis import deterministic_parent_paragraph  # noqa: E402
from school_capture.list_filters import (  # noqa: E402
    filter_offerings,
    is_nav_or_junk_list_item,
    looks_like_club_activity_label,
    looks_like_pdf_extraction_junk,
)
from school_capture.models import (  # noqa: E402
    QualitativeCaptureRecord,
    SubjectAreaAssessment,
    today_iso,
)
from school_capture.sidecar import (  # noqa: E402
    list_shard_paths,
    load_records_from_shards,
)
from school_capture.synth_policy import area_has_evidence  # noqa: E402

DEFAULT_SHARDS = ROOT / "public" / "data" / "qualitative"


def _signal_is_junk(text: str, *, area: str) -> bool:
    t = (text or "").strip()
    if not t:
        return True
    # Heading-prefixed list crumbs: "Club Brochure: chess"
    tail = t.split(":", 1)[-1].strip() if ":" in t else t
    words = tail.split()
    # Prose signals (parent-facing quotes) must not use the short-list junk rules.
    if len(words) > 8:
        # Still drop ALL-CAPS questionnaire fragments that leaked into signals.
        if looks_like_pdf_extraction_junk(tail) or looks_like_pdf_extraction_junk(t):
            return True
        return False
    if looks_like_pdf_extraction_junk(tail) or looks_like_pdf_extraction_junk(t):
        return True
    if is_nav_or_junk_list_item(tail) or is_nav_or_junk_list_item(t):
        return True
    if area in {"ethos", "behaviour"} and looks_like_club_activity_label(tail):
        return True
    return False


def refilter_area(area: SubjectAreaAssessment) -> SubjectAreaAssessment:
    """Deterministic offering/signal hygiene without ranking."""
    from dataclasses import replace

    prior_score = area.score
    prior_confidence = area.confidence
    offerings = filter_offerings(list(area.offerings or []), area=area.area)
    signals = [
        s
        for s in (area.signals or [])
        if not _signal_is_junk(s.text or "", area=area.area)
    ]
    narrative = area.narrativeSummary
    method = area.synthesisMethod
    offerings_changed = offerings != list(area.offerings or [])
    signals_changed = [(s.text or "") for s in signals] != [
        (s.text or "") for s in (area.signals or [])
    ]
    if not offerings_changed and not signals_changed:
        return area

    # Drop narratives that still advertise stripped chrome labels.
    if narrative:
        lowered = narrative.lower()
        dropped = {
            o.lower()
            for o in (area.offerings or [])
            if o.lower() not in {x.lower() for x in offerings}
        }
        if any(frag and frag in lowered for frag in dropped):
            narrative = None
            method = None

    if not offerings and not signals:
        score = 0
        confidence = 0.05
    else:
        # Keep prior score when evidence remains; only floor empty areas.
        score = prior_score if prior_score > 0 else min(
            25 + len(offerings) * 5 + len(signals) * 4, 82
        )
        confidence = min(max(prior_confidence, 0.4), 0.94)

    next_area = replace(
        area,
        offerings=offerings,
        signals=signals,
        narrativeSummary=narrative,
        synthesisMethod=method,
        score=score,
        confidence=confidence,
    )
    if not area_has_evidence(next_area) or not (next_area.narrativeSummary or "").strip():
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


def refilter_record(record: QualitativeCaptureRecord) -> tuple[QualitativeCaptureRecord, int]:
    from dataclasses import replace

    # Corpus refilter uses durable list filters only. Heuristic "thin" findings
    # can wipe good SMSC prose when offerings were already empty — avoid that.
    areas = []
    changes = 0
    for area in record.areas:
        updated = refilter_area(area)
        if (
            list(updated.offerings or []) != list(area.offerings or [])
            or [(s.text or "") for s in (updated.signals or [])]
            != [(s.text or "") for s in (area.signals or [])]
            or (updated.narrativeSummary or "") != (area.narrativeSummary or "")
        ):
            changes += 1
        areas.append(updated)
    if not changes:
        return record, 0
    notes = list(record.captureNotes or [])
    notes.append("QA refilter: chrome/PDF/area-routing hygiene re-applied")
    return (
        replace(
            record,
            areas=areas,
            captureNotes=notes,
            verifiedAt=today_iso(),
        ),
        changes,
    )


def write_shard(shards_dir: Path, record: QualitativeCaptureRecord) -> None:
    path = shards_dir / f"{record.urn}.json"
    path.write_text(
        json.dumps(record.to_dict(), separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--shards-dir",
        type=Path,
        default=DEFAULT_SHARDS,
    )
    parser.add_argument(
        "--urns",
        default="",
        help="Comma-separated URN allowlist (default: all shards)",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "output" / "qualitative-refilter-report.json",
    )
    args = parser.parse_args(argv)

    allow = {u.strip() for u in args.urns.split(",") if u.strip()}
    records = load_records_from_shards(args.shards_dir)
    if allow:
        records = [r for r in records if r.urn in allow]

    changed: list[dict] = []
    for record in records:
        updated, n = refilter_record(record)
        if not n:
            continue
        before_offs = {
            a.area: list(a.offerings or [])[:8] for a in record.areas
        }
        after_offs = {
            a.area: list(a.offerings or [])[:8] for a in updated.areas
        }
        changed.append(
            {
                "urn": record.urn,
                "name": record.name,
                "changes": n,
                "beforeOfferings": before_offs,
                "afterOfferings": after_offs,
            }
        )
        if not args.dry_run:
            write_shard(args.shards_dir, updated)

    report = {
        "scanned": len(records),
        "changed": len(changed),
        "dryRun": bool(args.dry_run),
        "shardFiles": len(list_shard_paths(args.shards_dir)),
        "samples": changed[:30],
        "changedUrns": [c["urn"] for c in changed],
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"scanned": report["scanned"], "changed": report["changed"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
