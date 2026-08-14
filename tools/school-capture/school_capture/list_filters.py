"""Blocklist and heuristics for navigation / junk list items."""

from __future__ import annotations

import re

from school_capture.offering_terms import (
    ACTIVITY_TERMS,
    CURRICULUM_SUBJECT_TERMS,
    PROVISION_TERMS,
)

NAV_LIST_LABELS: frozenset[str] = frozenset(
    {
        "home",
        "home page",
        "contact",
        "contact us",
        "admissions",
        "about us",
        "about",
        "news",
        "calendar",
        "parents",
        "parents & carers",
        "parents and carers",
        "parents info",
        "policies",
        "governors",
        "governing body",
        "staff",
        "vacancies",
        "current vacancies",
        "search",
        "login",
        "menu",
        "clubs",
        "curriculum",
        "send",
        "useful information",
        "key information",
        "statutory information",
        "statutory info",
        "financial information",
        "online payments",
        "absence reporting",
        "attendance information",
        "awards and recognition",
        "british values",
        "home learning",
        "school meals",
        "term dates",
        # Recurring PrimarySite / school CMS chrome
        "ofsted report",
        "ofsted",
        "parent view",
        "staff portal",
        "report student absence",
        "report absence",
        "student absence",
        "special educational needs",
        "special educational needs & disabilities",
        "special educational needs and disabilities",
        "hampshire county council",
        "map of hampshire support",
        "review cycle and",
        "use of ict",
        "assess, plan, do,",
        "ehcp myths and",
        "general data protection regulations",
        "general data protection regulation",
        "slavery statement",
        "terms & conditions",
        "terms and conditions",
        "privacy notice",
        "cookie policy",
        "assessment",
        "definitions",
        "register",
        "families",
        "heads’ welcome",
        "heads' welcome",
        "head's welcome",
        "meet the team",
        "our staff",
        "staff list",
        "staff directory",
        "admission process",
        "nursery fees",
        "school fees",
        "open days",
        "open day",
        "pupil’s date of birth",
        "pupil's date of birth",
        "staff duties & pupil supervision",
        "staff duties and pupil supervision",
        # Staff / statutory policy TOC labels (not parent-facing provision)
        "confidentiality",
        "health and safety policy",
        "health and safety policy.",
        "manual of personnel practice",
        "manual of personnel practice).",
        "pay and staff appraisal",
        "safeguarding",
        "single equalities statement",
        "staff code of conduct",
        "code of conduct",
        "version date author status summary",
        "whistleblowing",
        "acceptable use of ict",
    }
)

# Fragments that mark site chrome / form labels / county-directory noise.
CHROME_FRAGMENTS: tuple[str, ...] = (
    "ofsted report",
    "parent view",
    "staff portal",
    "student absence",
    "report absence",
    "name of child",
    "hampshire county council",
    "map of hampshire",
    "learning disability care",
    "specialist eating disorder",
    "occupational therpay",  # misspelled county-directory row on Bursledon SEN map
    "county specialist",
    "special school outreach",
    "personnel practice",
    "staff appraisal",
    "equalities statement",
    "code of conduct",
    "whistleblowing",
    "version date author",
    "current vacancies",
    "key information",
    "statutory information",
    "financial information",
    "online payments",
    "data protection regulation",
    "slavery statement",
    "terms & conditions",
    "terms and conditions",
    "privacy notice",
    "cookie policy",
    "heads’ welcome",
    "heads' welcome",
    "meet the team",
    "staff directory",
    "equalities assessment",
    "admission process",
    "nursery fees",
    "school fees",
    "open days",
)

# Staff-directory / named-person list items mistaken for clubs or provision.
HONORIFIC_PERSON_RE = re.compile(
    r"^(?:mr|mrs|ms|miss|dr|sir|dame)\.?\s+\S",
    re.I,
)
# "Smith — Teacher", "Jane Doe - SENCO", truncated "Mrs Hicks and"
NAMED_ROLE_RE = re.compile(
    r"^[A-Z][a-z]+(?:\s+[A-Z][a-z'’\-]+){0,3}\s*[–—\-:,]\s*"
    r"(?:teacher|head|principal|senco|coach|governor|ta|hlta|"
    r"assistant|leader|coordinator|co-ordinator|inclusive|cancelled)\b",
    re.I,
)
TRAILING_PERSON_ROLE_RE = re.compile(
    r"\b(?:executive\s+)?(?:principal|headteacher|head\s+teacher|senco)\s*$",
    re.I,
)


