"""Corpus-wide exact sweep of learned chrome phrases and the chrome denylist.

The suspect-window QA pass only rewrites schools that already score as
suspicious. Learned labels and exact chrome (Contact Details, ParentPay, …)
sit on schools that never enter that window. This sweep walks every published
shard when the phrase fingerprint changes.

Removal is exact-match only. Known subjects, clubs, wraparound and ethos
words are never removed, even if a learning event mis-labelled them.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from school_capture.analysis.synthesis import deterministic_parent_paragraph
from school_capture.chrome_denylist import (
    EXACT_CHROME_LABELS,
    normalize_chrome_label,
)
from school_capture.learned_qa_patterns import load_learned_qa_patterns
from school_capture.list_filters import ETHOS_VALUE_TERMS
from school_capture.models import SubjectAreaAssessment, today_iso
from school_capture.offering_terms import (
    ACTIVITY_TERMS,
    CURRICULUM_SUBJECT_TERMS,
    PROVISION_TERMS,
)
from school_capture.sidecar import list_shard_paths

# Active learned phrases in these classes are safe to exact-match. One-hit
# archive phrases are not: the archive contains genuine subjects
# ("religious education", "phonics") learned from a single bad excerpt.
_CHROME_SWEEP_CLASSES = frozenset({"chrome", "cms_chrome", "spotcheck_chrome"})
_LISTED_PROVISION_RE = re.compile(
    r"Listed provision includes ([^.]*?)\.",
    re.I,
)
_ITEM_COUNT_RE = re.compile(r"\((\d+) specific items?\)", re.I)
_HEADING_SIGNAL_MAX_WORDS = 14


def genuine_offering_terms() -> frozenset[str]:
    """Labels the sweep must not delete, even if learning called them chrome."""
    terms: set[str] = set()
    for raw in (
        *ETHOS_VALUE_TERMS,
        *ACTIVITY_TERMS,
        *CURRICULUM_SUBJECT_TERMS,
        *PROVISION_TERMS,
    ):
        key = normalize_chrome_label(raw)
        if key:
            terms.add(key)
    return frozenset(terms)


def corpus_sweep_needed(
    previous: dict[str, Any] | None,
    current: dict[str, Any] | None,
    *,
    force: bool = False,
) -> tuple[bool, str]:
    """True when the phrase fingerprint changed, however small the phrase delta.

    ``learning_change_is_significant`` ignores a hash change that moves fewer
    than five active phrases. That gate is why a newly learned chrome label
    never reached the rest of the corpus. The sweep uses the hash itself.
    """
    if force:
        return True, "forced (--force)"
    prev_hash = str((previous or {}).get("phraseHash") or "")
    curr_hash = str((current or {}).get("phraseHash") or "")
    if not previous or not prev_hash:
        return True, "no prior phrase fingerprint"
    if prev_hash != curr_hash:
        return (
            True,
            f"phrase fingerprint changed ({prev_hash[:8]}→{curr_hash[:8]})",
        )
    return False, "phrase fingerprint unchanged"


def sweep_denied_labels(learned_path: Path | None = None) -> set[str]:
    """Exact labels to strip: seeded chrome denylist + active learned chrome.

    Genuine offering terms are subtracted so a bad learning event cannot
    delete music, religious education, football, and the like.
    """
    keep = genuine_offering_terms()
    denied = {label for label in EXACT_CHROME_LABELS if label not in keep}
    store = load_learned_qa_patterns(learned_path)
    stats = store.get("stats") or {}
    if not isinstance(stats, dict):
        stats = {}
    for phrase in store.get("phrases") or []:
        key = normalize_chrome_label(str(phrase))
        if not key or key in keep:
            continue
        meta = stats.get(key) or stats.get(phrase) or {}
        if not isinstance(meta, dict):
            continue
        junk_class = str(meta.get("junkClass") or "")
        if junk_class in _CHROME_SWEEP_CLASSES:
            denied.add(key)
    return denied


def _signal_is_exact_chrome(text: str, denied: set[str]) -> bool:
    raw = (text or "").strip()
    if not raw:
        return False
    if normalize_chrome_label(raw) in denied:
        return True
    if ":" not in raw or len(raw.split()) > _HEADING_SIGNAL_MAX_WORDS:
        return False
    tail = normalize_chrome_label(raw.rsplit(":", 1)[-1])
    return bool(tail) and tail in denied


def _scrub_summary(summary: str, denied: set[str], removed_count: int) -> str:
    text = summary or ""
    if removed_count <= 0 or not text:
        return text

    def clause(match: re.Match[str]) -> str:
        parts = [part.strip() for part in match.group(1).split(",")]
        kept: list[str] = []
        for part in parts:
            if not part:
                continue
            base = re.sub(r"\s+and\s+\d+\s+more$", "", part, flags=re.I).strip()
            if normalize_chrome_label(base) in denied or normalize_chrome_label(part) in denied:
                continue
            kept.append(part)
        if not kept:
            return ""
        return "Listed provision includes " + ", ".join(kept) + "."

    text = _LISTED_PROVISION_RE.sub(clause, text)

    def count(match: re.Match[str]) -> str:
        n = max(0, int(match.group(1)) - removed_count)
        word = "item" if n == 1 else "items"
        return f"({n} specific {word})"

    text = _ITEM_COUNT_RE.sub(count, text, count=1)
    return re.sub(r"\s{2,}", " ", text).replace(" .", ".").strip()


def _rebuild_narrative(area: dict[str, Any]) -> None:
    model = SubjectAreaAssessment.from_dict(area)
    area["narrativeSummary"] = deterministic_parent_paragraph(model)
    area["synthesisMethod"] = "deterministic"


def sweep_record(
    record: dict[str, Any],
    denied: set[str],
) -> tuple[dict[str, Any], list[str], int]:
    """Return (record, removed offering labels, signals removed).

    The input dict is not mutated. Exact chrome offerings are removed.
    Longer genuine labels that merely contain a chrome word are kept.
    """
    if not denied:
        return record, [], 0
    updated = dict(record)
    areas_out: list[Any] = []
    removed: list[str] = []
    signals_removed = 0
    changed = False

    for area in record.get("areas") or []:
        if not isinstance(area, dict):
            areas_out.append(area)
            continue
        next_area = dict(area)
        offerings = list(next_area.get("offerings") or [])
        kept_offerings: list[str] = []
        area_removed: list[str] = []
        for offering in offerings:
            if isinstance(offering, str) and normalize_chrome_label(offering) in denied:
                area_removed.append(offering)
            else:
                kept_offerings.append(offering)
        signals = list(next_area.get("signals") or [])
        kept_signals: list[Any] = []
        area_signals_removed = 0
        for signal in signals:
            text = signal.get("text") if isinstance(signal, dict) else ""
            if isinstance(text, str) and _signal_is_exact_chrome(text, denied):
                area_signals_removed += 1
            else:
                kept_signals.append(signal)
        if not area_removed and not area_signals_removed:
            areas_out.append(area)
            continue
        changed = True
        removed.extend(area_removed)
        signals_removed += area_signals_removed
        next_area["offerings"] = kept_offerings
        next_area["signals"] = kept_signals
        summary = str(next_area.get("summary") or "")
        if area_removed and any(label.lower() in summary.lower() for label in area_removed):
            # Scrub before rebuilding the narrative: a one-offering area
            # falls back to the summary text.
            next_area["summary"] = _scrub_summary(summary, denied, len(area_removed))
        narrative = str(next_area.get("narrativeSummary") or "")
        narrative_low = narrative.lower()
        if area_removed and (
            narrative_low.startswith("the school website lists")
            or any(label.lower() in narrative_low for label in area_removed)
        ):
            _rebuild_narrative(next_area)
        if not kept_offerings and not kept_signals:
            next_area["score"] = 0
            next_area["confidence"] = 0.05
            if not str(next_area.get("narrativeSummary") or "").strip():
                _rebuild_narrative(next_area)
        areas_out.append(next_area)

    if not changed:
        return record, [], 0

    updated["areas"] = areas_out
    notes = [str(note) for note in (record.get("captureNotes") or [])]
    preview = ", ".join(removed[:6])
    note = f"QA corpus sweep: removed {len(removed)} chrome offering(s)"
    if preview:
        note += f" ({preview})"
    if signals_removed:
        note += f"; removed {signals_removed} chrome signal(s)"
    notes.append(note)
    updated["captureNotes"] = notes
    updated["verifiedAt"] = today_iso()
    return updated, removed, signals_removed


def apply_corpus_chrome_sweep(
    shards_dir: Path,
    learned_path: Path | None = None,
    *,
    dry_run: bool = False,
    sample_limit: int = 12,
) -> dict[str, Any]:
    """Strip exact chrome / learned-chrome offerings from every shard."""
    denied = sweep_denied_labels(learned_path)
    removed_by_label: dict[str, int] = {}
    schools_changed = 0
    offerings_removed = 0
    signals_removed = 0
    sample: list[dict[str, Any]] = []
    scanned = 0

    for path in list_shard_paths(shards_dir):
        scanned += 1
        try:
            raw = path.read_text(encoding="utf-8")
            record = json.loads(raw)
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(record, dict):
            continue
        updated, removed, dropped_signals = sweep_record(record, denied)
        if not removed and not dropped_signals:
            continue
        schools_changed += 1
        offerings_removed += len(removed)
        signals_removed += dropped_signals
        for label in removed:
            key = normalize_chrome_label(label) or label
            removed_by_label[key] = removed_by_label.get(key, 0) + 1
        if len(sample) < sample_limit:
            sample.append(
                {
                    "urn": str(updated.get("urn") or path.stem),
                    "name": str(updated.get("name") or ""),
                    "removed": removed[:8],
                }
            )
        if dry_run:
            continue
        text = json.dumps(updated, separators=(",", ":"), ensure_ascii=True)
        if raw.endswith("\n"):
            text += "\n"
        path.write_text(text, encoding="utf-8")

    return {
        "shardsScanned": scanned,
        "schoolsChanged": schools_changed,
        "offeringsRemoved": offerings_removed,
        "signalsRemoved": signals_removed,
        "deniedLabelCount": len(denied),
        "removedByLabel": dict(
            sorted(removed_by_label.items(), key=lambda kv: (-kv[1], kv[0]))
        ),
        "sample": sample,
        "dryRun": dry_run,
    }
