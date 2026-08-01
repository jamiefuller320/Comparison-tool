#!/usr/bin/env python3
"""Offline tests for inspection précis extraction (no network)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from inspection_precis_lib import (  # noqa: E402
    extract_isi_precis,
    extract_ofsted_precis,
    is_non_inspection_report_label,
    looks_like_letterhead_junk,
    merge_precis_fields_from_previous,
    normalize_ofsted_provider_url,
    parse_ofsted_provider_latest_report,
    pick_quotes,
    truncate_at_sentence,
)
import json
import tempfile
from pathlib import Path

OFSTED_FIXTURE = """
Inspection of a good school: Abbotswood Junior School
Ringwood Road, Totton, Southampton, Hampshire SO40 8EB
Inspection dates: 7 and 8 June 2023

Outcome

Abbotswood Junior School continues to be a good school. There is enough evidence of
improved performance to suggest that the school could be judged outstanding if we were
to carry out a graded (section 5) inspection now. The school's next inspection will be a
graded inspection.

What is it like to attend this school?

Leaders have very high expectations for all pupils, including those with special educational
needs and/or disabilities (SEND) and disadvantaged pupils. They have created a
curriculum that is aspirational for all pupils.
This is a happy school with so much on offer. Pupils love school life. They enjoy the many
clubs, performing in the up-and-coming performance of 'The Jungle Book' and
representing the school in many sporting competitions. Parents and carers are highly
positive about the school and their children's experiences.
Leaders promote positive learning behaviours extremely well. Pupils work very hard. Pupils
behave exceptionally well in lessons and around the school. Playgrounds are active and
pupils feel safe.

What does the school do well and what does it need to do better?

Staff and governors alike share the headteacher's vision. The curriculum is
ambitious and pupils achieve well across a broad range of subjects. Teachers
check carefully what pupils know and remember.

What does the school need to do to improve?

Leaders should ensure that pupils in the early stages of reading practise
sounds more frequently. Subject leaders need to check that the most able
pupils are challenged consistently in foundation subjects.
"""

EY_FIXTURE = """
Inspection of Beaumont Pre-School
Inspection date: 18 June 2024
Overall effectiveness Good

What is it like to attend this early years setting?
The provision is good
Staff provide a warm and nurturing environment. Children separate from their
parents without hesitation and demonstrate they feel safe and secure. They make
independent choices in their play and swiftly engage in activities alongside their
friends.
Staff plan a curriculum that places a strong focus on children's personal, social and
emotional development.

What does the early years setting do well and what does it need to do better?
Leaders have worked hard to make improvements. Staff support children's
communication and language development well through carefully planned play.

What does the early years setting need to do to improve?
Staff should give children more opportunities to develop their early writing
skills outdoors.
"""

ISI_FIXTURE = """
School inspection report
Priory School

Contents
SUMMARY OF INSPECTION FINDINGS ................................................................ 3

3
Summary of inspection findings
1. The proprietor, leaders and governors collectively ensure that the requirements of the Standards are
met consistently. They work collaboratively to support an accurate evaluation of school
performance.
2. Leaders provide a broad and balanced curriculum with a range of recreational activities available.
Teachers deliver well-planned lessons so that pupils, including those who have special educational
needs and/or disabilities (SEND), learn and attain well.
3. The school prioritises the wellbeing of pupils, the promotion of school values and the creation of a
harmonious, caring and safe environment. Leaders create an inclusive environment where pupils
feel valued and develop their confidence.
The extent to which the school meets the Standards
Standards relating to leadership and management, and governance are met.
"""

PROVIDER_HTML = """
<html><body>
<h2>Latest inspection</h2>
<ol class="timeline">
<li class="timeline__day">
  <div class="event">
    <p class="timeline__date"><time>07 June 2023</time></p>
    <span class="event__title heading--sub"><a class="publication-link" target="_blank"
      href="https://files.ofsted.gov.uk/v1/file/50224032">
      School inspection <span class="nonvisual">School inspection, PDF - 21 July 2023</span></a>
    </span>
  </div>
</li>
</ol>
</body></html>
"""

PROVIDER_HTML_CONVERSION_FIRST = """
<html><body>
<ol class="timeline">
<li class="timeline__day">
  <div class="event">
    <p class="timeline__date"><time>04 December 2024</time></p>
    <span class="event__title heading--sub"><a class="publication-link" target="_blank"
      href="https://files.ofsted.gov.uk/v1/file/99900001">
      Academy conversion letter <span class="nonvisual">Academy conversion letter, PDF</span></a>
    </span>
  </div>
</li>
<li class="timeline__day">
  <div class="event">
    <p class="timeline__date"><time>12 March 2022</time></p>
    <span class="event__title heading--sub"><a class="publication-link" target="_blank"
      href="https://files.ofsted.gov.uk/v1/file/50224032">
      School inspection <span class="nonvisual">School inspection, PDF</span></a>
    </span>
  </div>
