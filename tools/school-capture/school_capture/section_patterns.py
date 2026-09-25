"""URL and heading patterns for thematic school website sections."""

from __future__ import annotations

import re

SECTION_PATTERNS: dict[str, tuple[str, ...]] = {
    "curriculum": (
        "curriculum",
        "subjects",
        "subject-curriculum",
        "curriculum-overview",
        "learning",
        "academic",
        "key-stage",
        "keystage",
        "gcse",
        "a-level",
        "alevel",
        "options",
        "timetable",
        "reading",
        "maths",
        "science",
        "ks1",
        "ks2",
        "ks3",
        "ks4",
    ),
    "enrichment": (
        "enrichment",
        "extra-curricular",
        "extracurricular",
        "clubs",
        "club",
        "club-brochure",
        "activities",
        "sport",
        "music",
        "drama",
        "trips",
        "visits",
        "after-school",
        "afterschool",
        "wraparound",
        "wrap-around",
        "breakfast club",
        "childcare",
        "extended day",
        "holiday club",
    ),
    "ethos": (
        "ethos",
        "values",
        "vision",
        "mission",
        "aims",
        "about",
        "welcome",
        "character",
        "spiritual",
        "moral",
        "british-values",
        "faith",
        "catholic",
        "jewish",
        "christian",
        "church",
        "worship",
        "identity",
    ),
    "behaviour": (
        "behaviour",
        "behavior",
        "pastoral",
        "wellbeing",
        "well-being",
        "safeguarding",
        "anti-bullying",
        "discipline",
    ),
    "send": (
        "send",
        "sen",
        "special-needs",
        "special educational",
        "send-provision",
        "send-information",
        "local-offer",
        "senco",
        "ehcp",
    ),
    "community": (
        "community",
        "parents",
        "governors",
        "pta",
        "friends-of",
        "partnership",
        "charity",
        "open day",
    ),
}

# High-value page targets (boost discovery score).
PRIORITY_URL_TERMS: dict[str, tuple[str, ...]] = {
    "enrichment": ("clubs", "club", "extra-curricular", "wraparound", "breakfast"),
    "curriculum": ("curriculum", "subjects", "options"),
    "send": ("send", "sen", "local-offer", "senco"),
    "ethos": (
        "ethos",
        "vision",
        "mission",
        "values",
        "about-us",
        "aboutus",
        "faith",
        "catholic",
        "jewish",
        "british-values",
        "britishvalues",
        "school-ethos",
        "ourcatholicfaith",
        "ourvision",
    ),
}


def section_pattern_matches(pattern: str, blob: str) -> bool:
    """Match section patterns without nested-word false positives.

    ``vision`` must not match ``revision``; ``mission`` must not match
    ``admissions``. Hyphenated / multi-word patterns stay substring checks.
    """
    p = (pattern or "").lower().strip()
    b = (blob or "").lower()
    if not p or not b:
        return False
    if re.search(r"[^a-z0-9]", p):
        return p in b
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(p)}(?![a-z0-9])", b))


def score_section_patterns(blob: str) -> tuple[str, int]:
    """Return (best_section, score) for a URL/title/heading blob."""
    best = "general"
    best_score = 0
    for section, patterns in SECTION_PATTERNS.items():
        score = sum(1 for p in patterns if section_pattern_matches(p, blob))
        if score > best_score:
            best_score = score
            best = section
    return best, best_score
