"""Parent-facing narrative synthesis with mandatory source citations.

LLM providers:
  - cursor  — Cursor SDK Agent.prompt (same arrangement as value_investor)
  - openai  — OpenAI Chat Completions API
  - auto    — CURSOR_API_KEY, else OPENAI_API_KEY, else deterministic only
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import replace
from typing import Literal

from school_capture.models import QualitativeCaptureRecord, SubjectAreaAssessment

CORE_AREA_LABELS = {
    "curriculum": "Curriculum",
    "enrichment": "Enrichment & clubs",
    "ethos": "Ethos & values",
    "behaviour": "Behaviour & pastoral care",
    "send": "SEND & inclusion",
    "community": "Community & parents",
}

Provider = Literal["auto", "cursor", "openai", "none"]

_UNSET = object()

_CITATION_RE = re.compile(r"\[(\d+)\]")
_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _coverage_id(area: SubjectAreaAssessment) -> str:
    signals = area.signals or []
    offerings = area.offerings or []
    confidence = area.confidence or 0.0
    if not signals and not offerings:
        return "none"
    if len(signals) >= 3 and confidence >= 0.55:
        return "rich"
    if signals or offerings:
        return "some"
    return "thin"


def _count_distinct_urls(signals) -> int:
    return len({s.sourceUrl for s in signals if s.sourceUrl})


def deterministic_parent_paragraph(area: SubjectAreaAssessment) -> str:
    """Build a parent-facing paragraph without an LLM (mirrors evidence prototype)."""
    offerings = area.offerings or []
    signals = area.signals or []
    label = CORE_AREA_LABELS.get(area.area, area.area)
    cov = _coverage_id(area)

    if cov == "none":
        return (
            f"We did not find much about {label.lower()} on the pages and documents "
            "scanned for this school. Worth asking on a visit or checking the school's "
            "website directly."
        )

    if len(offerings) >= 2:
        shown = ", ".join(offerings[:6])
        extra = f" and {len(offerings) - 6} more" if len(offerings) > 6 else ""
        corroboration = ""
        distinct = _count_distinct_urls(signals)
        if distinct >= 2:
            page_word = "page" if distinct == 1 else "pages"
            corroboration = f" Information appears across {distinct} {page_word}."
        return f"The school website lists {shown}{extra}.{corroboration}"

    if len(signals) == 1 and len(signals[0].text) < 120:
        text = signals[0].text
        if not text.lower().startswith("the "):
            text = text[0].lower() + text[1:] if text else text
        return (
            f"The school mentions {text}. See the source link below for the original page."
        )

    best = next((s for s in signals if len(s.text) > 60), signals[0] if signals else None)
    if best:
        return best.text

    if area.summary:
        return area.summary
    return f"Some material related to {label.lower()} was found on the school site."


def _numbered_sources(area: SubjectAreaAssessment) -> list[dict[str, str]]:
    sources: list[dict[str, str]] = []
    seen: set[str] = set()
    for signal in area.signals or []:
        key = signal.sourceUrl or signal.text[:80]
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            {
                "text": signal.text[:400],
                "sourceUrl": signal.sourceUrl,
                "sourceType": signal.sourceType,
                "pageTitle": signal.pageTitle or "",
            }
        )
        if len(sources) >= 8:
            break
    return sources


def _valid_citations(text: str, source_count: int) -> bool:
    if source_count == 0:
        return "[" not in text
    refs = {int(m) for m in _CITATION_RE.findall(text)}
    if not refs:
        return False
    return all(1 <= n <= source_count for n in refs)


def resolve_provider(
    provider: Provider,
    *,
    cursor_key: str | None | object = _UNSET,
    openai_key: str | None | object = _UNSET,
) -> tuple[str, str | None]:
    """Return (provider_name, api_key). provider_name is cursor|openai|none.

    Pass ``cursor_key=None`` / ``openai_key=None`` to force-disable that provider
    (ignoring env). Omit the argument to read ``CURSOR_API_KEY`` / ``OPENAI_API_KEY``.
    """
    if cursor_key is _UNSET:
        cursor_key = os.environ.get("CURSOR_API_KEY")
    if openai_key is _UNSET:
        openai_key = os.environ.get("OPENAI_API_KEY")
    cursor_key = cursor_key if isinstance(cursor_key, str) and cursor_key else None
    openai_key = openai_key if isinstance(openai_key, str) and openai_key else None
    if provider == "none":
        return "none", None
    if provider == "cursor":
        return ("cursor", cursor_key) if cursor_key else ("none", None)
    if provider == "openai":
        return ("openai", openai_key) if openai_key else ("none", None)
    # auto
    if cursor_key:
        return "cursor", cursor_key
    if openai_key:
        return "openai", openai_key
    return "none", None


def _openai_chat(
    *,
    api_key: str,
    model: str,
    system: str,
    user: str,
    timeout: int = 45,
) -> str:
    payload = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return str(body["choices"][0]["message"]["content"]).strip()


def _cursor_agent_prompt(
    *,
    api_key: str,
    model: str,
    prompt: str,
    cwd: str | None = None,
) -> str | None:
    """One-shot Cursor SDK agent prompt (value_investor pattern)."""
    try:
        from cursor_sdk import Agent, AgentOptions, CursorAgentError, LocalAgentOptions
    except ImportError:
        return None

    workdir = cwd or os.getcwd()
    try:
        agent_result = Agent.prompt(
            prompt,
            AgentOptions(
                api_key=api_key,
                model=model,
                local=LocalAgentOptions(cwd=workdir),
            ),
        )
    except CursorAgentError:
        return None
    except Exception:  # noqa: BLE001 — SDK surface varies by version
        return None

    if getattr(agent_result, "status", None) == "error":
        return None
    text = getattr(agent_result, "result", None) or ""
    return str(text).strip() or None


def _parse_json_object(text: str) -> dict | None:
    text = text.strip()
    fence = _JSON_FENCE_RE.search(text)
    if fence:
        text = fence.group(1)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


def openai_parent_paragraph(
    area: SubjectAreaAssessment,
    *,
    api_key: str,
    model: str = "gpt-4o-mini",
) -> str | None:
    """Return an OpenAI paragraph with [n] citations, or None on failure."""
    sources = _numbered_sources(area)
    if not sources and not (area.offerings or []):
        return None

    label = CORE_AREA_LABELS.get(area.area, area.area)
    offerings = area.offerings or []
    source_lines = []
    for i, src in enumerate(sources, start=1):
        title = src.get("pageTitle") or src.get("sourceUrl") or "source"
        excerpt = src.get("text", "")[:280]
        source_lines.append(f"[{i}] ({title}) {excerpt}")

    system = (
        "You write short, neutral paragraphs for parents comparing schools. "
        "Use only the supplied offerings and source excerpts — do not invent facts. "
        "Write 2–4 sentences in British English. "
        "Every factual claim must include at least one citation marker like [1] or [2] "
        "referring to the numbered sources. Do not use bullet lists."
    )
    user = (
        f"Focus area: {label}\n"
        f"Offerings: {', '.join(offerings[:12]) or '(none listed)'}\n"
        "Sources:\n"
        + "\n".join(source_lines)
        + "\n\nWrite one parent-facing paragraph."
    )

    try:
        text = _openai_chat(api_key=api_key, model=model, system=system, user=user)
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, json.JSONDecodeError):
        return None

    if not text or len(text) < 40:
        return None
    if not _valid_citations(text, len(sources)):
        return None
    return text


# Back-compat alias used by older tests / callers.
llm_parent_paragraph = openai_parent_paragraph


def _area_payload(area: SubjectAreaAssessment) -> dict:
    sources = _numbered_sources(area)
    return {
        "area": area.area,
        "label": CORE_AREA_LABELS.get(area.area, area.area),
        "offerings": (area.offerings or [])[:12],
        "sources": [
            {
                "n": i,
                "title": s.get("pageTitle") or s.get("sourceUrl") or "source",
                "excerpt": (s.get("text") or "")[:280],
                "sourceUrl": s.get("sourceUrl") or "",
            }
            for i, s in enumerate(sources, start=1)
        ],
    }


def cursor_synthesize_record(
    record: QualitativeCaptureRecord,
    *,
    api_key: str,
    model: str = "composer-2.5",
    cwd: str | None = None,
) -> dict[str, str]:
    """One Cursor agent call for all areas. Returns area → narrative map."""
    areas_payload = [_area_payload(a) for a in record.areas]
    prompt = (
        "You write short, neutral paragraphs for parents comparing UK schools.\n"
        "Use ONLY the supplied offerings and numbered source excerpts — do not invent facts.\n"
        "British English. 2–4 sentences per area. No bullet lists.\n"
        "Every factual claim must include citation markers like [1] or [2] matching that area's sources.\n"
        "If an area has no sources and no offerings, say evidence was thin and suggest checking the school site.\n\n"
        f"School: {record.name} (URN {record.urn})\n\n"
        "Input JSON (areas with numbered sources):\n"
        f"{json.dumps(areas_payload, indent=2)}\n\n"
        "Respond with ONLY a JSON object mapping each area id "
        f"({', '.join(a.area for a in record.areas)}) to its paragraph string. "
        "No markdown outside the JSON."
    )
    raw = _cursor_agent_prompt(api_key=api_key, model=model, prompt=prompt, cwd=cwd)
    if not raw:
        return {}
    data = _parse_json_object(raw)
    if not data:
        return {}
    out: dict[str, str] = {}
    for area in record.areas:
        text = data.get(area.area)
        if not isinstance(text, str):
            continue
        text = text.strip()
        sources = _numbered_sources(area)
        if len(text) < 40:
            continue
        if sources and not _valid_citations(text, len(sources)):
            continue
        if not sources and "[" in text:
            continue
        out[area.area] = text
    return out


def synthesize_area(
    area: SubjectAreaAssessment,
    *,
    use_llm: bool = False,
    api_key: str | None = None,
    model: str = "gpt-4o-mini",
    provider: str = "openai",
    narrative_override: str | None = None,
) -> SubjectAreaAssessment:
    """Attach narrativeSummary and synthesisMethod to one area assessment."""
    narrative: str | None = narrative_override
    method: str | None = None

    if narrative:
        method = provider if provider in {"cursor", "openai"} else "llm"
    elif use_llm and api_key and provider == "openai":
        narrative = openai_parent_paragraph(area, api_key=api_key, model=model)
        if narrative:
            method = "openai"

    if not narrative:
        narrative = deterministic_parent_paragraph(area)
        method = "deterministic"

    return replace(area, narrativeSummary=narrative, synthesisMethod=method)


def synthesize_record(
    record: QualitativeCaptureRecord,
    *,
    use_llm: bool = False,
    api_key: str | None = None,
    model: str | None = None,
    provider: Provider = "auto",
    cwd: str | None = None,
) -> QualitativeCaptureRecord:
    """Synthesize parent-facing narratives for all areas on a capture record."""
    if provider == "auto":
        resolved, key = resolve_provider("auto")
    elif provider == "cursor":
        resolved, key = resolve_provider(
            "cursor",
            cursor_key=api_key if api_key is not None else os.environ.get("CURSOR_API_KEY"),
        )
    elif provider == "openai":
        resolved, key = resolve_provider(
            "openai",
            openai_key=api_key if api_key is not None else os.environ.get("OPENAI_API_KEY"),
        )
    else:
        resolved, key = "none", None

    if not use_llm or resolved == "none" or not key:
        areas = [
            synthesize_area(area, use_llm=False)
            for area in record.areas
        ]
        return replace(record, areas=areas)

    if resolved == "cursor":
        cursor_model = model or "composer-2.5"
        narratives = cursor_synthesize_record(
            record, api_key=key, model=cursor_model, cwd=cwd
        )
        tagged = []
        for area in record.areas:
            override = narratives.get(area.area)
            if override:
                tagged.append(
                    replace(
                        area,
                        narrativeSummary=override,
                        synthesisMethod="cursor",
                    )
                )
            else:
                tagged.append(synthesize_area(area, use_llm=False))
        return replace(record, areas=tagged)

    # openai — one completion per area (cheap chat API)
    openai_model = model or "gpt-4o-mini"
    areas = [
        synthesize_area(
            area,
            use_llm=True,
            api_key=key,
            model=openai_model,
            provider="openai",
        )
        for area in record.areas
    ]
    return replace(record, areas=areas)
