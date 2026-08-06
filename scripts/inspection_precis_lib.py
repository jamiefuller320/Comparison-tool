"""Deterministic Ofsted / ISI report précis helpers (verbatim excerpts only).

No LLM paraphrasing: every précis and quote must be a contiguous excerpt from
the source PDF text, with a footnote URL back to that file.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
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
    # Parent View / feedback chrome often follows the main narrative and must
    # not be used as the parent-facing précis.
    "How can I feed back my views?",
    "How can I feed back my views",
    "Ofsted Parent View",
)

OFSTED_DO_WELL_HEADINGS = (
    "What does the school do well and what does it need to do better?",
    "What does the early years setting do well and what does it need to do better?",
    "What does the school do well and what does it need to do better",
    "What does the early years setting do well and what does it need to do better",
)

OFSTED_IMPROVE_HEADINGS = (
    "What does the school need to do to improve?",
    "What does the school need to do to improve further?",
    "What does the early years setting need to do to improve?",
    "What does the early years setting need to do to improve further?",
    "Areas for improvement",
    "Next steps",
)

OFSTED_DO_WELL_ENDINGS = (
    "Safeguarding",
    "Information about this school",
    "Inspection activities",
    "What does the school need to do to improve?",
    "What does the school need to do to improve further?",
    "What does the early years setting need to do to improve?",
    "Areas for improvement",
    "How can I feed back my views?",
    "How can I feed back my views",
    "Ofsted Parent View",
)

ISI_SUMMARY_HEADING = "Summary of inspection findings"
ISI_SUMMARY_ENDINGS = (
    "The extent to which the school meets the Standards",
    "Recommended next steps",
    "Section 1:",
)

ISI_NEXT_STEPS_HEADINGS = (
    "Recommended next steps",
    "What the school should do to improve",
)

_IMPROVE_HINT = re.compile(
    r"\b("
    r"need to|needs to|should|must|ought to|improve|improving|"
    r"not yet|inconsistent|less well|further work|develop further|"
    r"address|tackle|weakness|gap"
    r")\b",
    re.I,
)
_STRENGTH_HINT = re.compile(
    r"\b("
    r"strong|well|effective|high|positive|thrive|enjoy|safe|happy|"
    r"ambitious|inclusive|nurtur|excellent|outstanding|good"
    r")\b",
    re.I,
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
    prefer: str | None = None,
) -> list[dict[str, str]]:
    """prefer: 'strength' | 'improve' | None — bias sentence ranking."""
    sentences = split_sentences(section)

    def _score(sentence: str) -> int:
        score = sentence_priority(sentence)
        if prefer == "improve":
            if _IMPROVE_HINT.search(sentence):
                score += 8
            elif _STRENGTH_HINT.search(sentence):
                score -= 2
        elif prefer == "strength":
            if _IMPROVE_HINT.search(sentence) and not _STRENGTH_HINT.search(sentence):
                score -= 6
            if _STRENGTH_HINT.search(sentence):
                score += 4
        return score

    ranked = sorted(
        ((_score(s), -len(s), s) for s in sentences if 24 <= len(s) <= 400),
        reverse=True,
    )
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for _score_v, _neg_len, sentence in ranked:
        if prefer == "improve" and not _IMPROVE_HINT.search(sentence):
            continue
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


def _extract_highlight_buckets(
    cleaned: str,
    *,
    source_url: str,
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Return (strengths, improvements) as footnoted quote dicts."""
    strengths: list[dict[str, str]] = []
    improvements: list[dict[str, str]] = []

    improve_heading, improve_body = find_section(
        cleaned, OFSTED_IMPROVE_HEADINGS, OFSTED_DO_WELL_ENDINGS + ("Safeguarding",)
    )
    if improve_body:
        improvements = pick_quotes(
            improve_body,
            source_url=source_url,
            section_label=improve_heading or "Areas for improvement",
            max_quotes=3,
            max_chars=260,
            prefer="improve",
        )
        if not improvements:
            improvements = pick_quotes(
                improve_body,
                source_url=source_url,
                section_label=improve_heading or "Areas for improvement",
                max_quotes=2,
                max_chars=260,
            )

    do_heading, do_body = find_section(
        cleaned, OFSTED_DO_WELL_HEADINGS, OFSTED_DO_WELL_ENDINGS
    )
    if do_body:
        strengths = pick_quotes(
            do_body,
            source_url=source_url,
            section_label=do_heading or "What the school does well",
            max_quotes=3,
            max_chars=260,
            prefer="strength",
        )
        if not improvements:
            improvements = pick_quotes(
                do_body,
                source_url=source_url,
                section_label=do_heading or "What the school needs to do better",
                max_quotes=2,
                max_chars=260,
                prefer="improve",
            )

    return strengths, improvements


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
        precis = truncate_at_sentence(strip_ofsted_end_matter(outcome), 320)

    heading, what_like = find_section(
        cleaned, OFSTED_WHAT_LIKE_HEADINGS, OFSTED_SECTION_ENDINGS
    )
    quotes: list[dict[str, str]] = []
    if what_like:
        # Skip grade-only lead-in such as "The provision is good".
        body = strip_ofsted_end_matter(what_like)
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
        paras = [
            p
            for p in cleaned.split("\n\n")
            if len(p) > 80 and not looks_like_letterhead_junk(p)
        ]
        if not paras:
            return None
        precis = truncate_at_sentence(strip_ofsted_end_matter(paras[0]), 320)
        if len(paras) > 1:
            quotes = pick_quotes(
                paras[1],
                source_url=source_url,
                section_label="Inspection report",
                max_quotes=1,
            )

    strengths, improvements = _extract_highlight_buckets(
        cleaned, source_url=source_url
    )
    # If the do-well extract was empty, fall back to what-it-is-like quotes as strengths.
    if not strengths and quotes:
        strengths = [
            {**q, "section": q.get("section") or "What it is like to attend"}
            for q in quotes[:2]
        ]

    # Never ship Parent View / letterhead chrome as the précis — prefer a quote.
    if precis and looks_like_letterhead_junk(precis):
        precis = None
    if not precis:
        fallback = (strengths[0]["text"] if strengths else None) or (
            quotes[0]["text"] if quotes else None
        )
        if fallback and not looks_like_letterhead_junk(fallback):
            precis = truncate_at_sentence(fallback, 320)

    if not precis and not quotes and not strengths and not improvements:
        return None
    return {
        "inspectionPrecis": precis,
        "inspectionQuotes": quotes,
        "inspectionStrengths": strengths or None,
        "inspectionImprovements": improvements or None,
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
    strengths = pick_quotes(
        "\n\n".join(clean_paras[:3]),
        source_url=source_url,
        section_label=heading or ISI_SUMMARY_HEADING,
        max_quotes=3,
        max_chars=260,
        prefer="strength",
    )
    next_heading, next_body = find_section(
        cleaned, ISI_NEXT_STEPS_HEADINGS, ("Section 1:", "The extent to which")
    )
    improvements: list[dict[str, str]] = []
    if next_body:
        improvements = pick_quotes(
            next_body,
            source_url=source_url,
            section_label=next_heading or "Recommended next steps",
            max_quotes=3,
            max_chars=260,
            prefer="improve",
        )
    if not improvements:
        improvements = pick_quotes(
            "\n\n".join(clean_paras),
            source_url=source_url,
            section_label=heading or ISI_SUMMARY_HEADING,
            max_quotes=2,
            max_chars=260,
            prefer="improve",
        )
    if not precis and not quotes and not strengths and not improvements:
        return None
    return {
        "inspectionPrecis": precis,
        "inspectionQuotes": quotes,
        "inspectionStrengths": strengths or None,
        "inspectionImprovements": improvements or None,
        "inspectionPrecisSource": "isi",
    }


# Timeline titles that are not usable parent-facing inspection reports.
_NON_INSPECTION_TITLE_RE = re.compile(
    r"(academy\s+conversion\s+letter|material\s+change|"
    r"pre-?registration\s+inspection|registration\s+visit)",
    re.I,
)


def is_non_inspection_report_label(label: str | None) -> bool:
    """True when a harvested report label is a conversion/admin letter, not an inspection."""
    return bool(_NON_INSPECTION_TITLE_RE.search(label or ""))


_PROSE_HINT = re.compile(
    r"\b(pupils?|child|children|school|staff|leaders?|parents?|curriculum|"
    r"safeguard(?:ing)?|learning|behaviour|attendance|reading|maths|teachers?)\b",
    re.I,
)


def looks_like_letterhead_junk(text: str | None) -> bool:
    """True when extracted précis is PDF chrome / Parent View boilerplate."""
    clean = (text or "").strip()
    if not clean:
        return False
    low = clean.lower()
    letters = sum(1 for ch in clean if ch.isalpha())
    # Fragments left after cutting end-matter (e.g. "s. 1 and 2 October 2024 4").
    if len(clean) < 40 and not (_PROSE_HINT.search(clean) and letters >= 20):
        return True
    if "piccadilly gate" in low or (
        "store street" in low and "manchester" in low
    ):
        return True
    # Ofsted report end-matter — not a school narrative.
    if "how can i feed back my views" in low:
        return True
    if "ofsted parent view" in low and (
        "give ofsted your opinion" in low
        or "other parents and carers think" in low
        or "when deciding which schools to inspect" in low
    ):
        return True
    # Reject date/page crumbs with almost no letters; keep short pupil sentences.
    if letters < 18:
        return True
    return False


def strip_ofsted_end_matter(text: str | None) -> str:
    """Cut Parent View / feedback chrome that leaked past section boundaries."""
    raw = (text or "").strip()
    if not raw:
        return ""
    cut = re.split(
        r"(?i)\bhow can i feed back my views\b|\bofsted parent view\b",
        raw,
        maxsplit=1,
    )[0].strip()
    return cut


def _timeline_pdf_candidates(html: str) -> list[dict[str, str]]:
    """Ordered newest-first timeline PDF entries from an Ofsted provider page."""
    found: list[dict[str, str]] = []
    for m in re.finditer(
        r'timeline__date"><time>([^<]+)</time>[\s\S]*?'
        r'href="(https://files\.ofsted\.gov\.uk/v1/file/\d+)"[^>]*>'
        r"([\s\S]*?)</a>",
        html,
        flags=re.I,
    ):
        date_label = m.group(1).strip()
        file_url = m.group(2).strip()
        title_html = m.group(3)
        title = re.sub(r"<[^>]+>", " ", title_html)
        title = re.sub(r"\s+", " ", title).strip()
        title = re.sub(r",?\s*PDF\s*-.*$", "", title, flags=re.I).strip()
        if not title:
            title = "Ofsted inspection report"
        label = f"{title} · {date_label}" if date_label else title
        found.append(
            {
                "inspectionReportFileUrl": file_url,
                "inspectionReportLabel": label,
                "inspectionReportDateLabel": date_label,
                "title": title,
            }
        )
    return found


def parse_ofsted_provider_latest_report(html: str) -> dict[str, str] | None:
    """Parse reports.ofsted.gov.uk provider page for the newest usable inspection PDF.

    Skips academy conversion letters, material-change notices, and
    pre-registration paperwork so précis extraction reads a real inspection.
    """
    for candidate in _timeline_pdf_candidates(html):
        if is_non_inspection_report_label(candidate["title"]) or is_non_inspection_report_label(
            candidate["inspectionReportLabel"]
        ):
            continue
        return {
            "inspectionReportFileUrl": candidate["inspectionReportFileUrl"],
            "inspectionReportLabel": candidate["inspectionReportLabel"],
            "inspectionReportDateLabel": candidate["inspectionReportDateLabel"],
        }

    # Fallback: bare file link with no timeline chrome (keep prior behaviour).
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


def _school_ofsted_provider_codes(school: dict[str, Any]) -> list[int]:
    """Ofsted reports site provider-type codes to try for a school URN.

    Empirically: primary/junior often 21, secondary 23, all-through either.
    """
    phase = (school.get("phase") or "").lower()
    phases = [str(p).lower() for p in (school.get("phases") or [])]
    age = (school.get("ageRange") or "").lower()
    secondary_ish = (
        phase in {"secondary", "ks3"}
        or "ks4" in phases
        or "ks3" in phases
        or bool(re.search(r"\b1[1-9]\b.*\b1[6-9]\b", age))
    )
    primary_ish = (
        phase in {"primary", "middle deemed primary"}
        or "ks2" in phases
        or "ks1" in phases
    )
    if phase == "all-through" or (secondary_ish and primary_ish):
        return [21, 23]
    if secondary_ish and not primary_ish:
        return [23, 21]
    return [21, 23]


def ofsted_provider_url_candidates(school: dict[str, Any]) -> list[str]:
    """Ordered candidate provider pages for Ofsted report discovery."""
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

    out: list[str] = []

    def add(url: str | None) -> None:
        if not url:
            return
        clean = url.split("?")[0].rstrip("/")
        if clean and clean not in out:
            out.append(clean)

    if is_childminder:
        key = _provider_key()
        if key:
            add(f"https://reports.ofsted.gov.uk/provider/17/{key}")
        return out

    if "reports.ofsted.gov.uk/provider/" in existing:
        add(existing)

    if source == "ofsted-childcare":
        key = _provider_key()
        if key:
            add(f"https://reports.ofsted.gov.uk/provider/16/{key}")
        return out

    if urn.isdigit():
        for code in _school_ofsted_provider_codes(school):
            add(f"https://reports.ofsted.gov.uk/provider/{code}/{urn}")

    # Legacy ELS links — keep as a final attempt (redirects when reachable).
    if existing and "ofsted.gov.uk" in existing:
        add(existing)

    return out


def normalize_ofsted_provider_url(school: dict[str, Any]) -> str | None:
    """Best single provider URL guess (first candidate)."""
    candidates = ofsted_provider_url_candidates(school)
    return candidates[0] if candidates else None


PRECIS_FIELD_KEYS = (
    "inspectionPrecis",
    "inspectionQuotes",
    "inspectionStrengths",
    "inspectionImprovements",
    "inspectionReportFileUrl",
    "inspectionReportLabel",
    "inspectionPrecisSource",
    "inspectionPrecisEnrichedAt",
)


def clear_precis_fields(school: dict[str, Any]) -> None:
    for key in PRECIS_FIELD_KEYS:
        school.pop(key, None)


def merge_precis_fields_from_previous(
    records: list[dict[str, Any]],
    previous_path: Path,
    *,
    list_key: str = "schools",
) -> int:
    """Copy qualitative precis fields from a previous index by URN.

    Harvest rewrites wipe the index; call this before write so a refresh does
    not discard soft-launch qualitative coverage.
    """
    path = Path(previous_path)
    if not path.exists():
        return 0
    try:
        prev = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return 0
    prev_rows = prev.get(list_key) or prev.get("providers") or []
    by_urn = {str(row.get("urn") or ""): row for row in prev_rows if row.get("urn")}
    restored = 0
    for row in records:
        urn = str(row.get("urn") or "")
        old = by_urn.get(urn)
        if not old or not old.get("inspectionPrecis"):
            continue
        for key in PRECIS_FIELD_KEYS:
            if old.get(key) is not None and row.get(key) is None:
                row[key] = old[key]
        # Prefer a known-good /17/ childminder link over a stale /16/ rewrite.
        old_url = old.get("ofstedReportUrl") or ""
        new_url = row.get("ofstedReportUrl") or ""
        if "/provider/17/" in old_url and "/provider/16/" in new_url:
            row["ofstedReportUrl"] = old_url
        restored += 1
    return restored
