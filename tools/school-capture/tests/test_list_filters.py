"""Tests for navigation/junk list item filters."""

from __future__ import annotations

from school_capture.filters import is_blocked_sentence, looks_like_parent_home_advice
from school_capture.list_filters import (
    filter_offerings,
    is_nav_or_junk_list_item,
    is_plausible_list_offering,
)


def test_rejects_nav_and_files():
    assert is_nav_or_junk_list_item("Home")
    assert is_nav_or_junk_list_item("PICA0191.jpg")
    assert is_nav_or_junk_list_item("Admission Policy 2026 27")
    assert is_nav_or_junk_list_item("https://clubspark.lta.org.uk")
    assert not is_nav_or_junk_list_item("Football (Years 3–6)")


def test_rejects_primarysite_chrome_and_form_fields():
    assert is_nav_or_junk_list_item("Ofsted Report")
    assert is_nav_or_junk_list_item("Parent View")
    assert is_nav_or_junk_list_item("Staff Portal")
    assert is_nav_or_junk_list_item("Report Student Absence")
    assert is_nav_or_junk_list_item("Name of Child: Class:")
    assert is_nav_or_junk_list_item("SPECIAL EDUCATIONAL NEEDS")
    assert is_nav_or_junk_list_item("Hampshire County Council")
    assert is_nav_or_junk_list_item("Limit screen time")
    assert not is_plausible_list_offering("Ofsted Report")
    assert not is_plausible_list_offering("Parent View")


def test_filter_offerings_drops_chrome_keeps_real_clubs():
    cleaned = filter_offerings(
        [
            "Ofsted Report",
            "Parent View",
            "breakfast club",
            "drama",
            "tennis",
            "Name of Child: Class:",
            "Zones of Regulation",
            "Cognition and Learning",
        ]
    )
    assert "Ofsted Report" not in cleaned
    assert "Parent View" not in cleaned
    assert "Name of Child: Class:" not in cleaned
    assert "breakfast club" in cleaned
    assert "drama" in cleaned
    assert "tennis" in cleaned
    # SEND provision labels remain useful
    assert "Zones of Regulation" in cleaned or "Cognition and Learning" in cleaned


def test_plausible_offerings():
    assert not is_plausible_list_offering("Curriculum, useful information & SEND")
    assert not is_plausible_list_offering("website can only tell part of our story")
    assert is_plausible_list_offering("Football (Years 3–6)")
    assert is_plausible_list_offering("Breakfast club from 7:45am")
    assert is_plausible_list_offering("House Captain")
    assert is_plausible_list_offering("cricket")


def test_rejects_policy_toc_labels():
    assert is_nav_or_junk_list_item("Confidentiality")
    assert is_nav_or_junk_list_item("Health and Safety Policy.")
    assert is_nav_or_junk_list_item("Staff Code of Conduct")
    assert is_nav_or_junk_list_item("Version Date Author Status Summary")
    assert not is_plausible_list_offering("Pay and Staff Appraisal")


def test_parent_home_advice_blocked_from_curriculum_path():
    tip = (
        "Limit screen time. Read with your child. Offer a balanced and varied diet. "
        "Make sure they get enough sleep. Come to meetings such as parents' evenings, "
        "phonics sessions, transitions, and SEN meetings."
    )
    assert looks_like_parent_home_advice(tip)
    assert is_blocked_sentence(tip)
