"""Learned junk phrases from qualitative QA — compounds into ingest filters.

Active matching phrases are capped. Selection prefers hit count, recency, and
per-class quotas so chrome-heavy learning does not starve rarer junk classes,
and so phrases that only lived under ``byClass`` can re-enter the active set.
"""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any

DEFAULT_PATH = Path("output/learned-qa-patterns.json")
# Active matching set used by ingest/QA filters.
MAX_PHRASES = 600
# Retained archive (stats/byClass) so eviction can reshuffle without losing
# recently demoted phrases; also absorbs legacy byClass orphans.
MAX_CANDIDATES = 2000
MIN_PHRASE_LEN = 4
# Soft floor so minority junk classes keep representation under the cap.
MIN_PER_CLASS = 12

_CACHE: dict[str, Any] | None = None


def today_iso() -> str:
    return date.today().isoformat()


def normalize_phrase(phrase: str) -> str:
    text = re.sub(r"\s+", " ", (phrase or "").lower()).strip()
    text = text.lstrip("•·▪◦\uf09f\u2022-–—* ").strip(" .;,:")
    return text


def is_learnable_phrase(phrase: str) -> bool:
    p = normalize_phrase(phrase)
    if len(p) < MIN_PHRASE_LEN or len(p) > 80:
        return False
    if p.isdigit():
        return False
    # Avoid learning whole paragraphs
    if len(p.split()) > 12:
        return False
    return True


