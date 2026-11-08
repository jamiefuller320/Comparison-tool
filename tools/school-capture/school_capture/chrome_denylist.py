"""Exact website-chrome labels that must never be stored as offerings.

Matching is exact (after normalisation), not a substring. That keeps genuine
provision such as "Privacy and Security", "Accessibility Plan", "Staff Contact
Details" and "Calendar and Term Dates".

Seeded from the qualitative corpus review: Contact Details, Term Dates,
ParentPay / Parent Pay, Translate, Privacy, School Dinners, and the bare
Accessibility widget label.
"""

from __future__ import annotations

import re

# Normalised with the same rules as learned_qa_patterns.normalize_phrase.
EXACT_CHROME_LABELS: frozenset[str] = frozenset(
    {
        "contact details",
        "term dates",
        "parentpay",
        "parent pay",
        "translate",
        "privacy",
        "school dinners",
        "school dinner",
        "accessibility",
    }
)


def normalize_chrome_label(text: str) -> str:
    """Lower-case, collapse space, strip bullets and trailing punctuation."""
    cleaned = re.sub(r"\s+", " ", (text or "").lower()).strip()
    return cleaned.lstrip("•·▪◦\uf09f\u2022-–—* ").strip(" .;,:")


def is_exact_chrome_label(text: str) -> bool:
    """True when the whole label is seeded website chrome."""
    key = normalize_chrome_label(text)
    return bool(key) and key in EXACT_CHROME_LABELS