def looks_like_named_person(item: str) -> bool:
    """True when a list label is a staff/person name, not a club or provision."""
    text = re.sub(r"\s+", " ", (item or "").strip())
    if not text:
        return False
    # Drop trailing punctuation / truncated conjunctions from CMS scrapes.
    cleaned = re.sub(r"[,&]\s*$", "", text).strip()
    if HONORIFIC_PERSON_RE.match(cleaned):
        return True
    if NAMED_ROLE_RE.match(cleaned):
        return True
    # "Mr Sasso Executive Principal" — honorific already caught; role-only titles
    # with a capitalised personal name and no activity keyword.
    if (
        TRAILING_PERSON_ROLE_RE.search(cleaned)
        and len(cleaned.split()) <= 6
        and cleaned[:1].isupper()
        and not any(
            t in cleaned.lower()
            for t in ("club", "sport", "choir", "orchestra", "team")
        )
    ):
        return True
    return False

JUNK_LIST_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.I)
    for p in (
        r"\.(jpg|jpeg|png|gif|pdf|docx?|xlsx?)$",
        r"^https?:",
        r"www\.",
        r"\.org\.uk",
        r"\.sch\.uk",
        r"policy\s+20\d{2}",
        r"admission(s)?\s+policy",
        r"^[a-z]$",
        r"[▼▾▸]",
        r"^both before school$",
        r"^after school$",
        r"^they ",
        r"^with a ",
        r"^of course$",
        r"^of course,",
        r"^website can",
        r"^meet our ",
        r"^see our ",
        r"https?:",
        r"clubspark",
        r"parents info",
        r"useful information",
        r"curriculum,",
        r"will cost £",
        r"£\d",
        r"^& activities",
        r"^run monday",
        r"^speaking$",
        r"^listening skills$",
        r"^staff$",
        r"^imagination$",
        r"^creativity$",
        r"^in years \d+",
        # Form fields / truncated flowchart labels / parent tip bullets
        r":\s*$",
        r"\bname of child\b",
        r"\bclass:\b",
        r"^limit screen time$",
        r"^read with your child$",
        r"^offer a balanced",
        r"^make sure they get enough sleep$",
        r"^come to meetings",
        r"^assess,\s*plan,\s*do",
        r"^ehcp myths",
        r"^review cycle",
        r"^social,\s*emotional\s*&?\s*$",
        r"^educational$",
        r"^physio(therapy)?$",
        # Policy titles / TOC debris
        r"\bpolicy\.?\s*$",
        r"\bpolicies\b",
        r"personnel practice",
        r"staff (code of )?conduct",
        r"version date",
        r"status summary",
        r"^key information",
        r"^statutory info",
        r"^current vacancies$",
        r"^online payments$",
        r"slavery statement",
        r"data protection regulation",
        # Staff directory rows scraped into activity lists
        r"^(mr|mrs|ms|miss|dr)\.?\s+",
        r"\binclusive\s*$",
        r"\bcancelled\s*$",
        r"\b(deputy|assistant)\s+headteachers?\b",
        r"\bheadteachers?\s+and\s+assistant\b",
    )
)


def is_nav_or_junk_list_item(item: str) -> bool:
    lower = re.sub(r"\s+", " ", item.lower()).strip()
    # Strip common PDF/private-use bullet glyphs before matching.
    lower = lower.lstrip("•·▪◦\uf09f\u2022-–—* ").strip()
    if not lower:
        return True
    if looks_like_named_person(item):
        return True
    if lower in NAV_LIST_LABELS:
        return True
    if lower.rstrip("»›>") in NAV_LIST_LABELS:
        return True
    if lower in POLICY_DOCUMENT_LABELS:
        return True
    if any(frag in lower for frag in CHROME_FRAGMENTS):
        return True
    if any(p.search(item) for p in JUNK_LIST_PATTERNS):
        return True
    if any(p.search(lower) for p in JUNK_LIST_PATTERNS):
        return True
    try:
        from school_capture.learned_qa_patterns import phrase_matches_learned

        if phrase_matches_learned(lower):
            return True
    except Exception:  # noqa: BLE001 — learning store must never break ingest
        pass
    if "http" in lower or "www." in lower:
        return True
    # Menu breadcrumbs
    if " & " in item and any(x in lower for x in ("curriculum", "send", "information")):
        return True
    # Long items are usually sentences, not club labels
    if len(lower.split()) > 7:
        return True
    # Title-case menu labels without verbs (e.g. "Alver Valley Creative Hub" on its own can be ok,
    # but single generic words are not).
    if len(lower.split()) == 1 and lower not in {
        "football",
        "rugby",
        "netball",
        "choir",
        "cricket",
        "tennis",
        "dance",
        "drama",
        "art",
        "music",
        "chess",
        "coding",
    }:
        return len(lower) < 8
    return False


