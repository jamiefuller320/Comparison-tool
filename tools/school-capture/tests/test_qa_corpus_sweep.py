"""Corpus-wide exact chrome / learned-term sweep."""

from __future__ import annotations

import json
from pathlib import Path

from school_capture.chrome_denylist import EXACT_CHROME_LABELS, is_exact_chrome_label
from school_capture.learned_qa_patterns import record_qa_learning_events
from school_capture.list_filters import (
    filter_offerings,
    is_nav_or_junk_list_item,
    is_plausible_list_offering,
)
from school_capture.qa_corpus_sweep import (
    apply_corpus_chrome_sweep,
    corpus_sweep_needed,
    genuine_offering_terms,
    sweep_denied_labels,
    sweep_record,
)


def test_seeded_labels_are_exact_chrome_and_not_genuine_offerings():
    for label in (
        "Contact Details",
        "TERM DATES",
        "ParentPay",
        "Parent Pay",
        "parentpay",
        "Translate",
        "Privacy",
        "School Dinners",
        "Accessibility",
    ):
        assert is_exact_chrome_label(label), label
        assert is_nav_or_junk_list_item(label), label
        assert not is_plausible_list_offering(label), label
    # Substring / longer labels are real provision or a different page, not the widget.
    for kept in (
        "football",
        "music",
        "dance",
        "religious education",
        "Privacy and Security",
        "Staff Contact Details",
        "Calendar and Term Dates",
        "Accessibility Plan",
        "Translate Page",
        "phonics",
    ):
        assert not is_exact_chrome_label(kept), kept
        assert kept.lower() not in EXACT_CHROME_LABELS or is_exact_chrome_label(kept)
    assert EXACT_CHROME_LABELS.isdisjoint(genuine_offering_terms())


def test_filter_offerings_drops_chrome_labels_and_keeps_clubs():
    kept = filter_offerings(
        [
            "music",
            "Contact Details",
            "football",
            "ParentPay",
            "Privacy and Security",
            "School Dinners",
            "Accessibility Plan",
        ],
        area="enrichment",
    )
    assert kept == ["music", "football", "Privacy and Security", "Accessibility Plan"]


def test_sweep_record_removes_exact_chrome_and_keeps_genuine_offerings():
    denied = sweep_denied_labels(None)
    record = {
        "urn": "115975",
        "name": "South View Infant and Nursery School",
        "areas": [
            {
                "area": "community",
                "score": 67,
                "confidence": 0.94,
                "summary": (
                    "Strong publicly visible evidence for community (9 specific items). "
                    "Listed provision includes Information for Parents, School Dinners, "
                    "ParentPay, Privacy and Security."
                ),
                "themes": ["parents"],
                "offerings": [
                    "Information for Parents",
                    "School Dinners",
                    "music",
                    "ParentPay",
                    "Privacy and Security",
                    "Staff Contact Details",
                    "Calendar and Term Dates",
                    "Accessibility Plan",
                    "football",
                    "religious education",
                ],
                "signals": [
                    {
                        "text": "Parents: School Dinners",
                        "sourceUrl": "https://school.example/parents",
                        "sourceType": "school-website",
                        "capturedAt": "2026-08-23",
                    },
                    {
                        "text": "We run a football club after school on Thursdays for years 3 to 6.",
                        "sourceUrl": "https://school.example/clubs",
                        "sourceType": "school-website",
                        "capturedAt": "2026-08-23",
                    },
                ],
                "narrativeSummary": (
                    "The school website lists Information for Parents, School Dinners, "
                    "music, ParentPay, Privacy and Security and 5 more."
                ),
                "synthesisMethod": "deterministic",
            }
        ],
    }
    updated, removed, signals_removed = sweep_record(record, denied)
    offerings = updated["areas"][0]["offerings"]
    assert removed == ["School Dinners", "ParentPay"]
    assert signals_removed == 1
    assert offerings == [
        "Information for Parents",
        "music",
        "Privacy and Security",
        "Staff Contact Details",
        "Calendar and Term Dates",
        "Accessibility Plan",
        "football",
        "religious education",
    ]
    narrative = updated["areas"][0]["narrativeSummary"].lower()
    assert "school dinners" not in narrative
    assert "parentpay" not in narrative
    assert "music" in narrative
    assert "privacy and security" in narrative
    summary = updated["areas"][0]["summary"]
    assert "School Dinners" not in summary
    assert "ParentPay" not in summary
    assert "Privacy and Security" in summary
    assert "(7 specific items)" in summary
    prose = updated["areas"][0]["signals"]
    assert len(prose) == 1
    assert "football club" in prose[0]["text"]
    # Original record is left untouched.
    assert "School Dinners" in record["areas"][0]["offerings"]


