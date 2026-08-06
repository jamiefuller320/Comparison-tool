"""Cross-school learned URL/anchor terms from successful captures."""

from __future__ import annotations

import json
import re
from pathlib import Path

from school_capture.url_discovery import path_terms

DEFAULT_PATH = Path("output/learned-url-terms.json")
MIN_TERM_LEN = 3
MAX_TERMS = 500
DEFAULT_DECAY = 0.92
DEFAULT_MIN_COUNT = 2

# Structural / CMS noise + common English stopwords that leaked into early pilots.
BLOCKED_TERMS = frozenset(
    {
        "page",
        "title",
        "pid",
        "html",
        "index",
        "home",
        "www",
        "http",
        "https",
        "school",
        "primary",
        "secondary",
        "junior",
        "infant",
        "academy",
        "sch",
        "uk",
        "org",
        "com",
        "net",
        "pdf",
        "wp",
        "content",
        "uploads",
        # English stopwords / weak tokens
        "and",
        "the",
        "our",
        "for",
        "with",
        "from",
        "this",
        "that",
        "your",
        "you",
        "are",
        "was",
        "were",
        "been",
        "have",
        "has",
        "had",
        "will",
        "can",
        "all",
        "any",
        "not",
        "but",
        "about",
        "into",
        "over",
        "under",
        "more",
        "also",
        "than",
        "then",
        "them",
        "they",
        "their",
        "what",
        "when",
        "where",
        "which",
        "who",
        "how",
        "why",
        "key",
        "six",
        "new",
        "year",
        "years",
        "info",
        "information",
        "click",
        "here",
        "read",
        "more",
        "view",
        "download",
        "file",
        "files",
        "doc",
        "docs",
        "default",
        "aspx",
        "php",
        "htm",
        "web",
        "website",
        "websitecontent",
        "hants",
        "hampshire",
    }
)


def normalize_term(term: str) -> str:
    return re.sub(r"\s+", " ", term.lower().strip())


def is_useful_term(term: str) -> bool:
    t = normalize_term(term)
    if len(t) < MIN_TERM_LEN or t in BLOCKED_TERMS:
        return False
    if t.isdigit():
        return False
    if re.fullmatch(r"pid\d+", t):
        return False
    # Drop very short alphanumeric CMS crumbs
    if re.fullmatch(r"[a-z]{1,2}\d+", t):
        return False
    return True


def load_learned_terms(path: Path | None = None) -> dict[str, int]:
    p = path or DEFAULT_PATH
    if not p.is_file():
        return {}
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    terms = payload.get("terms") or {}
    return {str(k): int(v) for k, v in terms.items() if is_useful_term(str(k))}


def prune_learned_terms(
    terms: dict[str, int],
    *,
    min_count: int = DEFAULT_MIN_COUNT,
    max_terms: int = MAX_TERMS,
) -> dict[str, int]:
    cleaned = {
        term: count
        for term, count in terms.items()
        if is_useful_term(term) and count >= min_count
    }
    ranked = sorted(cleaned.items(), key=lambda x: (-x[1], x[0]))[:max_terms]
    return dict(ranked)


def decay_learned_terms(
    terms: dict[str, int],
    *,
    factor: float = DEFAULT_DECAY,
) -> dict[str, int]:
    """Multiply counts by factor (kept as ints). Used between capture waves."""
    if factor >= 1:
        return dict(terms)
    out: dict[str, int] = {}
    for term, count in terms.items():
        if not is_useful_term(term):
            continue
        next_count = int(count * factor)
        if next_count > 0:
            out[term] = next_count
    return out


def save_learned_terms(
    terms: dict[str, int],
    path: Path | None = None,
    *,
    min_count: int = 1,
    decay: float | None = None,
) -> dict[str, int]:
    p = path or DEFAULT_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    cleaned = dict(terms)
    if decay is not None:
        cleaned = decay_learned_terms(cleaned, factor=decay)
    cleaned = prune_learned_terms(cleaned, min_count=min_count)
    payload = {
        "terms": cleaned,
        "termCount": len(cleaned),
    }
    p.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return cleaned


def terms_from_anchor(anchor: str) -> list[str]:
    out: list[str] = []
    for part in re.split(r"[/&|:\-–]+", anchor.lower()):
        part = normalize_term(part)
        if is_useful_term(part):
            out.append(part)
    return out


def update_learned_terms(
    store: dict[str, int],
    *,
    url: str,
    anchor: str = "",
    area: str,
    signal_count: int = 1,
) -> None:
    """Boost terms from URLs that yielded useful evidence."""
    if signal_count <= 0:
        return
    boost = 1 + min(signal_count, 5)
    if area in ("curriculum", "enrichment", "send"):
        boost += 1
    for term in path_terms(url) + terms_from_anchor(anchor):
        if not is_useful_term(term):
            continue
        store[term] = store.get(term, 0) + boost


def merge_learned_terms(base: dict[str, int], incoming: dict[str, int]) -> dict[str, int]:
    merged = dict(base)
    for term, count in incoming.items():
        if is_useful_term(term):
            merged[term] = merged.get(term, 0) + count
    return merged


def build_from_capture_file(capture_path: Path) -> dict[str, int]:
    """Rebuild learned terms from an existing qualitative-capture index."""
    payload = json.loads(capture_path.read_text(encoding="utf-8"))
    store: dict[str, int] = {}
    for record in payload.get("records") or []:
        for area in record.get("areas") or []:
            signal_count = len(area.get("signals") or [])
            if signal_count <= 0:
                continue
            for signal in area.get("signals") or []:
                update_learned_terms(
                    store,
                    url=signal.get("sourceUrl") or "",
                    anchor=signal.get("pageTitle") or signal.get("text") or "",
                    area=area.get("area") or "general",
                    signal_count=signal_count,
                )
    return prune_learned_terms(store, min_count=DEFAULT_MIN_COUNT)
