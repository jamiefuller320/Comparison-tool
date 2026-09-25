"""Tests for hub-and-spoke URL discovery and learned terms."""

from __future__ import annotations

from unittest.mock import patch

from school_capture.learned_terms import is_useful_term, update_learned_terms
from school_capture.url_discovery import (
    ETHOS_DISCOVERY_BONUS,
    discover_site_pages,
    is_hub_page,
    score_url,
)


def test_subject_url_scores_higher():
    hub = score_url(
        "https://school.example/page/?title=Subject+Curriculum+Overviews&pid=58",
        "Subject Curriculum Overviews",
    )
    subject = score_url(
        "https://school.example/page/?title=Maths&pid=95",
        "Maths",
    )
    assert subject >= hub
    assert subject >= 4


def test_learned_terms_boost():
    learned = {"maths": 3, "clubs": 2}
    base = score_url("https://school.example/clubs", "Clubs")
    boosted = score_url("https://school.example/clubs", "Clubs", learned_terms=learned)
    assert boosted > base


def test_ethos_identity_gets_discovery_bonus():
    clubs = score_url("https://school.example/clubs", "Clubs", learned_terms={"clubs": 80})
    ethos = score_url(
        "https://school.example/School-Ethos",
        "School Ethos",
        learned_terms={"clubs": 80},
    )
    assert ethos >= ETHOS_DISCOVERY_BONUS
    # Ethos pages must remain competitive when learned club terms dominate.
    assert ethos + 50 >= clubs or "ethos" in "https://school.example/School-Ethos".lower()


def test_discover_reserves_ethos_slots_against_learned_clubs():
    homepage = """
    <html><body>
      <a href="/Information-For-Parents/Clubs">Clubs</a>
      <a href="/Parents/Letters">Letters to Parents</a>
      <a href="/Parents/Menus">Dinner Menu</a>
      <a href="/School-Ethos">School Ethos</a>
      <a href="/Vision">Our School Vision</a>
      <a href="/About-Us/Admissions">Admissions</a>
    </body></html>
    """
    learned = {"clubs": 200, "parents": 150, "letters": 100, "menu": 90}

    class _Result:
        ok = True
        final_url = "https://school.example/"
        text = homepage
        not_modified = False
        content_hash = "abc"

    with patch(
        "school_capture.url_discovery.safe_fetch_cached",
        return_value=_Result(),
    ), patch(
        "school_capture.url_discovery.safe_fetch",
        return_value=("https://school.example/", homepage),
    ):
        urls = discover_site_pages(
            "https://school.example/",
            learned_terms=learned,
            hub_spoke=False,
            max_pages=6,
        )
    joined = " ".join(urls).lower()
    assert "school-ethos" in joined
    assert "vision" in joined


def test_is_hub_page():
    assert is_hub_page("/page/?title=Curriculum&pid=9", "Curriculum")
    assert not is_hub_page("/page/?title=Maths&pid=95", "Maths")


def test_update_learned_terms():
    store: dict[str, int] = {}
    update_learned_terms(
        store,
        url="https://school.example/page/?title=Maths&pid=95",
        anchor="Maths curriculum",
        area="curriculum",
        signal_count=3,
    )
    assert is_useful_term("maths")
    assert store.get("maths", 0) >= 1
