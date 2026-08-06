"""Cross-school learned URL/anchor terms from successful captures."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

from school_capture.url_discovery import path_terms

DEFAULT_PATH = Path("output/learned-url-terms.json")
MIN_TERM_LEN = 3
MAX_TERMS = 500
DEFAULT_DECAY = 0.92
DEFAULT_MIN_COUNT = 2
MAX_BOOST = 12

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
        "amp;",
        "nbsp;",
        "quot;",
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
    if re.fullmatch(r"[a-z]{1,2}\d+", t):
        return False
    return True


def looks_school_specific(term: str) -> bool:
    """Multi-word or long tokens are often school/site names, not topic cues."""
    t = normalize_term(term)
    if " " in t:
        return True
    if len(t) >= 14:
        return True
    return False


def cross_school_boosts(
    counts: dict[str, int],
    df: dict[str, int],
    *,
    n_schools: int,
) -> dict[str, int]:
    """Convert raw counts into discovery boosts using a light IDF prior.

    - Singleton school-specific terms are dropped
    - Remaining boosts ≈ (count / df) × idf, capped
    """
    n = max(1, n_schools)
    out: dict[str, int] = {}
    for term, count in counts.items():
        if not is_useful_term(term) or count <= 0:
            continue
        d = max(1, int(df.get(term, 1)))
        # Multi-word / long tokens are usually school or site names — keep only
        # when they appear across several schools (true cross-site cues).
        if looks_school_specific(term) and d < 3:
            continue
        idf = math.log(1.0 + (n / d))
        boost = int(round((count / d) * idf))
        boost = max(1, min(MAX_BOOST, boost))
        out[term] = boost
    ranked = sorted(out.items(), key=lambda x: (-x[1], x[0]))[:MAX_TERMS]
    return dict(ranked)


def _parse_terms_payload(payload: dict) -> tuple[dict[str, int], dict[str, int], int]:
    raw_terms = payload.get("terms") or {}
    counts: dict[str, int] = {}
    for key, value in raw_terms.items():
        term = str(key)
        if not is_useful_term(term):
            continue
        if isinstance(value, dict):
            counts[term] = int(value.get("count") or value.get("tf") or 0)
        else:
            counts[term] = int(value)

    raw_df = payload.get("df") or {}
    df = {str(k): int(v) for k, v in raw_df.items() if is_useful_term(str(k))}
    # Legacy files without df: treat every term as df=1
    for term in counts:
        df.setdefault(term, 1)

    n_schools = int(payload.get("schoolCount") or 0)
    if n_schools <= 0:
        n_schools = max(df.values()) if df else 1
    return counts, df, n_schools


def load_learned_terms(path: Path | None = None) -> dict[str, int]:
    """Load discovery boosts (IDF-weighted) for URL scoring."""
    p = path or DEFAULT_PATH
    if not p.is_file():
        return {}
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    counts, df, n_schools = _parse_terms_payload(payload)
    return cross_school_boosts(counts, df, n_schools=n_schools)


def load_learned_term_counts(path: Path | None = None) -> dict[str, int]:
    """Load raw term counts (not IDF-weighted) for merge/decay."""
    p = path or DEFAULT_PATH
    if not p.is_file():
        return {}
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    counts, _df, _n = _parse_terms_payload(payload)
    return counts


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
    df: dict[str, int] | None = None,
    school_count: int | None = None,
) -> dict[str, int]:
    """Persist counts (+ optional df). Returns IDF boosts for callers."""
    p = path or DEFAULT_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    cleaned = dict(terms)
    if decay is not None:
        cleaned = decay_learned_terms(cleaned, factor=decay)
    cleaned = prune_learned_terms(cleaned, min_count=min_count)

    if df:
        df_out = {
            term: max(1, int(df.get(term, 1)))
            for term in cleaned
        }
    else:
        df_out = {term: 1 for term in cleaned}

    n_schools = int(school_count or max(df_out.values(), default=1))
    boosts = cross_school_boosts(cleaned, df_out, n_schools=n_schools)
    payload = {
        "terms": cleaned,
        "df": df_out,
        "schoolCount": n_schools,
        "termCount": len(cleaned),
        "boostTermCount": len(boosts),
    }
    p.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return boosts


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
    df_urns: dict[str, set[str]] | None = None,
    urn: str | None = None,
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
        if df_urns is not None and urn:
            df_urns.setdefault(term, set()).add(urn)


def merge_learned_terms(base: dict[str, int], incoming: dict[str, int]) -> dict[str, int]:
    merged = dict(base)
    for term, count in incoming.items():
        if is_useful_term(term):
            merged[term] = merged.get(term, 0) + count
    return merged


def build_from_capture_file(
    capture_path: Path,
) -> tuple[dict[str, int], dict[str, int], int]:
    """Rebuild raw counts + DF from an existing qualitative-capture index."""
    payload = json.loads(capture_path.read_text(encoding="utf-8"))
    store: dict[str, int] = {}
    df_urns: dict[str, set[str]] = {}
    records = payload.get("records") or []
    for record in records:
        urn = str(record.get("urn") or "") or None
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
                    df_urns=df_urns,
                    urn=urn,
                )
    pruned = prune_learned_terms(store, min_count=DEFAULT_MIN_COUNT)
    df = {term: len(df_urns.get(term, set()) or {1}) for term in pruned}
    return pruned, df, len(records)