def _parse_day(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _recency_score(last_seen: str | None, *, today: date | None = None) -> float:
    """Higher is better; unknown dates score as moderately stale."""
    day = _parse_day(last_seen)
    if day is None:
        return 0.0
    anchor = today or date.today()
    age_days = max(0, (anchor - day).days)
    # ~1.0 today, ~0.5 at 90d, approaches 0 for very old.
    return 1.0 / (1.0 + age_days / 90.0)


def _phrase_score(
    hits: int,
    last_seen: str | None,
    *,
    today: date | None = None,
) -> float:
    return float(max(0, hits)) * 10.0 + _recency_score(last_seen, today=today) * 5.0


def _empty_payload() -> dict[str, Any]:
    return {
        "phrases": [],
        "byClass": {},
        "stats": {},
        "eventCount": 0,
        "updatedAt": None,
        "phraseCount": 0,
    }


def _collect_candidates(raw: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Merge phrases + byClass + stats into a candidate map."""
    updated_at = raw.get("updatedAt")
    default_seen = updated_at or today_iso()
    candidates: dict[str, dict[str, Any]] = {}

    def upsert(
        phrase: str,
        *,
        junk_class: str | None = None,
        hits: int | None = None,
        last_seen: str | None = None,
    ) -> None:
        p = normalize_phrase(phrase)
        if not is_learnable_phrase(p):
            return
        row = candidates.setdefault(
            p,
            {
                "hits": 1,
                "lastSeen": default_seen,
                "junkClass": "other",
            },
        )
        if hits is not None:
            row["hits"] = max(int(row.get("hits") or 1), int(hits))
        if last_seen:
            prev = _parse_day(str(row.get("lastSeen") or ""))
            nxt = _parse_day(last_seen)
            if nxt and (prev is None or nxt >= prev):
                row["lastSeen"] = last_seen[:10]
        if junk_class:
            row["junkClass"] = junk_class

    stats = raw.get("stats") or {}
    if isinstance(stats, dict):
        for phrase, meta in stats.items():
            if not isinstance(meta, dict):
                upsert(str(phrase))
                continue
            upsert(
                str(phrase),
                junk_class=str(meta.get("junkClass") or "other"),
                hits=int(meta.get("hits") or 1),
                last_seen=str(meta.get("lastSeen") or default_seen),
            )

    for phrase in raw.get("phrases") or []:
        upsert(str(phrase))

    for key, values in (raw.get("byClass") or {}).items():
        junk_class = str(key) or "other"
        for value in values or []:
            upsert(str(value), junk_class=junk_class)

    return candidates


def select_active_phrases(
    candidates: dict[str, dict[str, Any]],
    *,
    max_phrases: int | None = None,
    min_per_class: int | None = None,
    today: date | None = None,
) -> list[str]:
    """Pick an active matching set with per-class floors + score fill."""
    if not candidates:
        return []
    limit = max(0, int(MAX_PHRASES if max_phrases is None else max_phrases))
    class_floor = MIN_PER_CLASS if min_per_class is None else min_per_class
    if limit == 0:
        return []

    by_class: dict[str, list[str]] = {}
    for phrase, meta in candidates.items():
        junk_class = str(meta.get("junkClass") or "other")
        by_class.setdefault(junk_class, []).append(phrase)

    def sort_key(phrase: str) -> tuple[float, str]:
        meta = candidates[phrase]
        score = _phrase_score(
            int(meta.get("hits") or 1),
            str(meta.get("lastSeen") or "") or None,
            today=today,
        )
        return (score, phrase)

    for phrases in by_class.values():
        phrases.sort(key=sort_key, reverse=True)

    selected: list[str] = []
    selected_set: set[str] = set()
    class_count = max(1, len(by_class))
    # Half the budget split across classes; remainder filled globally by score.
    reserve = max(
        1,
        min(class_floor, max(1, limit // (2 * class_count))),
    )

    for phrases in by_class.values():
        for phrase in phrases[:reserve]:
            if len(selected) >= limit:
                break
            if phrase in selected_set:
                continue
            selected.append(phrase)
            selected_set.add(phrase)
        if len(selected) >= limit:
            break

    leftovers = [p for p in candidates if p not in selected_set]
    leftovers.sort(key=sort_key, reverse=True)
    for phrase in leftovers:
        if len(selected) >= limit:
            break
        selected.append(phrase)
        selected_set.add(phrase)

    # Stable output order for diffs: score desc, then phrase.
    selected.sort(key=sort_key, reverse=True)
    return selected


def _trim_candidates(
    candidates: dict[str, dict[str, Any]],
    *,
    max_candidates: int | None = None,
    today: date | None = None,
) -> dict[str, dict[str, Any]]:
    """Drop lowest-scoring archive entries when over MAX_CANDIDATES."""
    limit = MAX_CANDIDATES if max_candidates is None else max_candidates
    if len(candidates) <= limit:
        return candidates

    def sort_key(phrase: str) -> tuple[float, str]:
        meta = candidates[phrase]
        score = _phrase_score(
            int(meta.get("hits") or 1),
            str(meta.get("lastSeen") or "") or None,
            today=today,
        )
        return (score, phrase)

    kept = sorted(candidates.keys(), key=sort_key, reverse=True)[:limit]
    return {phrase: candidates[phrase] for phrase in kept}


def _payload_from_candidates(
    candidates: dict[str, dict[str, Any]],
    *,
    event_count: int,
    updated_at: str | None,
    max_phrases: int | None = None,
    max_candidates: int | None = None,
) -> dict[str, Any]:
    trimmed = _trim_candidates(candidates, max_candidates=max_candidates)
    active = select_active_phrases(trimmed, max_phrases=max_phrases)
    active_set = set(active)
    by_class: dict[str, list[str]] = {}
    stats: dict[str, dict[str, Any]] = {}
    # Archive keeps trimmed candidates; matching uses ``phrases`` only.
    for phrase, meta in trimmed.items():
        junk_class = str(meta.get("junkClass") or "other")
        by_class.setdefault(junk_class, []).append(phrase)
        stats[phrase] = {
            "hits": int(meta.get("hits") or 1),
            "lastSeen": str(meta.get("lastSeen") or updated_at or today_iso())[:10],
            "junkClass": junk_class,
            "active": phrase in active_set,
        }
    for key in list(by_class):
        by_class[key] = sorted(set(by_class[key]))
    return {
        "phrases": active,
        "byClass": dict(sorted(by_class.items())),
        "stats": stats,
        "eventCount": int(event_count),
        "updatedAt": updated_at,
        "phraseCount": len(active),
        "candidateCount": len(trimmed),
    }


def _normalize_payload(raw: dict[str, Any]) -> dict[str, Any]:
    candidates = _collect_candidates(raw)
    return _payload_from_candidates(
        candidates,
        event_count=int(raw.get("eventCount") or 0),
        updated_at=raw.get("updatedAt"),
    )


def load_learned_qa_patterns(path: Path | None = None) -> dict[str, Any]:
    global _CACHE
    p = path or DEFAULT_PATH
    if _CACHE is not None and path is None:
        return _CACHE
    if not p.is_file():
        payload = _empty_payload()
        if path is None:
            _CACHE = payload
        return payload
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        payload = _empty_payload()
        if path is None:
            _CACHE = payload
        return payload
    if not isinstance(raw, dict):
        payload = _empty_payload()
        if path is None:
            _CACHE = payload
        return payload
    payload = _normalize_payload(raw)
    if path is None:
        _CACHE = payload
    return payload


def learned_junk_phrases(path: Path | None = None) -> set[str]:
    return set(load_learned_qa_patterns(path).get("phrases") or [])


def clear_learned_qa_cache() -> None:
    global _CACHE
    _CACHE = None


def save_learned_qa_patterns(
    payload: dict[str, Any],
    path: Path | None = None,
) -> dict[str, Any]:
    p = path or DEFAULT_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    normalized = _normalize_payload(
        {
            "phrases": payload.get("phrases") or [],
            "byClass": payload.get("byClass") or {},
            "stats": payload.get("stats") or {},
            "eventCount": int(payload.get("eventCount") or 0),
            "updatedAt": payload.get("updatedAt") or today_iso(),
        }
    )
    # Persist without ephemeral diagnostic-only keys if any sneak in.
    out = {
        "phrases": normalized["phrases"],
        "byClass": normalized["byClass"],
        "stats": normalized["stats"],
        "eventCount": normalized["eventCount"],
        "updatedAt": normalized["updatedAt"],
        "phraseCount": normalized["phraseCount"],
        "candidateCount": normalized.get("candidateCount", normalized["phraseCount"]),
    }
    p.write_text(json.dumps(out, indent=2), encoding="utf-8")
    clear_learned_qa_cache()
    if path is None:
        global _CACHE
        _CACHE = out
    return out


def record_qa_learning_events(
    events: list[dict[str, str]],
    path: Path | None = None,
) -> dict[str, Any]:
    """Merge confirmed junk phrases from QA strip/thin actions."""
    store = load_learned_qa_patterns(path)
    candidates = _collect_candidates(store)
    added = 0
    today = today_iso()

    for event in events:
        phrase = normalize_phrase(event.get("phrase") or "")
        if not is_learnable_phrase(phrase):
            continue
        junk_class = (event.get("junkClass") or "other").strip() or "other"
        before = phrase in candidates
        row = candidates.setdefault(
            phrase,
            {"hits": 0, "lastSeen": today, "junkClass": junk_class},
        )
        row["junkClass"] = junk_class
        row["hits"] = int(row.get("hits") or 0) + 1
        row["lastSeen"] = today
        if not before:
            added += 1

    store = {
        "phrases": list(candidates),
        "byClass": {},
        "stats": {
            phrase: {
                "hits": int(meta.get("hits") or 1),
                "lastSeen": str(meta.get("lastSeen") or today)[:10],
                "junkClass": str(meta.get("junkClass") or "other"),
            }
            for phrase, meta in candidates.items()
        },
        "eventCount": int(store.get("eventCount") or 0) + len(events),
        "updatedAt": today,
    }
    # Rebuild byClass from stats for normalize/save.
    for phrase, meta in store["stats"].items():
        store["byClass"].setdefault(meta["junkClass"], []).append(phrase)

    saved = save_learned_qa_patterns(store, path)
    saved["added"] = added
    return saved


def phrase_matches_learned(text: str, path: Path | None = None) -> bool:
    blob = normalize_phrase(text)
    if not blob:
        return False
    for phrase in learned_junk_phrases(path):
        if phrase and phrase in blob:
            return True
    return False


def rebalance_learned_qa_patterns(path: Path | None = None) -> dict[str, Any]:
    """Rewrite store with current selection rules (unlocks orphaned byClass)."""
    store = load_learned_qa_patterns(path)
    store = dict(store)
    store["updatedAt"] = today_iso()
    return save_learned_qa_patterns(store, path)