def is_thematic_heading(heading: str) -> bool:
    if not heading:
        return False
    blob = heading.lower()
    thematic = (
        "club",
        "sport",
        "music",
        "curriculum",
        "subject",
        "enrichment",
        "wraparound",
        "breakfast",
        "childcare",
        "after school",
        "send",
        "sen",
        "inclusion",
        "ethos",
        "values",
        "pastoral",
        "wellbeing",
        "community",
        "gcse",
        "option",
    )
    return any(t in blob for t in thematic)


def _term_in_text(term: str, text: str) -> bool:
    if " " in term or "-" in term:
        return term in text
    return bool(re.search(rf"\b{re.escape(term)}\b", text, re.I))


def is_plausible_list_offering(item: str) -> bool:
    """List items should look like club/subject/provision labels, not nav or prose."""
    if looks_like_named_person(item):
        return False
    if is_nav_or_junk_list_item(item):
        return False
    lower = item.lower()
    known = PROVISION_TERMS + ACTIVITY_TERMS + CURRICULUM_SUBJECT_TERMS
    if any(_term_in_text(term, lower) for term in known):
        # Still reject if it's clearly a long sentence despite containing a keyword
        if len(lower.split()) > 6:
            return False
        if any(p in lower for p in (" is called ", " of our ", " of personal ", " either ", " including ")):
            return False
        # "Mrs Swallow Inclusive NATURE CLUB" — person-led scrape, not a club label.
        if HONORIFIC_PERSON_RE.match(item.strip()):
            return False
        return True
    words = item.split()
    if not 1 <= len(words) <= 5:
        return False
    prose_markers = (" the ", " our ", " they ", " with ", " only ", " can ", " will ", " each ")
    if any(m in f" {lower} " for m in prose_markers):
        return False
    # Short title-case labels: "House Captain", "Climate Ambassador"
    if 1 <= len(words) <= 5:
        if words[0][:1].isupper() and all(
            w[:1].isupper() or w.lower() in {"and", "of", "&", "for"} for w in words
        ):
            return True
    return False


POLICY_DOCUMENT_LABELS: frozenset[str] = frozenset(
    {
        "confidentiality",
        "health and safety policy",
        "health and safety policy.",
        "manual of personnel practice",
        "manual of personnel practice).",
        "pay and staff appraisal",
        "safeguarding",
        "single equalities statement",
        "staff code of conduct",
        "code of conduct",
        "version date author status summary",
        "whistleblowing",
        "acceptable use of ict",
    }
)


# Need-type / external-agency labels belong on SEND pages, not community engagement.
SEND_DIRECTORY_LABELS: frozenset[str] = frozenset(
    {
        "cognition and learning",
        "cognition & learning",
        "communication and interaction",
        "sensory and physical",
        "physical & sensory",
        "physical and sensory",
        "social, emotional and mental health",
        "social, emotional & mental health",
        "semh wellbeing",
        "primary behaviour",
        "school nursing team",
        "special school",
        "speech & language",
        "speech and language",
        "zones of regulation",
    }
)

def filter_offerings(items: list[str], *, area: str | None = None) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    area_key = (area or "").lower()
    for raw in items:
        item = raw.strip()
        if not item or not is_plausible_list_offering(item):
            continue
        key = item.lower()
        # Community should be PTA / parents evening / local links — not SEN directories.
        if area_key == "community" and key in SEND_DIRECTORY_LABELS:
            continue
        if area_key in {"community", "ethos"} and (
            key in POLICY_DOCUMENT_LABELS or "policy" in key or "personnel" in key
        ):
            continue
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out
