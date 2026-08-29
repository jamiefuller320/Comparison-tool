"""Learned QA junk phrase store compounds into ingest filters."""

from __future__ import annotations

import json
from pathlib import Path

from school_capture.filters import is_blocked_sentence
from school_capture.learned_qa_patterns import (
    MAX_PHRASES,
    clear_learned_qa_cache,
    load_learned_qa_patterns,
    phrase_matches_learned,
    rebalance_learned_qa_patterns,
    record_qa_learning_events,
    select_active_phrases,
)
from school_capture.list_filters import is_nav_or_junk_list_item


def test_record_and_match_learned_phrases(tmp_path: Path):
    clear_learned_qa_cache()
    store = tmp_path / "learned-qa-patterns.json"
    result = record_qa_learning_events(
        [
            {"phrase": "Ofsted Report", "junkClass": "chrome"},
            {"phrase": "Stay & Play", "junkClass": "admissions"},
            {"phrase": "a", "junkClass": "other"},  # too short — skipped
        ],
        store,
    )
    assert result["added"] == 2
    assert phrase_matches_learned("Link: Ofsted Report (PDF)", store)
    assert phrase_matches_learned("Our Stay & Play sessions", store)
    assert not phrase_matches_learned("Football club for Year 4", store)
    payload = json.loads(store.read_text(encoding="utf-8"))
    assert "stats" in payload
    assert payload["stats"]["ofsted report"]["hits"] == 1
    assert payload["stats"]["ofsted report"]["junkClass"] == "chrome"


def test_learned_phrases_block_sentences_and_list_items(tmp_path: Path, monkeypatch):
    clear_learned_qa_cache()
    store = tmp_path / "learned-qa-patterns.json"
    record_qa_learning_events(
        [{"phrase": "version date author status summary", "junkClass": "policy_toc"}],
        store,
    )
    # Point default store at the temp file for filter helpers.
    monkeypatch.setattr(
        "school_capture.learned_qa_patterns.DEFAULT_PATH",
        store,
    )
    clear_learned_qa_cache()
    assert is_blocked_sentence("Version Date Author Status Summary of changes")
    assert is_nav_or_junk_list_item("Version Date Author Status Summary")
    clear_learned_qa_cache()


def test_rebalance_unlocks_orphaned_byclass_phrases(tmp_path: Path):
    """Legacy stores kept extras only under byClass; matching should revive them."""
    store = tmp_path / "learned-qa-patterns.json"
    # Alphabetically first phrases fill a tiny active list; orphan sorts later.
    legacy = {
        "phrases": ["aaaa chrome nav"],
        "byClass": {
            "chrome": ["aaaa chrome nav"],
            "admissions": ["zzzz stay and play open day"],
        },
        "eventCount": 3,
        "updatedAt": "2026-08-01",
        "phraseCount": 1,
    }
    store.write_text(json.dumps(legacy), encoding="utf-8")
    clear_learned_qa_cache()
    loaded = load_learned_qa_patterns(store)
    assert "zzzz stay and play open day" in loaded["phrases"]
    assert phrase_matches_learned("Join our ZZZZ Stay and Play Open Day", store)

    saved = rebalance_learned_qa_patterns(store)
    assert saved["phraseCount"] >= 2
    assert saved["candidateCount"] >= 2


def test_select_active_prefers_hits_and_class_floors():
    candidates = {}
    # Flood of low-hit chrome phrases.
    for i in range(40):
        candidates[f"chrome junk {i:02d}"] = {
            "hits": 1,
            "lastSeen": "2026-01-01",
            "junkClass": "chrome",
        }
    # Rare admissions phrase with many confirmations.
    candidates["open morning tours"] = {
        "hits": 20,
        "lastSeen": "2026-08-28",
        "junkClass": "admissions",
    }
    active = select_active_phrases(candidates, max_phrases=15, min_per_class=3)
    assert "open morning tours" in active
    assert len(active) == 15


def test_eviction_keeps_reconfirmed_phrases(tmp_path: Path, monkeypatch):
    monkeypatch.setattr("school_capture.learned_qa_patterns.MAX_PHRASES", 5)
    monkeypatch.setattr("school_capture.learned_qa_patterns.MAX_CANDIDATES", 8)
    monkeypatch.setattr("school_capture.learned_qa_patterns.MIN_PER_CLASS", 1)
    store = tmp_path / "learned-qa-patterns.json"
    clear_learned_qa_cache()

    # Seed eight chrome phrases (archive cap).
    record_qa_learning_events(
        [
            {"phrase": f"chrome label {i}", "junkClass": "chrome"}
            for i in range(8)
        ],
        store,
    )
    # Reconfirm one older phrase and add a minority-class phrase.
    result = record_qa_learning_events(
        [
            {"phrase": "chrome label 0", "junkClass": "chrome"},
            {"phrase": "policy contents page", "junkClass": "policy_toc"},
        ],
        store,
    )
    assert result["added"] == 1
    payload = json.loads(store.read_text(encoding="utf-8"))
    assert len(payload["phrases"]) <= 5
    assert len(payload["stats"]) <= 8
    assert payload["stats"]["chrome label 0"]["hits"] >= 2
    # Reconfirmed + minority class should survive alphabetical unluckiness.
    assert "chrome label 0" in payload["phrases"]
    assert "policy contents page" in payload["phrases"]
    assert MAX_PHRASES >= 5
