"""Shared helpers for human-gated queue closure (L5).

PDF confirmation for unsupported offerings and ethos recapture quality checks.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SHARDS = ROOT / "public" / "data" / "qualitative"
MAX_PDF_FETCH = 3


def load_shard(urn: str, shards_dir: Path = DEFAULT_SHARDS) -> dict[str, Any] | None:
    path = shards_dir / f"{urn}.json"
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _offering_supported_in_source(offering: str, source_lower: str) -> bool:
    tokens = [
        t
        for t in re.findall(r"[a-z0-9]+", offering.lower())
        if len(t) > 3 and t not in {"with", "from", "school", "years", "club", "clubs"}
    ]
    if not tokens:
        return True
    hits = sum(1 for t in tokens if t in source_lower)
    return hits >= max(1, (len(tokens) + 1) // 2)


def pdf_signal_urls(shard: dict[str, Any], *, limit: int = MAX_PDF_FETCH) -> list[str]:
    from school_capture.http_utils import normalize_url, same_site

    root = ""
    for area in shard.get("areas") or []:
        for signal in area.get("signals") or []:
            url = (signal.get("sourceUrl") or "").strip()
            if url and not root:
                root = normalize_url(url) or url
                break
        if root:
            break

    urls: list[str] = []
    seen: set[str] = set()
    for area in shard.get("areas") or []:
        for signal in area.get("signals") or []:
            raw = (signal.get("sourceUrl") or "").strip()
            norm = normalize_url(raw)
            if not norm or norm in seen:
                continue
            if root and not same_site(norm, root):
                continue
            if not urlparse(norm).path.lower().endswith(".pdf"):
                continue
            seen.add(norm)
            urls.append(norm)
            if len(urls) >= limit:
                return urls
    return urls


def fetch_pdf_corpus(urls: list[str], *, fetch_pdf_bytes=None) -> str:
    """Return lowercased text from up to a few same-school PDFs."""
    if not urls:
        return ""
    if fetch_pdf_bytes is None:
        from school_capture.http_utils import fetch_result, polite_sleep

        def _default_fetch(url: str) -> bytes | None:
            polite_sleep(0.35)
            result = fetch_result(url)
            if not result.ok or result.body is None:
                return None
            return bytes(result.body)

        fetch_pdf_bytes = _default_fetch

    from school_capture.documents import extract_pdf_text

    parts: list[str] = []
    for url in urls[:MAX_PDF_FETCH]:
        raw = fetch_pdf_bytes(url)
        if not raw:
            continue
        try:
            text, _pages = extract_pdf_text(raw, max_pages=8)
        except Exception:  # noqa: BLE001
            continue
        if text.strip():
            parts.append(text)
    return "\n".join(parts).lower()


def offerings_from_unsupported_excerpts(excerpts: list[Any]) -> list[tuple[str, str]]:
    """Parse spot-check excerpts like ``curriculum: music``."""
    out: list[tuple[str, str]] = []
    for raw in excerpts or []:
        text = str(raw).strip()
        if not text:
            continue
        if ": " in text:
            area, offering = text.split(": ", 1)
            out.append((area.strip(), offering.strip()))
        else:
            out.append(("", text))
    return out


def pdf_confirms_unsupported(
    shard: dict[str, Any] | None,
    excerpts: list[Any],
    *,
    fetch_pdf_bytes=None,
) -> bool:
    """True when shard PDF evidence supports at least one flagged offering."""
    if not shard or not excerpts:
        return False
    pairs = offerings_from_unsupported_excerpts(excerpts)
    if not pairs:
        return False
    pdf_text = fetch_pdf_corpus(pdf_signal_urls(shard), fetch_pdf_bytes=fetch_pdf_bytes)
    if not pdf_text.strip():
        return False
    for _area, offering in pairs:
        if _offering_supported_in_source(offering, pdf_text):
            return True
    return False


def ethos_recapture_looks_good(shard: dict[str, Any] | None) -> bool:
    """Heuristic: ethos cell has substance after targeted recapture."""
    if not shard:
        return False
    for area in shard.get("areas") or []:
        if str(area.get("area") or "") != "ethos":
            continue
        score = int(area.get("score") or 0)
        offerings = [str(o).strip() for o in (area.get("offerings") or []) if str(o).strip()]
        summary = str(area.get("summary") or "").lower()
        if score >= 35 and offerings:
            return True
        if score >= 50 and "little public evidence" not in summary:
            return True
    return False
