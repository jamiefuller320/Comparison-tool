"""Parse GOV.UK *as_at_DD_Month_YYYY* tokens in MI CSV URLs."""

from __future__ import annotations

import re

# Full names plus common gov.uk abbreviations (Jan–Apr, Sep, etc.).
_MONTH_NUMBERS: dict[str, int] = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}

_AS_AT_CSV_RE = re.compile(
    r"as_at_(\d{1,2})_([A-Za-z]+)_(\d{4})\.csv",
    flags=re.IGNORECASE,
)
_AS_AT_RE = re.compile(
    r"as_at_(\d{1,2})_([A-Za-z]+)_(\d{4})",
    flags=re.IGNORECASE,
)


def month_number(token: str) -> int:
    if not token:
        return 0
    return _MONTH_NUMBERS.get(token.strip().lower(), 0)


def ofsted_csv_sort_key(url: str) -> tuple[int, int, int]:
    m = _AS_AT_CSV_RE.search(url)
    if not m:
        return (0, 0, 0)
    return (int(m.group(3)), month_number(m.group(2)), int(m.group(1)))


def as_at_label_from_url(url: str) -> str:
    m = _AS_AT_RE.search(url)
    if not m:
        return "unknown"
    return f"{m.group(1)} {m.group(2)} {m.group(3)}"
