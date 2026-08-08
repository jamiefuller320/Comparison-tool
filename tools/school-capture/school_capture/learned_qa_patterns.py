"""Learned junk phrases from qualitative QA — compounds into ingest filters."""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any

DEFAULT_PATH = Path("output/learned-qa-patterns.json")
MAX_PHRASES = 400
MIN_PHRASE_LEN = 4

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


def load_learned_qa_patterns(path: Path | None = None) -> dict[str, Any]:
    global _CACHE
    p = path or DEFAULT_PATH
    if _CACHE is not None and path is None:
        return _CACHE
    if not p.is_file():
        payload = {"phrases": [], "byClass": {}, "eventCount": 0, "updatedAt": None}
        if path is None:
            _CACHE = payload
        return payload
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        payload = {"phrases": [], "byClass": {}, "eventCount": 0, "updatedAt": None}
        if path is None:
            _CACHE = payload
        return payload
    phrases = [
        normalize_phrase(x)
        for x in (raw.get("phrases") or [])
        if is_learnable_phrase(str(x))
    ]
    by_class: dict[str, list[str]] = {}
    for key, values in (raw.get("byClass") or {}).items():
        cleaned = [
            normalize_phrase(v)
            for v in (values or [])
            if is_learnable_phrase(str(v))
        ]
        if cleaned:
            by_class[str(key)] = sorted(set(cleaned))
    payload = {
        "phrases": sorted(set(phrases))[:MAX_PHRASES],
        "byClass": by_class,
        "eventCount": int(raw.get("eventCount") or 0),
        "updatedAt": raw.get("updatedAt"),
    }
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
    phrases = sorted(
        {
            normalize_phrase(x)
            for x in (payload.get("phrases") or [])
            if is_learnable_phrase(str(x))
        }
    )[:MAX_PHRASES]
    by_class: dict[str, list[str]] = {}
    for key, values in (payload.get("byClass") or {}).items():
        cleaned = sorted(
            {
                normalize_phrase(v)
                for v in (values or [])
                if is_learnable_phrase(str(v))
            }
        )
        if cleaned:
            by_class[str(key)] = cleaned
    out = {
        "phrases": phrases,
        "byClass": by_class,
        "eventCount": int(payload.get("eventCount") or 0),
        "updatedAt": payload.get("updatedAt") or today_iso(),
        "phraseCount": len(phrases),
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
    phrases = set(store.get("phrases") or [])
    by_class: dict[str, set[str]] = {
        k: set(v) for k, v in (store.get("byClass") or {}).items()
    }
    added = 0
    for event in events:
        phrase = normalize_phrase(event.get("phrase") or "")
        if not is_learnable_phrase(phrase):
            continue
        junk_class = (event.get("junkClass") or "other").strip() or "other"
        before = len(phrases)
        phrases.add(phrase)
        by_class.setdefault(junk_class, set()).add(phrase)
        if len(phrases) > before:
            added += 1
    store = {
        "phrases": sorted(phrases)[:MAX_PHRASES],
        "byClass": {k: sorted(v) for k, v in sorted(by_class.items())},
        "eventCount": int(store.get("eventCount") or 0) + len(events),
        "updatedAt": today_iso(),
    }
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
