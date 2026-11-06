"""Strip GIAS placeholder tokens from address lines.

Edubase uses a single-letter ``z`` (and a few other null tokens) for missing
address parts. Those tokens must not be stored or published.
"""

from __future__ import annotations

import re

# Whole comma-separated segments (or a whole town/postcode/telephone field).
# Keep this set aligned with ``src/lib/giasAddress.ts``.
GIAS_NULL_TOKENS = frozenset(
    {
        "z",
        "na",
        "n/a",
        "n.a",
        "n.a.",
        "none",
        "null",
        "nil",
        "-",
        "—",
        ".",
        "not applicable",
        "not recorded",
        "does not apply",
        "not available",
    }
)


def is_gias_null_token(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in GIAS_NULL_TOKENS


def strip_gias_address(address: str | None) -> str | None:
    """Drop null segments from a comma-joined GIAS address. ``None`` if empty."""
    if address is None:
        return None
    parts: list[str] = []
    for raw in str(address).split(","):
        token = raw.strip()
        if not token or is_gias_null_token(token):
            continue
        parts.append(token)
    if not parts:
        return None
    return ", ".join(parts)


def strip_gias_token(value: str | None) -> str | None:
    """Clear a single field when the whole value is a GIAS null token."""
    if value is None:
        return None
    text = str(value).strip()
    if not text or is_gias_null_token(text):
        return None
    return text


def parse_gias_date(raw: str | None) -> str | None:
    """Normalize GIAS dates (DD-MM-YYYY or YYYY-MM-DD) to YYYY-MM-DD."""
    text = (raw or "").strip()
    if not text:
        return None
    match = re.match(r"^(\d{2})-(\d{2})-(\d{4})$", text)
    if match:
        return f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", text)
    if match:
        return text
    return None
