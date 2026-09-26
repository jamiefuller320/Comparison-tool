#!/usr/bin/env python3
"""Classify a user-flagged qualitative snippet for the improvement queue.

Reads one JSON object on stdin:
  {
    "snippet": "...",
    "area": "enrichment"|null,
    "urn": "...",
    "reasonCode": "chrome-nav"|...|null,
    "reasonDetail": "..."
  }

Writes one JSON object on stdout:
  {
    "gate": "chrome_auto" | "gated_refresh" | "gated_review" | "ignore",
    "phrases": [{"phrase": "...", "junkClass": "user_chrome"}],
    "reason": "..."
  }

Shares denylist / chrome heuristics with spot-check so learned-QA flag
formats stay aligned (junkClass user_chrome ≈ spotcheck_chrome).
Parent reason chips bias the gate when present.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / "tools" / "school-capture"
if str(CAPTURE) not in sys.path:
    sys.path.insert(0, str(CAPTURE))
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from school_capture.list_filters import (  # noqa: E402
    is_nav_or_junk_list_item,
    is_plausible_list_offering,
)
from qualitative_spotcheck import (  # noqa: E402
    _is_pdf_fragment_junk,
    _is_spotcheck_chrome,
    _norm,
)

ETHOS_AREAS = frozenset({"ethos", "behaviour", "community"})
# Parent reason chips that strongly suggest chrome/PDF auto-learn.
CHROME_REASON_CODES = frozenset({"chrome-nav", "gibberish-pdf"})
# Parent reason chips that need human/recapture — never auto strip.
GATED_REASON_CODES = frozenset({"missing-point", "outdated", "wrong-topic"})
PHRASE_SPLIT = re.compile(r"[,;|/•·\n]+|(?:\s+[–—-]\s+)")


def candidate_phrases(snippet: str) -> list[str]:
    text = (snippet or "").strip()
    if not text:
        return []
    # Drop "Label: " prefix from cell summaries ("Enrichment & clubs: …").
    if ":" in text and len(text.split(":", 1)[0].split()) <= 4:
        text = text.split(":", 1)[1].strip()
    # Narrative lead-ins are not junk phrases themselves.
    text = re.sub(
        r"^(?:The school website lists|The school mentions)\s+",
        "",
        text,
        flags=re.I,
    ).strip()
    parts = [p.strip(" .") for p in PHRASE_SPLIT.split(text) if p.strip()]
    if not parts and text:
        parts = [text]
    out: list[str] = []
    seen: set[str] = set()
    for part in parts:
        key = _norm(part)
        if not key or key in seen:
            continue
        if len(part) > 80 or len(part.split()) > 10:
            continue
        seen.add(key)
        out.append(part.strip())
    if not out and text and len(text) <= 60 and len(text.split()) <= 8:
        out.append(text.strip())
    return out[:12]


def chrome_phrases(phrases: list[str]) -> list[dict[str, str]]:
    chrome: list[dict[str, str]] = []
    seen: set[str] = set()
    for phrase in phrases:
        key = _norm(phrase)
        if not key or key in seen:
            continue
        hit = (
            _is_spotcheck_chrome(phrase)
            or _is_pdf_fragment_junk(phrase)
            or (
                is_nav_or_junk_list_item(phrase)
                and not is_plausible_list_offering(phrase)
            )
        )
        if not hit:
            continue
        seen.add(key)
        chrome.append({"phrase": phrase, "junkClass": "user_chrome"})
    return chrome


def classify(
    snippet: str,
    area: str | None,
    reason_code: str | None = None,
    reason_detail: str | None = None,
) -> dict:
    area_key = (area or "").strip().lower() or None
    code = (reason_code or "").strip().lower() or None
    detail = (reason_detail or "").strip()
    phrases = candidate_phrases(snippet)
    # Prefer short tokens from free-text detail when parent named a junk label.
    if detail:
        phrases = candidate_phrases(detail) + phrases

    if area_key in ETHOS_AREAS or code == "missing-point":
        return {
            "gate": "gated_refresh",
            "phrases": [],
            "reason": (
                "Ethos / missing-point flags need human-gated recapture, "
                "not automatic phrase strip."
            ),
        }

    if code in GATED_REASON_CODES:
        return {
            "gate": "gated_review",
            "phrases": (
                [{"phrase": phrases[0], "junkClass": "user_flag"}] if phrases else []
            ),
            "reason": f"Parent reason `{code}` stays human-gated.",
        }

    chrome = chrome_phrases(phrases)
    if chrome or code in CHROME_REASON_CODES:
        if not chrome and code in CHROME_REASON_CODES and phrases:
            # Parent said chrome/PDF but heuristics missed — still queue phrases
            # as gated user_flag rather than inventing junkClass auto-apply.
            return {
                "gate": "gated_review",
                "phrases": [
                    {"phrase": phrases[0], "junkClass": "user_flag"},
                ],
                "reason": (
                    f"Parent marked `{code}` but phrase did not pass chrome "
                    "heuristics — human review before learned-QA."
                ),
            }
        if chrome:
            return {
                "gate": "chrome_auto",
                "phrases": chrome,
                "reason": (
                    "High-confidence chrome/nav/PDF junk phrases from parent flag"
                    + (f" (reason `{code}`)" if code else "")
                    + "."
                ),
            }

    if not (snippet or "").strip() and not detail:
        return {
            "gate": "ignore",
            "phrases": [],
            "reason": "Empty snippet — nothing to learn from.",
        }

    return {
        "gate": "gated_review",
        "phrases": (
            [{"phrase": phrases[0], "junkClass": "user_flag"}] if phrases else []
        ),
        "reason": (
            "Ambiguous parent flag — queue for human review / targeted URN refresh."
        ),
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"gate": "ignore", "phrases": [], "reason": str(exc)}))
        return 1
    if not isinstance(payload, dict):
        print(
            json.dumps(
                {"gate": "ignore", "phrases": [], "reason": "Expected JSON object"}
            )
        )
        return 1
    result = classify(
        str(payload.get("snippet") or ""),
        payload.get("area") if isinstance(payload.get("area"), str) else None,
        payload.get("reasonCode")
        if isinstance(payload.get("reasonCode"), str)
        else None,
        payload.get("reasonDetail")
        if isinstance(payload.get("reasonDetail"), str)
        else None,
    )
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
