#!/usr/bin/env python3
"""Tests for scripts/collate-human-gated-review.py."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent
MODULE_PATH = SCRIPTS / "collate-human-gated-review.py"


def _load_collate():
    spec = importlib.util.spec_from_file_location(
        "collate_human_gated_review", MODULE_PATH
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


collate = _load_collate()


class CollateHumanGatedReviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.queue = self.root / "queue.jsonl"
        self.digest_json = self.root / "digest.json"
        self.digest_md = self.root / "digest.md"
        self.spotcheck_gated = self.root / "spotcheck-gated.jsonl"
        self.spotcheck_flags = self.root / "spotcheck-flags.jsonl"
        self.user_gated = self.root / "user-gated.jsonl"
        self.spotcheck_digest = self.root / "spotcheck-digest.json"
        self.learned = self.root / "learned.json"

        collate.SPOTCHECK_GATED = self.spotcheck_gated
        collate.SPOTCHECK_FLAGS = self.spotcheck_flags
        collate.USER_GATED = self.user_gated
        collate.SPOTCHECK_DIGEST = self.spotcheck_digest
        collate.LEARNED_QA = self.learned
        collate.ROOT = self.root
        collate.DIGEST_JSON = self.digest_json
        collate.DIGEST_MD = self.digest_md
        collate.QUEUE_JSONL = self.queue

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _write_jsonl(self, path: Path, rows: list[dict]) -> None:
        path.write_text(
            "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8"
        )

    def test_collate_merges_sources_and_persists_queue(self) -> None:
        self._write_jsonl(
            self.spotcheck_gated,
            [{"phrase": "Zones of Regulation", "junkClass": "spotcheck_chrome"}],
        )
        self._write_jsonl(
            self.user_gated,
            [
                {
                    "phrase": "Cookie banner",
                    "junkClass": "user_flag",
                    "urn": "123",
                    "feedbackId": "fb-1",
                    "gate": "gated_review",
                    "source": "user-summary-vote-gated",
                }
            ],
        )
        self.spotcheck_digest.write_text(
            json.dumps(
                {
                    "schools": [
                        {
                            "urn": "147519",
                            "name": "St Anne's",
                            "la": "Hampshire",
                            "flags": [
                                {
                                    "code": "possible_underclaim",
                                    "severity": "warn",
                                    "area": "ethos",
                                    "detail": "mission miss",
                                    "excerpts": ["our mission"],
                                },
                                {
                                    "code": "heuristic_cms_chrome",
                                    "severity": "warn",
                                    "detail": "should be ignored",
                                },
                            ],
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )

        with mock.patch.object(collate, "collect_github_issues", return_value=[]):
            payload = collate.collate(
                dry_run=False,
                include_issues=False,
                issue_limit=10,
                auto_close=False,
                open_issue=False,
                mark_done_ids=[],
                mark_done_feedback=[],
                done_note=None,
                digest_json=self.digest_json,
                digest_md=self.digest_md,
                queue_path=self.queue,
            )

        self.assertEqual(payload["openCount"], 3)
        self.assertTrue(self.digest_json.is_file())
        self.assertTrue(self.digest_md.is_file())
        md = self.digest_md.read_text(encoding="utf-8")
        self.assertIn("How to review / mark done", md)
        self.assertIn("Zones of Regulation", md)
        self.assertIn("possible_underclaim", md)
        self.assertIn("feedback:process", md)

        # Tip JSONL truncate must not wipe durable open phrase / ethos rows.
        self.spotcheck_gated.write_text("", encoding="utf-8")
        self.user_gated.write_text("", encoding="utf-8")
        with mock.patch.object(collate, "collect_github_issues", return_value=[]):
            payload2 = collate.collate(
                dry_run=False,
                include_issues=False,
                issue_limit=10,
                auto_close=False,
                open_issue=False,
                mark_done_ids=[],
                mark_done_feedback=[],
                done_note=None,
                digest_json=self.digest_json,
                digest_md=self.digest_md,
                queue_path=self.queue,
            )
        self.assertGreaterEqual(payload2["openCount"], 2)
        kinds = {i["kind"] for i in payload2["items"]}
        self.assertIn(collate.KIND_PHRASE, kinds)
        self.assertIn(collate.KIND_ETHOS, kinds)

    def test_mark_done_and_auto_close_learned(self) -> None:
        self._write_jsonl(
            self.spotcheck_gated,
            [{"phrase": "Dinner Menu", "junkClass": "spotcheck_chrome"}],
        )
        with mock.patch.object(collate, "collect_github_issues", return_value=[]):
            first = collate.collate(
                dry_run=False,
                include_issues=False,
                issue_limit=10,
                auto_close=False,
                open_issue=False,
                mark_done_ids=[],
                mark_done_feedback=[],
                done_note=None,
                digest_json=self.digest_json,
                digest_md=self.digest_md,
                queue_path=self.queue,
            )
        item_id = first["items"][0]["id"]
        with mock.patch.object(collate, "collect_github_issues", return_value=[]):
            second = collate.collate(
                dry_run=False,
                include_issues=False,
                issue_limit=10,
                auto_close=False,
                open_issue=False,
                mark_done_ids=[item_id],
                mark_done_feedback=[],
                done_note="reviewed",
                digest_json=self.digest_json,
                digest_md=self.digest_md,
                queue_path=self.queue,
            )
        self.assertEqual(second["openCount"], 0)

        self._write_jsonl(
            self.spotcheck_gated,
            [{"phrase": "Pay Online", "junkClass": "spotcheck_chrome"}],
        )
        self.learned.write_text(
            json.dumps({"phrases": [{"phrase": "Pay Online", "junkClass": "nav"}]}),
            encoding="utf-8",
        )
        with mock.patch.object(collate, "collect_github_issues", return_value=[]):
            third = collate.collate(
                dry_run=False,
                include_issues=False,
                issue_limit=10,
                auto_close=True,
                open_issue=False,
                mark_done_ids=[],
                mark_done_feedback=[],
                done_note=None,
                digest_json=self.digest_json,
                digest_md=self.digest_md,
                queue_path=self.queue,
            )
        self.assertEqual(third["autoClosedLearned"], 1)
        self.assertEqual(third["openCount"], 0)

    def test_flag_candidates_only_when_autolearn_gated(self) -> None:
        self._write_jsonl(
            self.spotcheck_flags,
            [
                {
                    "phrase": "Safe Chrome",
                    "junkClass": "spotcheck_chrome",
                    "autoLearn": "safe",
                },
                {
                    "phrase": "Ambiguous",
                    "junkClass": "spotcheck_chrome",
                    "autoLearn": "gated",
                },
                {"phrase": "Legacy unmarked", "junkClass": "spotcheck_chrome"},
            ],
        )
        items = collate.collect_spotcheck_phrase_candidates("2026-09-26T00:00:00+00:00")
        phrases = {i["phrase"] for i in items}
        self.assertEqual(phrases, {"Ambiguous"})


if __name__ == "__main__":
    raise SystemExit(unittest.main())