</li>
</ol>
</body></html>
"""


def main() -> None:
    assert truncate_at_sentence("Short.", 100) == "Short."
    long = "One sentence here. Two sentence here that is longer still for parents."
    assert truncate_at_sentence(long, 20).endswith("…") or "." in truncate_at_sentence(long, 40)

    latest = parse_ofsted_provider_latest_report(PROVIDER_HTML)
    assert latest is not None
    assert latest["inspectionReportFileUrl"].endswith("/50224032")
    assert "June 2023" in latest["inspectionReportLabel"]

    skipped = parse_ofsted_provider_latest_report(PROVIDER_HTML_CONVERSION_FIRST)
    assert skipped is not None
    assert skipped["inspectionReportFileUrl"].endswith("/50224032")
    assert "conversion" not in skipped["inspectionReportLabel"].lower()
    assert is_non_inspection_report_label(
        "Academy conversion letter · 04 December 2024"
    )
    assert looks_like_letterhead_junk(
        "Ofsted Piccadilly Gate Store Street Manchester M1 2WD"
    )
    assert not looks_like_letterhead_junk("Pupils feel safe and happy at school.")

    url = "https://files.ofsted.gov.uk/v1/file/50224032"
    ofsted = extract_ofsted_precis(OFSTED_FIXTURE, url)
    assert ofsted is not None
    assert ofsted["inspectionPrecisSource"] == "ofsted"
    assert "continues to be a good school" in (ofsted["inspectionPrecis"] or "").lower()
    assert ofsted["inspectionQuotes"]
    for q in ofsted["inspectionQuotes"]:
        assert q["sourceUrl"] == url
        low = q["text"].lower()
        assert any(
            token in low
            for token in ("pupil", "child", "parent", "happy", "safe")
        )
    assert ofsted.get("inspectionStrengths")
    assert ofsted.get("inspectionImprovements")
    assert any(
        "should" in q["text"].lower() or "need" in q["text"].lower()
        for q in ofsted["inspectionImprovements"]
    )

    ey = extract_ofsted_precis(EY_FIXTURE, url)
    assert ey is not None
    assert ey["inspectionQuotes"]
    assert all("provision is good" not in q["text"].lower() for q in ey["inspectionQuotes"])
    assert ey.get("inspectionImprovements")

    isi = extract_isi_precis(ISI_FIXTURE, "https://reports.isi.net/example.pdf")
    assert isi is not None
    assert isi["inspectionPrecisSource"] == "isi"
    assert isi["inspectionPrecis"]
    assert isi["inspectionQuotes"]
    assert any("wellbeing" in q["text"].lower() or "inclusive" in q["text"].lower() or "curriculum" in q["text"].lower() for q in isi["inspectionQuotes"])

    quotes = pick_quotes(
        "Pupils feel safe every day. Staff are kind.",
        source_url=url,
        section_label="What is it like",
        max_quotes=2,
    )
    assert quotes

    school = {
        "urn": "116482",
        "phase": "primary",
        "phases": ["ks1", "ks2"],
        "ofstedReportUrl": "http://www.ofsted.gov.uk/inspection-reports/find-inspection-report/provider/ELS/116482",
        "ofstedSource": "ofsted-state-schools",
    }
    assert normalize_ofsted_provider_url(school).endswith("/provider/21/116482")

    secondary = {
        "urn": "137535",
        "phase": "secondary",
        "phases": ["ks3", "ks4"],
        "ofstedReportUrl": "http://www.ofsted.gov.uk/inspection-reports/find-inspection-report/provider/ELS/137535",
        "ofstedSource": "ofsted-state-schools",
    }
    assert normalize_ofsted_provider_url(secondary).endswith("/provider/23/137535")

    ey_rec = {
        "urn": "ey-1",
        "ofstedUrn": "109947",
        "ofstedSource": "ofsted-childcare",
    }
    assert normalize_ofsted_provider_url(ey_rec).endswith("/provider/16/109947")

    cm_rec = {
        "urn": "cm:EY368731",
        "ofstedUrn": "EY368731",
        "ofstedSource": "ofsted-consented-childminder",
        "ofstedReportUrl": "https://reports.ofsted.gov.uk/provider/16/EY368731",
    }
    assert normalize_ofsted_provider_url(cm_rec).endswith("/provider/17/EY368731")

    with tempfile.TemporaryDirectory() as tmp:
        prev_path = Path(tmp) / "schools-index.json"
        prev_path.write_text(
            json.dumps(
                {
                    "schools": [
                        {
                            "urn": "1",
                            "inspectionPrecis": "Kept excerpt.",
                            "inspectionQuotes": [
                                {
                                    "text": "Pupils feel safe.",
                                    "sourceUrl": "https://example.test/a.pdf",
                                }
                            ],
                            "inspectionReportFileUrl": "https://example.test/a.pdf",
                            "inspectionPrecisSource": "ofsted",
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        fresh = [{"urn": "1", "name": "New harvest row"}]
        n = merge_precis_fields_from_previous(fresh, prev_path)
        assert n == 1
        assert fresh[0]["inspectionPrecis"] == "Kept excerpt."
        assert fresh[0]["inspectionQuotes"][0]["text"] == "Pupils feel safe."

    print("inspection precis ok")


if __name__ == "__main__":
    main()
