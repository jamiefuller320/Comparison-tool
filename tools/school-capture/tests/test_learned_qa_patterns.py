"""Learned QA junk phrase store compounds into ingest filters."""

from __future__ import annotations

from pathlib import Path

from school_capture.filters import is_blocked_sentence
from school_capture.learned_qa_patterns import (
    clear_learned_qa_cache,
    phrase_matches_learned,
    record_qa_learning_events,
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
