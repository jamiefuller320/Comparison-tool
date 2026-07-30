"""Deterministic Ofsted / ISI report précis helpers (verbatim excerpts only).

No LLM paraphrasing: every précis and quote must be a contiguous excerpt from
the source PDF text, with a footnote URL back to that file.
"""

from __future__ import annotations

import re
from typing import Any

UA = (
    "SchoolsideBot/0.1 (+https://github.com/jamiefuller320/Comparison-tool; "
    "parental school compare)"
)

OFSTED_WHAT_LIKE_HEADINGS = (
    "What is it like to attend this school?",
    "What is it like to attend this early years setting?",
    "What it's like to be a pupil at this school",
    "What is it like to be a pupil at this school",
)

OFSTED_SECTION_ENDINGS = (
    "What does the school do well and what does it need to do better?",
    "What does the early years setting do well and what does it need to do better?",
    "What does the school do well",
    "What does the early years setting do well",
    "Safeguarding",
    "Information about this school",
    "Inspection activities",
)

ISI_SUMMARY_HEADING = "Summary of inspection findings"
ISI_SUMMARY_ENDINGS = (
    "The extent to which the school meets the Standards",
    "Recommended next steps",
    "Section 1:",
)


def normalize_whitespace(text: str) -> str:
    """Collapse PDF line-wrap noise into readable prose."""
    if not text:
        return ""
    # Join hyphenated line breaks: aspirational-\nfor → aspirational for
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Soft-wrap lines inside paragraphs → spaces
    parts: list[str] = []
    for para in re.split(r"\n\s*\n", text):
        line = re.sub(r"\s*\n\s*", " ", para.strip())
        line = re.sub(r"\s+", " ", line)
        if line:
            parts.append(line)
    return "\n\n".join(parts)


def strip_pdf_chrome(text: str) -> str:
    """Drop repeating header/footer lines from Ofsted / ISI PDFs."""
    lines = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        low = line.lower()
        if low.startswith("inspection report:"):
            continue
        if re.fullmatch(r"\d+", line):
            continue
        if re.fullmatch(r"©\s*independent schools inspectorate.*", low):
            continue
        if re.match(r"^page\s+\d+", low):
            continue
        lines.append(raw)
    return "\n".join(lines)


def find_section(
    text: str,
    start_headings: tuple[str, ...],
    end_headings: tuple[str, ...],
) -> tuple[str | None, str | None]:
    """Return (section_heading, section_body) for the best matching heading.

    Skips table-of-contents hits (heading followed by dotted leaders).
    Prefers the last non-TOC match so body text wins over a contents page.
    """
    lower = text.lower()
    candidates: list[tuple[int, str]] = []
    for heading in start_headings:
        needle = heading.lower()
        start = 0
        while True:
            idx = lower.find(needle, start)
            if idx < 0:
                break
            after = text[idx + len(heading) : idx + len(heading) + 40]
            # TOC lines look like "SUMMARY ....... 3"
            if re.match(r"^\s*\.{3,}", after):
                start = idx + len(needle)
                continue
            candidates.append((idx, heading))
            start = idx + len(needle)
    if not candidates:
        return None, None
    # Prefer the last body heading (after contents).
    best_start, best_heading = candidates[-1]
    body_start = best_start + len(best_heading)
    body = text[body_start:]
    body_lower = body.lower()
    end_at = len(body)
    for ending in end_headings:
        idx = body_lower.find(ending.lower())
        if 0 <= idx < end_at:
            end_at = idx
    section = normalize_whitespace(body[:end_at].strip())
    return best_heading, section or None


def split_sentences(text: str) -> list[str]:
    """Rough sentence split that keeps abbreviations mostly intact."""
    if not text:
        return []
    cleaned = normalize_whitespace(text)
    # Prefer paragraph breaks first.
    chunks: list[str] = []
    for para in cleaned.split("\n\n"):
        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z“\"'])", para.strip())
        for part in parts:
            s = part.strip(" \t\"'")
            s = s.strip()
            if s:
                chunks.append(s)
    return chunks


def truncate_at_sentence(text: str, max_chars: int) -> str:
    text = normalize_whitespace(text).replace("\n\n", " ")
    if len(text) <= max_chars:
        return text
    cut = text[: max_chars + 1]
    # Prefer ending on a sentence boundary.
    m = re.search(r"^(.+?[.!?])(?:\s|$)", cut)
    if m and len(m.group(1)) >= max_chars // 2:
        return m.group(1).strip()
    # Else cut at last space.
    sp = cut.rfind(" ")
    if sp > max_chars // 2:
        return cut[:sp].rstrip(" ,;") + "…"
    return cut[:max_chars].rstrip() + "…"