def test_learned_chrome_phrase_is_exact_only_and_genuine_terms_stay(tmp_path: Path):
    store = tmp_path / "learned.json"
    record_qa_learning_events(
        [
            {"phrase": "governor portal", "junkClass": "chrome"},
            {"phrase": "governor portal", "junkClass": "chrome"},
            {"phrase": "music", "junkClass": "chrome"},
            {"phrase": "music", "junkClass": "chrome"},
            {"phrase": "religious education", "junkClass": "chrome"},
            {"phrase": "religious education", "junkClass": "chrome"},
        ],
        store,
    )
    denied = sweep_denied_labels(store)
    assert "governor portal" in denied
    assert "music" not in denied
    assert "religious education" not in denied
    updated, removed, _signals = sweep_record(
        {
            "urn": "1",
            "name": "Keep Real Provision",
            "areas": [
                {
                    "area": "enrichment",
                    "score": 40,
                    "confidence": 0.4,
                    "summary": "Listed provision includes governor portal, music, drama.",
                    "offerings": [
                        "governor portal",
                        "music",
                        "drama",
                        "wall- tennis",
                        "Open the governor portal for letters",
                    ],
                    "signals": [],
                    "narrativeSummary": "Clubs include drama and music.",
                    "synthesisMethod": "deterministic",
                }
            ],
        },
        denied,
    )
    assert removed == ["governor portal"]
    assert updated["areas"][0]["offerings"] == [
        "music",
        "drama",
        "wall- tennis",
        "Open the governor portal for letters",
    ]


def test_apply_sweep_writes_only_changed_shards(tmp_path: Path):
    shards = tmp_path / "qualitative"
    shards.mkdir()
    dirty = {
        "urn": "100",
        "name": "Chrome School",
        "areas": [
            {
                "area": "ethos",
                "score": 20,
                "confidence": 0.2,
                "summary": "Listed provision includes Contact Details.",
                "offerings": ["Contact Details", "vision"],
                "signals": [],
                "narrativeSummary": "The school website lists Contact Details, vision.",
                "synthesisMethod": "deterministic",
            }
        ],
    }
    clean = {
        "urn": "200",
        "name": "Club School",
        "areas": [
            {
                "area": "enrichment",
                "score": 40,
                "confidence": 0.4,
                "summary": "Listed provision includes football.",
                "offerings": ["football", "choir"],
                "signals": [],
                "narrativeSummary": "The school website lists football, choir.",
                "synthesisMethod": "deterministic",
            }
        ],
    }
    (shards / "100.json").write_text(
        json.dumps(dirty, separators=(",", ":")), encoding="utf-8"
    )
    clean_path = shards / "200.json"
    clean_path.write_text(
        json.dumps(clean, separators=(",", ":")), encoding="utf-8"
    )
    before = clean_path.read_text(encoding="utf-8")
    stats = apply_corpus_chrome_sweep(shards, None)
    assert stats["shardsScanned"] == 2
    assert stats["schoolsChanged"] == 1
    assert stats["offeringsRemoved"] == 1
    assert stats["removedByLabel"]["contact details"] == 1
    assert stats["sample"][0]["urn"] == "100"
    after_dirty = json.loads((shards / "100.json").read_text(encoding="utf-8"))
    assert after_dirty["areas"][0]["offerings"] == ["vision"]
    assert "Contact Details" not in after_dirty["areas"][0]["narrativeSummary"]
    assert clean_path.read_text(encoding="utf-8") == before
    again = apply_corpus_chrome_sweep(shards, None)
    assert again["offeringsRemoved"] == 0
    assert again["schoolsChanged"] == 0


def test_corpus_sweep_needed_on_fingerprint_change_only():
    previous = {"phraseHash": "abc123", "phraseCount": 900}
    assert corpus_sweep_needed(None, previous)[0] is True
    assert corpus_sweep_needed(previous, {"phraseHash": "zzz999", "phraseCount": 900})[0]
    ok, reason = corpus_sweep_needed(previous, dict(previous))
    assert ok is False
    assert "unchanged" in reason
