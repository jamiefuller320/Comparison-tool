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


def test_admissions_stay_and_play_not_enrichment():
    text = (
        "Year R 2027 - Stay & Play Session - Thursday 15th October - 3.30 - 4.30pm – "
        "Fill in form September 2026 new starters and in-year transfers If your child "
        "is due to start school in September 2026 and you have not yet applied for a "
        "place, we are currently not oversubscribed and would warmly welcome visits "
        "to the school art club visit."
    )
    cap = RawCapture(
        url="http://www.buryfieldsinfants.co.uk",
        source_type="school-website",
        text=text,
        page_title="Buryfields Infant School - Home Page",
        section="homepage",
        meta={"pageType": "substantive"},
    )
    by_area = {a.area: a for a in assess_captures([cap])}
    enrichment = by_area["enrichment"]
    assert enrichment.score == 0 or not enrichment.signals
    assert not any("stay & play" in (s.text or "").lower() for s in enrichment.signals)


def test_policy_boilerplate_not_ethos_or_community_toc():
    cap = RawCapture(
        url="https://school.example/_documents/Code_of_Conduct_incl_Whistleblowing.pdf",
        source_type="school-document",
        text=(
            "By creating this policy, we aim to ensure our school is an environment "
            "where everyone is safe, happy and treated with respect. "
            "Staff should follow confidentiality and safeguarding procedures."
        ),
        page_title="Code of Conduct incl Whistleblowing Lower Level Concerns",
        section="community",
        structured_sections=[
            StructuredSection(
                heading="Related policies",
                inferred_section="community",
                list_items=[
                    "Confidentiality",
                    "Health and Safety Policy.",
                    "Staff Code of Conduct",
                    "Pay and Staff Appraisal",
                    "Version Date Author Status Summary",
                ],
            )
        ],
        meta={"pageType": "substantive"},
    )
    by_area = {a.area: a for a in assess_captures([cap])}
    ethos = by_area["ethos"]
    community = by_area["community"]
    assert not any("by creating this policy" in (s.text or "").lower() for s in ethos.signals)
    assert "Confidentiality" not in community.offerings
    assert "Staff Code of Conduct" not in community.offerings
    assert "Health and Safety Policy." not in community.offerings


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