def sentence_priority(sentence: str) -> int:
    """Higher = more useful for a parent-facing quote."""
    low = sentence.lower()
    score = 0
    for token in (
        "pupil",
        "child",
        "parent",
        "feel safe",
        "happy",
        "behave",
        "welcome",
        "nurtur",
        "care",
        "friend",
        "enjoy",
        "thrive",
        "inclusive",
        "wellbeing",
        "well-being",
    ):
        if token in low:
            score += 3
    if low.startswith("the provision is "):
        score -= 4
    if low.startswith("this inspection"):
        score -= 3
    if len(sentence) < 40:
        score -= 2
    if len(sentence) > 320:
        score -= 2
    return score


def pick_quotes(
    section: str,
    *,
    source_url: str,
    section_label: str,
    max_quotes: int = 2,
    max_chars: int = 240,
) -> list[dict[str, str]]:
    sentences = split_sentences(section)
    ranked = sorted(
        ((sentence_priority(s), -len(s), s) for s in sentences if 24 <= len(s) <= 400),
        reverse=True,
    )
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for _score, _neg_len, sentence in ranked:
        quote = truncate_at_sentence(sentence, max_chars)
        key = quote.lower()
        if key in seen:
            continue
        # Verbatim check against original section (allow whitespace normalize).
        compact_section = re.sub(r"\s+", "", section.lower())
        compact_quote = re.sub(r"\s+", "", quote.lower().rstrip("…"))
        if compact_quote and compact_quote not in compact_section:
            continue
        seen.add(key)
        out.append(
            {
                "text": quote,
                "section": section_label,
                "sourceUrl": source_url,
            }
        )
        if len(out) >= max_quotes:
            break
    return out


def extract_ofsted_precis(pdf_text: str, source_url: str) -> dict[str, Any] | None:
    cleaned = normalize_whitespace(strip_pdf_chrome(pdf_text))
    if not cleaned:
        return None

    precis = None
    # Prefer Outcome paragraph when present (ungraded / section 8 style).
    _, outcome = find_section(
        cleaned,
        ("Outcome",),
        OFSTED_WHAT_LIKE_HEADINGS + OFSTED_SECTION_ENDINGS,
    )
    if outcome:
        precis = truncate_at_sentence(outcome, 320)

    heading, what_like = find_section(
        cleaned, OFSTED_WHAT_LIKE_HEADINGS, OFSTED_SECTION_ENDINGS
    )
    quotes: list[dict[str, str]] = []
    if what_like:
        # Skip grade-only lead-in such as "The provision is good".
        body = what_like
        body = re.sub(
            r"^(The provision is (?:outstanding|good|requires improvement|inadequate)\.?\s*)",
            "",
            body,
            flags=re.I,
        )
        quotes = pick_quotes(
            body,
            source_url=source_url,
            section_label=heading or "What is it like to attend",
        )
        if not precis:
            precis = truncate_at_sentence(body, 320)

    if not precis and not quotes:
        # Older reports: first substantial paragraph after title block.
        paras = [p for p in cleaned.split("\n\n") if len(p) > 80]
        if not paras:
            return None
        precis = truncate_at_sentence(paras[0], 320)
        if len(paras) > 1:
            quotes = pick_quotes(
                paras[1],
                source_url=source_url,
                section_label="Inspection report",
                max_quotes=1,
            )

    if not precis and not quotes:
        return None
    return {
        "inspectionPrecis": precis,
        "inspectionQuotes": quotes,
        "inspectionPrecisSource": "ofsted",
    }


