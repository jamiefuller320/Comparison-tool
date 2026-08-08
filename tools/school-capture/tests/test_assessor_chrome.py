"""Assessor must not promote site chrome or SEN parent tips into curriculum."""

from __future__ import annotations

from school_capture.analysis.assessor import assess_captures
from school_capture.sources.base import RawCapture, StructuredSection


def test_chrome_list_items_do_not_become_offerings_or_signals():
    cap = RawCapture(
        url="https://school.example/send/",
        source_type="school-website",
        text="Our SEND page explains support for pupils with special educational needs.",
        page_title="SEND",
        section="send",
        list_items=[
            "Ofsted Report",
            "Parent View",
            "Staff Portal",
            "Zones of Regulation",
            "Cognition and Learning",
        ],
        structured_sections=[
            StructuredSection(
                heading="Support",
                inferred_section="send",
                list_items=[
                    "Ofsted Report",
                    "Parent View",
                    "Zones of Regulation",
                    "Cognition and Learning",
                ],
            )
        ],
        meta={"pageType": "substantive"},
    )
    by_area = {a.area: a for a in assess_captures([cap])}
    send = by_area["send"]
    assert "Ofsted Report" not in send.offerings
    assert "Parent View" not in send.offerings
    assert "Staff Portal" not in send.offerings
    assert not any(
        (s.text or "").strip() in {"Ofsted Report", "Parent View", "Staff Portal"}
        or (s.text or "").endswith(": Ofsted Report")
        for s in send.signals
    )
    assert any(
        "zones of regulation" in o.lower() or "cognition" in o.lower()
        for o in send.offerings
    )


def test_outside_agency_flowchart_stays_out_of_community():
    cap = RawCapture(
        url="https://school.example/docs/REFERRAL_TO_OUTSIDE_AGENCIES.pdf",
        source_type="school-document",
        text="Referral pathways for pupils who need specialist support.",
        page_title="REFERRAL TO OUTSIDE AGENCIES PROCESS FLOW CHART PARENTS",
        section="send",
        structured_sections=[
            StructuredSection(
                heading="Outside agencies",
                inferred_section="community",
                list_items=[
                    "School Nursing Team",
                    "Primary Behaviour",
                    "Speech & Language",
                    "Special School",
                ],
            )
        ],
        meta={"pageType": "substantive"},
    )
    by_area = {a.area: a for a in assess_captures([cap])}
    community = by_area["community"]
    assert not community.offerings
    assert not any("School Nursing" in (s.text or "") for s in community.signals)


def test_sen_parent_tips_do_not_feed_curriculum():
    tip = (
        "Limit screen time. Read with your child. Offer a balanced and varied diet. "
        "Help them become stronger when facing challenges by praising them for their "
        "hard work. Come to meetings such as parents' evenings, phonics sessions, "
        "and SEN meetings so children settle well at school."
    )
    cap = RawCapture(
        url="https://school.example/docs/parent-guide-sen.pdf",
        source_type="school-document",
        text=tip,
        page_title="Parent Guide to SEN",
        section="send",
        meta={"pageType": "substantive"},
    )
    by_area = {a.area: a for a in assess_captures([cap])}
    curriculum = by_area["curriculum"]
    assert curriculum.score == 0 or not curriculum.signals
    assert not any("screen time" in (s.text or "").lower() for s in curriculum.signals)
    assert not any("balanced and varied diet" in (s.text or "").lower() for s in curriculum.signals)
