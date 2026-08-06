"""Learn URL discovery terms from citation-validated Cursor/OpenAI narratives.

Successful `[n]` citations are stronger evidence than raw signal presence: the
narrative gate already checked the excerpt was usable for parents. Boost those
source URLs into `learned-url-terms.json` so later crawls prefer similar paths.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from school_capture.analysis.synthesis import cited_source_urls
from school_capture.learned_terms import (
    DEFAULT_PATH,
    load_learned_term_counts,
    prune_learned_terms,
    save_learned_terms,
    update_learned_terms,
)
from school_capture.models import QualitativeCaptureIndex, QualitativeCaptureRecord

CITATION_SIGNAL_WEIGHT = 3
LLM_METHODS = frozenset({"cursor", "openai", "llm"})


def learn_from_record(
    store: dict[str, int],
    record: QualitativeCaptureRecord,
    *,
    df_urns: dict[str, set[str]] | None = None,
) -> int:
    """Boost terms from cited URLs on LLM/Cursor areas. Returns boost events."""
    events = 0
    for area in record.areas:
        method = (area.synthesisMethod or "").lower()
        if method not in LLM_METHODS:
            continue
        urls = cited_source_urls(area)
        if not urls:
            continue
        title_by_url = {
            (sig.sourceUrl or "").strip(): (sig.pageTitle or sig.text or "")
            for sig in (area.signals or [])
            if (sig.sourceUrl or "").strip()
        }
        for url in urls:
            update_learned_terms(
                store,
                url=url,
                anchor=title_by_url.get(url, ""),
                area=area.area,
                signal_count=CITATION_SIGNAL_WEIGHT,
                df_urns=df_urns,
                urn=record.urn,
            )
            events += 1
    return events


def learn_from_capture_index(
    index: QualitativeCaptureIndex,
) -> tuple[dict[str, int], dict[str, int], int, int]:
    """Rebuild citation boosts across a sidecar. Returns counts, df, n, events."""
    store: dict[str, int] = {}
    df_urns: dict[str, set[str]] = {}
    events = 0
    for record in index.records:
        events += learn_from_record(store, record, df_urns=df_urns)
    pruned = prune_learned_terms(store, min_count=1)
    df = {term: len(df_urns.get(term) or set()) or 1 for term in pruned}
    return pruned, df, len(index.records), events


def apply_citation_learning(
    capture_path: Path,
    learned_path: Path | None = None,
    *,
    merge_existing: bool = True,
) -> dict[str, Any]:
    """Merge citation-validated term boosts into the learned-terms store."""
    from school_capture.learned_terms import merge_learned_terms

    payload = json.loads(capture_path.read_text(encoding="utf-8"))
    index = QualitativeCaptureIndex.from_dict(payload)
    citation_counts, citation_df, n_schools, events = learn_from_capture_index(index)

    dest = learned_path or DEFAULT_PATH
    if merge_existing and dest.is_file():
        existing = load_learned_term_counts(dest)
        # Prefer keeping prior DF when present.
        try:
            prior = json.loads(dest.read_text(encoding="utf-8"))
            prior_df = {
                str(k): int(v)
                for k, v in (prior.get("df") or {}).items()
                if str(k).strip()
            }
            prior_n = int(prior.get("schoolCount") or 0)
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            prior_df, prior_n = {}, 0
        merged = merge_learned_terms(existing, citation_counts)
        df = dict(prior_df)
        for term, value in citation_df.items():
            df[term] = max(int(df.get(term, 0)), int(value))
        school_count = max(prior_n, n_schools, 1)
    else:
        merged = citation_counts
        df = citation_df
        school_count = max(n_schools, 1)

    boosts = save_learned_terms(
        merged,
        dest,
        min_count=1,
        df=df,
        school_count=school_count,
    )
    return {
        "citationEvents": events,
        "citationTerms": len(citation_counts),
        "termCount": len(merged),
        "boostTermCount": len(boosts),
        "learnedPath": str(dest),
        "schoolCount": school_count,
    }
