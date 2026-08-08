"""URL, page-type, and sentence filters to reduce boilerplate noise."""

from __future__ import annotations

import re
from enum import Enum
from urllib.parse import urlparse

# Paths that are almost never useful for qualitative school-choice evidence.
BLOCKED_URL_PATTERNS: tuple[str, ...] = (
    "cookie",
    "cookies",
    "privacy",
    "gdpr",
    "data-protection",
    "terms-and-conditions",
    "terms-of-use",
    "legal",
    "disclaimer",
    "accessibility-statement",
    "/accessibility/",
    "webmail",
    "login",
    "sign-in",
    "signin",
    "password",
    "vle",
    "office365",
    "google-analytics",
    "wp-admin",
    "sitemap",
    "search?",
    "feed",
    "/rss",
    "complaints",
    "freedom-of-information",
    "foi",
)

# Compliance / boilerplate page types — low confidence for most subject areas.
class PageType(str, Enum):
    SUBSTANTIVE = "substantive"
    ACCESSIBILITY = "accessibility"
    POLICY = "policy"
    ADMIN = "admin"
    UNKNOWN = "unknown"


POLICY_URL_HINTS = (
    "privacy",
    "cookie",
    "gdpr",
    "policy",
    "policies",
    "terms",
    "complaints",
    "freedom-of-information",
)

ACCESSIBILITY_URL_HINTS = (
    "accessibility-statement",
    "/accessibility/",
    "accessibility/",
)

ADMIN_URL_HINTS = (
    "login",
    "sign-in",
    "signin",
    "webmail",
    "vle",
    "office365",
    "wp-admin",
)

# Sentence-level boilerplate — cookie banners, form labels, compliance text.
BLOCKED_SENTENCE_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.I)
    for p in (
        r"\bcookie(s)?\b",
        r"\bconsent\b",
        r"\bgdpr\b",
        r"\bdata protection\b",
        r"\bjavascript\b.*\b(enabled|disabled)\b",
        r"\bform auto.?complete\b",
        r"\bnon-compliance\b",
        r"\benforcement procedure\b",
        r"\bpublic sector bod(y|ies)\b",
        r"\bequality and human rights commission\b",
        r"\bwcag\b",
        r"\bscreen reader\b",
        r"\bresponsive design\b.*\bdevices\b",
        r"\bclick (on )?the links? below\b",
        r"\bchild'?s (name|class)\b.*\brelationship\b",
        r"\bmanagement information system\b",
        r"\barbor\b",
        r"\ball rights reserved\b",
        r"\bpowered by\b",
        r"\baccept all\b.*\bcookies\b",
        r"\bmanage (your )?preferences\b",
        # Site chrome often extracted as a one-line "signal"
        r"^ofsted report\b",
        r"^parent view\b",
        r"^staff portal\b",
        r"^report student absence\b",
        r"^name of child\b",
        # Generic parenting tips from SEN leaflets — not school curriculum evidence
        r"\blimit screen time\b",
        r"\bread with your child\b",
        r"\boffer a balanced and varied diet\b",
        r"\bmake sure they get enough sleep\b",
        r"\bpraising them for their hard work\b",
        r"\bcome to meetings such as parents'? evenings\b",
        r"^by creating this policy\b",
        r"\bby creating this policy\b",
        r"^this policy (aims|sets out|outlines|applies|covers)\b",
        r"\bthe purpose of this policy\b",
    )
)

# Home/parenting advice that must not be scored as curriculum/enrichment.
PARENT_HOME_ADVICE_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.I)
    for p in (
        r"\blimit screen time\b",
        r"\bread with your child\b",
        r"\bbalanced and varied diet\b",
        r"\benough sleep\b",
        r"\bpraise(ing)? (them|effort|hard work)\b",
        r"\bpersonal circumstances\b",
        r"\bencourage your child to read\b",
        r"\bbuild resilience to challenges\b",
    )
)

