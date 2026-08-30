#!/usr/bin/env python3
"""Unit tests for learned-QA significant-change detection."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "school-capture"))

from school_capture.learned_qa_patterns import learning_change_is_significant


def test_first_run_is_significant() -> None:
    ok, reason = learning_change_is_significant(
        None,
        {"phraseHash": "abc", "phraseCount": 10, "eventCount": 0},
    )
    assert ok
    assert "first" in reason.lower() or "no prior" in reason.lower()


def test_event_delta_triggers() -> None:
    ok, reason = learning_change_is_significant(
        {"phraseHash": "abc", "phraseCount": 100, "eventCount": 10},
        {"phraseHash": "abc", "phraseCount": 100, "eventCount": 30},
        min_event_delta=15,
    )
    assert ok
    assert "eventCount" in reason


def test_unchanged_not_significant() -> None:
    fp = {"phraseHash": "abc", "phraseCount": 100, "eventCount": 50}
    ok, reason = learning_change_is_significant(fp, dict(fp))
    assert not ok
    assert "unchanged" in reason.lower()


def test_minor_rebalance_ignored() -> None:
    ok, reason = learning_change_is_significant(
        {"phraseHash": "aaa", "phraseCount": 600, "eventCount": 100},
        {"phraseHash": "bbb", "phraseCount": 602, "eventCount": 100},
        min_phrase_delta=5,
    )
    assert not ok
    assert "minor" in reason.lower()


def test_phrase_set_change_triggers() -> None:
    ok, reason = learning_change_is_significant(
        {"phraseHash": "aaa", "phraseCount": 600, "eventCount": 100},
        {"phraseHash": "bbb", "phraseCount": 610, "eventCount": 100},
        min_phrase_delta=5,
    )
    assert ok
    assert "phrase" in reason.lower()


def main() -> int:
    test_first_run_is_significant()
    test_event_delta_triggers()
    test_unchanged_not_significant()
    test_minor_rebalance_ignored()
    test_phrase_set_change_triggers()
    print("OK learning_change_is_significant")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