def extract_isi_precis(pdf_text: str, source_url: str) -> dict[str, Any] | None:
    cleaned = normalize_whitespace(strip_pdf_chrome(pdf_text))
    if not cleaned:
        return None
    # Prefer body heading, not TOC (TOC lines are long dotted leaders).
    heading, summary = find_section(
        cleaned, (ISI_SUMMARY_HEADING,), ISI_SUMMARY_ENDINGS
    )
    if not summary:
        return None
    # Numbered ISI paragraphs: "1. Leaders…" (may sit on one wrapped line).
    paras = re.findall(
        r"(?:^|\n|\s)(\d+\.\s+.+?)(?=(?:\s\d+\.\s+)|\Z)",
        summary,
        flags=re.S,
    )
    if not paras:
        paras = split_sentences(summary)
    else:
        paras = [normalize_whitespace(p) for p in paras]

    def _strip_isi_number(para: str) -> str:
        return re.sub(r"^\d+\.\s*", "", para).strip()

    clean_paras = [_strip_isi_number(p) for p in paras]
    precis = truncate_at_sentence(clean_paras[0], 320) if clean_paras else None
    quote_pool = "\n\n".join(clean_paras[1:4] if len(clean_paras) > 1 else clean_paras)
    quotes = pick_quotes(
        quote_pool,
        source_url=source_url,
        section_label=heading or ISI_SUMMARY_HEADING,
        max_quotes=2,
    )
    if not precis and not quotes:
        return None
    return {
        "inspectionPrecis": precis,
        "inspectionQuotes": quotes,
        "inspectionPrecisSource": "isi",
    }


def parse_ofsted_provider_latest_report(html: str) -> dict[str, str] | None:
    """Parse reports.ofsted.gov.uk provider page for the newest PDF."""
    # Prefer the first timeline event with a files.ofsted.gov.uk link.
    m = re.search(
        r'timeline__date"><time>([^<]+)</time>[\s\S]*?'
        r'href="(https://files\.ofsted\.gov\.uk/v1/file/\d+)"[^>]*>'
        r"([\s\S]*?)</a>",
        html,
        flags=re.I,
    )
    if not m:
        m2 = re.search(
            r'href="(https://files\.ofsted\.gov\.uk/v1/file/\d+)"',
            html,
            flags=re.I,
        )
        if not m2:
            return None
        return {
            "inspectionReportFileUrl": m2.group(1),
            "inspectionReportLabel": "Ofsted inspection report",
            "inspectionReportDateLabel": "",
        }
    date_label = m.group(1).strip()
    file_url = m.group(2).strip()
    title_html = m.group(3)
    title = re.sub(r"<[^>]+>", " ", title_html)
    title = re.sub(r"\s+", " ", title).strip()
    title = re.sub(r",?\s*PDF\s*-.*$", "", title, flags=re.I).strip()
    if not title:
        title = "Ofsted inspection report"
    label = f"{title} · {date_label}" if date_label else title
    return {
        "inspectionReportFileUrl": file_url,
        "inspectionReportLabel": label,
        "inspectionReportDateLabel": date_label,
    }


def normalize_ofsted_provider_url(school: dict[str, Any]) -> str | None:
    """Build a stable reports.ofsted.gov.uk provider URL when possible."""
    existing = (school.get("ofstedReportUrl") or "").strip()
    urn = str(school.get("urn") or "").strip()
    ofsted_urn = str(school.get("ofstedUrn") or "").strip()
    source = (school.get("ofstedSource") or "").lower()
    provider_blob = " ".join(
        str(school.get(k) or "")
        for k in ("providerType", "providerSubtype", "name")
    ).lower()
    is_childminder = source == "ofsted-consented-childminder" or (
        "childminder" in provider_blob and source != "ofsted-childcare"
    )

    def _provider_key() -> str | None:
        key = ofsted_urn or urn
        if not key:
            return None
        return key.split(":")[-1]

    # Childminders are /provider/17/ (day care is /16/). Rewrite mistaken /16/ links.
    if is_childminder:
        key = _provider_key()
        if key:
            return f"https://reports.ofsted.gov.uk/provider/17/{key}"

    if "reports.ofsted.gov.uk/provider/" in existing:
        return existing.split("?")[0].rstrip("/")

    if source == "ofsted-childcare" or ofsted_urn:
        key = _provider_key()
        if key:
            return f"https://reports.ofsted.gov.uk/provider/16/{key}"

    # Legacy ELS / school links → /provider/21/{urn}
    m = re.search(
        r"provider/(?:ELS|CARE|EY)/(\d+)",
        existing,
        flags=re.I,
    )
    if m:
        return f"https://reports.ofsted.gov.uk/provider/21/{m.group(1)}"

    if urn.isdigit():
        # State / independent school pages commonly use 21.
        return f"https://reports.ofsted.gov.uk/provider/21/{urn}"

    return existing or None


def clear_precis_fields(school: dict[str, Any]) -> None:
    for key in (
        "inspectionPrecis",
        "inspectionQuotes",
        "inspectionReportFileUrl",
        "inspectionReportLabel",
        "inspectionPrecisSource",
        "inspectionPrecisEnrichedAt",
    ):
        school.pop(key, None)