# Admissions / settling-in marketing — not enrichment clubs.
ADMISSIONS_MARKETING_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.I)
    for p in (
        r"\bstay\s*&\s*play\b",
        r"\bstay and play\b",
        r"\bsettling[- ]in\b",
        r"\bnew starters?\b",
        r"\bin-year transfers?\b",
        r"\bnot yet applied for a place\b",
        r"\boversubscribed\b",
        r"\bfill in form\b",
        r"\byear r\s*20\d{2}\b",
        r"\bdue to start school in september\b",
        r"\bwarmly welcome visits\b",
        r"\bopen (day|evening|morning)s?\b",
        r"\btaster (day|session)s?\b",
    )
)

# School-context words — evidence should mention pupils/school life, not just generic terms.
SCHOOL_CONTEXT_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.I)
    for p in (
        r"\bpupils?\b",
        r"\bchildren\b",
        r"\bstudents?\b",
        r"\bschool\b",
        r"\blearn(ing|ers?)\b",
        r"\bteach(ing|ers?)\b",
        r"\bcurriculum\b",
        r"\bclass(room)?s?\b",
        r"\bwe (offer|provide|believe|strive|aim)\b",
        r"\bour (school|children|pupils|values|ethos|vision)\b",
        r"\bextra.?curricular\b",
        r"\bclubs?\b",
        r"\bgcse\b",
        r"\ba-?levels?\b",
        r"\bsend\b",
        r"\bsen\b",
        r"\binclusion\b",
        r"\bparents?\b",
        r"\bfamilies\b",
    )
)

# Areas where accessibility-statement pages might legitimately contribute (very limited).
ACCESSIBILITY_ALLOWED_AREAS = frozenset({"send"})


def url_path_blob(url: str) -> str:
    parsed = urlparse(url.lower())
    return f"{parsed.netloc}{parsed.path}?{parsed.query}"


def is_blocked_url(url: str) -> bool:
    blob = url_path_blob(url)
    return any(p in blob for p in BLOCKED_URL_PATTERNS)


def classify_page_type(url: str, title: str = "") -> PageType:
    blob = f"{url_path_blob(url)} {title.lower()}"
    if any(h in blob for h in ADMIN_URL_HINTS):
        return PageType.ADMIN
    if any(h in blob for h in ACCESSIBILITY_URL_HINTS):
        return PageType.ACCESSIBILITY
    if any(h in blob for h in POLICY_URL_HINTS):
        return PageType.POLICY
    return PageType.SUBSTANTIVE


def is_blocked_sentence(sentence: str) -> bool:
    if any(p.search(sentence) for p in BLOCKED_SENTENCE_PATTERNS):
        return True
    try:
        from school_capture.learned_qa_patterns import phrase_matches_learned

        return phrase_matches_learned(sentence)
    except Exception:  # noqa: BLE001 — learning store must never break ingest
        return False


def looks_like_parent_home_advice(sentence: str) -> bool:
    """True for parenting tip sheets that must not feed curriculum/enrichment."""
    hits = sum(1 for p in PARENT_HOME_ADVICE_PATTERNS if p.search(sentence))
    return hits >= 1


def looks_like_admissions_marketing(sentence: str) -> bool:
    """True for settling-in / open-day / application marketing copy."""
    hits = sum(1 for p in ADMISSIONS_MARKETING_PATTERNS if p.search(sentence))
    return hits >= 1


def has_school_context(sentence: str) -> bool:
    return any(p.search(sentence) for p in SCHOOL_CONTEXT_PATTERNS)


def page_type_confidence_multiplier(page_type: PageType, area: str) -> float:
    if page_type == PageType.SUBSTANTIVE:
        return 1.0
    if page_type == PageType.ACCESSIBILITY:
        return 0.15 if area in ACCESSIBILITY_ALLOWED_AREAS else 0.05
    if page_type == PageType.POLICY:
        return 0.1
    if page_type == PageType.ADMIN:
        return 0.0
    return 0.7
