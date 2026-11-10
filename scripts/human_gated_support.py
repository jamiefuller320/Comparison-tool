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
_ETHOS_PRODUCT_AREAS = frozenset({"ethos", "behaviour", "community"})
_OUR_LABEL_RE = re.compile(r"^our (mission|vision|values|ethos)$", re.I)


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


def _label_key(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip(" .;,:")


def ethos_product_blob(shard: dict[str, Any] | None) -> str:
    """Parent-facing ethos/behaviour/community text the spot-check compares."""
    if not shard:
        return ""
    parts: list[str] = []
    for area in shard.get("areas") or []:
        if str(area.get("area") or "") not in _ETHOS_PRODUCT_AREAS:
            continue
        parts.append(str(area.get("summary") or ""))
        parts.append(str(area.get("narrativeSummary") or ""))
        parts.extend(str(t) for t in (area.get("themes") or []))
        parts.extend(str(o) for o in (area.get("offerings") or []))
    return " ".join(parts).lower()


def ethos_offering_keys(shard: dict[str, Any] | None) -> set[str]:
    """Exact offering labels, not summary boilerplate or longer phrases."""
    if not shard:
        return set()
    keys: set[str] = set()
    for area in shard.get("areas") or []:
        if str(area.get("area") or "") not in _ETHOS_PRODUCT_AREAS:
            continue
        for offering in area.get("offerings") or []:
            key = _label_key(str(offering))
            if key:
                keys.add(key)
    return keys


def ethos_hint_reflected(hint: str, shard: dict[str, Any] | None) -> bool:
    """True when the published cell already carries this spot-check hint.

    "our vision" counts when vision is its own offering. It does not count
    just because the stock summary says "ethos and values", or because a
    longer label such as "british values" contains the word.
    Distinctive phrases ("let all you do") still need the phrase itself.
    """
    key = _label_key(hint)
    if not key:
        return True
    if key in ethos_product_blob(shard):
        return True
    match = _OUR_LABEL_RE.match(key)
    if match and match.group(1).lower() in ethos_offering_keys(shard):
        return True
    return False


def ethos_excerpts_reflected(
    shard: dict[str, Any] | None,
    excerpts: list[Any],
) -> bool:
    """True when every flagged excerpt is already in the published cell."""
    if not shard or not excerpts:
        return False
    return all(ethos_hint_reflected(str(item), shard) for item in excerpts)


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
