"""Spot-check fidelity fixes: chrome denylist, PDF junk, club→enrichment routing."""

from __future__ import annotations

from school_capture.analysis.assessor import assess_captures
from school_capture.documents import (
    club_document_relevance_multiplier,
    is_stale_club_document,
    score_document_url,
)
from school_capture.filters import (
    area_source_confidence_multiplier,
    looks_like_club_source,
    looks_like_ethos_identity_page,
)
from school_capture.list_filters import (
    filter_offerings,
    is_nav_or_junk_list_item,
    is_plausible_list_offering,
    looks_like_pdf_extraction_junk,
)
from school_capture.sources.base import RawCapture, StructuredSection


def test_dinner_menu_family_is_chrome():
    for label in (
        "Dinner Menu",
        "Pay Online",
        "School Calendar",
        "Newsletters",
        "Facebook",
        "Prospectus",
        "Stafford Vacancies",
        "Academic Life",
        "Galleries",
        "Instagram",
    ):
        assert is_nav_or_junk_list_item(label), label
        assert not is_plausible_list_offering(label), label


def test_pdf_ui_crumbs_and_all_caps_questions():
    for label in (
        "Ascending",
        "Descending",
        "Modified",
        "CLASSROOM, INCLUDING SCHOOL TRIPS?",
        "AND INCREASING ATTENDANCE?",
        "HAVE, OR ARE CURRENTLY RECEIVING?",
    ):
        assert looks_like_pdf_extraction_junk(label), label
        assert is_nav_or_junk_list_item(label), label


def test_ethos_keeps_values_drops_clubs():
    cleaned = filter_offerings(
        ["chess", "gymnastics", "wrap around care", "Respect", "Kindness", "Resilient"],
        area="ethos",
    )
    assert "chess" not in cleaned
    assert "gymnastics" not in cleaned
    assert "wrap around care" not in cleaned
    assert "Respect" in cleaned
    assert "Kindness" in cleaned
    assert "Resilient" in cleaned


def test_club_brochure_routes_to_enrichment_not_ethos():
    heading = "Club Brochure Autumn 2026"
    cap = RawCapture(
        url="https://www.akivaschool.org/docs/General/Club_Brochure__Autumn_2026.pdf",
        source_type="school-document",
        text="Clubs this term include chess, gymnastics and wrap around care.",
        page_title=heading,
        section="general",
        list_items=["chess", "gymnastics", "wrap around care"],
        structured_sections=[
            StructuredSection(
                heading=heading,
                inferred_section="general",
                list_items=["chess", "gymnastics", "wrap around care"],
            )
        ],
        meta={"pageType": "substantive"},
    )
    by_area = {a.area: a for a in assess_captures([cap])}
    assert "chess" in by_area["enrichment"].offerings
    assert "chess" not in by_area["ethos"].offerings
    assert not any(
        "chess" in (s.text or "").lower() for s in (by_area["ethos"].signals or [])
    )


def test_stale_club_pdf_demoted():
    stale = "https://school.example/docs/after-school-clubs-letter-2022.pdf"
    fresh = "https://school.example/docs/club-brochure-2026.pdf"
    assert is_stale_club_document(stale, "After school clubs 2022", today_year=2026)
    assert not is_stale_club_document(fresh, "Club Brochure 2026", today_year=2026)
    assert club_document_relevance_multiplier(stale, "Clubs 2022", today_year=2026) < 0.3
    assert club_document_relevance_multiplier(fresh, "Club Brochure 2026", today_year=2026) >= 1.0
    assert score_document_url(fresh, "Club Brochure Autumn 2026") > score_document_url(
        stale, "After school clubs 2022"
    )


def test_ethos_prefers_mission_pages_over_club_brochures():
    assert looks_like_ethos_identity_page(
        "https://school.example/about-us/our-vision", "Our Vision and Mission"
    )
    assert looks_like_club_source(
        "https://school.example/docs/Club_Brochure__Autumn_2026.pdf",
        "Club Brochure Autumn 2026",
    )
    mission_boost = area_source_confidence_multiplier(
        "ethos",
        url="https://school.example/about-us/catholic-ethos",
        title="Catholic Ethos",
    )
    club_penalty = area_source_confidence_multiplier(
        "ethos",
        url="https://school.example/docs/Club_Brochure__Autumn_2026.pdf",
        title="Club Brochure Autumn 2026",
    )
    assert mission_boost > 1.0
    assert club_penalty < 0.2
