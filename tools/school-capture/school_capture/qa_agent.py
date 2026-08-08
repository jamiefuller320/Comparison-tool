"""Optional Cursor/OpenAI review of suspicious qualitative captures."""

from __future__ import annotations

import json
import re
from typing import Any

from school_capture.analysis.synthesis import (
    _cursor_agent_prompt,
    _openai_chat,
    _parse_json_object,
    resolve_provider,
)
from school_capture.models import QualitativeCaptureRecord
from school_capture.qa_heuristics import (
    VALID_ACTIONS,
    VALID_AREAS,
    AreaQaFinding,
    SchoolQaSuspect,
)

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _area_payload(record: QualitativeCaptureRecord) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for area in record.areas:
        if not (area.signals or area.offerings or (area.narrativeSummary or "").strip()):
            continue
        out.append(
            {
                "area": area.area,
                "score": area.score,
                "confidence": area.confidence,
                "offerings": (area.offerings or [])[:12],
                "narrative": (area.narrativeSummary or "")[:400],
                "signals": [
                    {
                        "text": (s.text or "")[:220],
                        "pageTitle": s.pageTitle or "",
                        "sourceUrl": s.sourceUrl or "",
                    }
                    for s in (area.signals or [])[:5]
                ],
            }
        )
    return out


def _parse_findings(data: dict[str, Any], *, source: str) -> list[AreaQaFinding]:
    raw_findings = data.get("findings")
    if not isinstance(raw_findings, list):
        # Allow area-keyed map as a fallback.
        raw_findings = []
        for area, payload in data.items():
            if area not in VALID_AREAS or not isinstance(payload, dict):
                continue
            raw_findings.append({"area": area, **payload})

    findings: list[AreaQaFinding] = []
    for row in raw_findings:
        if not isinstance(row, dict):
            continue
        area = str(row.get("area") or "").strip()
        action = str(row.get("action") or "keep").strip().lower()
        if area not in VALID_AREAS or action not in VALID_ACTIONS:
            continue
        if action == "keep":
            continue
        excerpts = [
            str(x).strip()
            for x in (row.get("offendingExcerpts") or row.get("excerpts") or [])
            if str(x).strip()
        ]
        suggested = row.get("suggestedArea")
        suggested_area = (
            str(suggested).strip()
            if suggested and str(suggested).strip() in VALID_AREAS
            else None
        )
        findings.append(
            AreaQaFinding(
                area=area,
                action=action,
                reason=str(row.get("reason") or "Agent flagged parent-facing junk.").strip(),
                junkClass=(str(row["junkClass"]).strip() if row.get("junkClass") else None),
                offendingExcerpts=excerpts[:8],
                suggestedArea=suggested_area,
                source=source,
            )
        )
    return findings


def agent_review_record(
    record: QualitativeCaptureRecord,
    *,
    provider: str = "auto",
    model: str | None = None,
    cwd: str | None = None,
) -> list[AreaQaFinding]:
    """Ask Cursor/OpenAI to flag junk areas. Empty if provider unavailable."""
    resolved, key = resolve_provider(provider)  # type: ignore[arg-type]
    if resolved == "none" or not key:
        return []

    payload = _area_payload(record)
    if not payload:
        return []

    prompt = (
        "You QA qualitative school-website evidence for UK parents.\n"
        "Flag ONLY junk that should not help parents compare schools:\n"
        "- site chrome (Ofsted Report, Parent View, Staff Portal)\n"
        "- staff/policy TOC labels or policy openings ('By creating this policy…')\n"
        "- admissions settling-in / Stay & Play marketing in enrichment\n"
        "- parenting tip sheets presented as curriculum\n"
        "- SEN outside-agency directories dumped into community\n"
        "Do NOT flag genuine clubs, SEND need categories, ethos statements, or thin-but-honest empties.\n\n"
        f"School: {record.name} (URN {record.urn})\n"
        f"Heuristic flags already raised: see input.\n\n"
        "Input JSON:\n"
        f"{json.dumps(payload, indent=2)}\n\n"
        "Respond with ONLY JSON:\n"
        '{"findings":[{"area":"enrichment","action":"strip|thin|reclassify|keep",'
        '"junkClass":"chrome|policy_toc|policy_boilerplate|admissions|parent_tips|wrong_area|boilerplate",'
        '"reason":"short","offendingExcerpts":["…"],"suggestedArea":null}]}\n'
        "Omit keep findings. No markdown outside JSON."
    )

    raw: str | None = None
    if resolved == "cursor":
        raw = _cursor_agent_prompt(
            api_key=key,
            model=model or "composer-2.5",
            prompt=prompt,
            cwd=cwd,
        )
    elif resolved == "openai":
        try:
            raw = _openai_chat(
                api_key=key,
                model=model or "gpt-4o-mini",
                system="You are a careful QA reviewer for school comparison evidence. Return JSON only.",
                user=prompt,
            )
        except Exception:  # noqa: BLE001
            raw = None

    if not raw:
        return []
    data = _parse_json_object(raw)
    if not data:
        # try fence extract manually if helper missed
        m = _JSON_FENCE_RE.search(raw)
        if m:
            try:
                data = json.loads(m.group(1))
            except json.JSONDecodeError:
                data = None
    if not isinstance(data, dict):
        return []
    return _parse_findings(data, source=resolved)


def enrich_suspect_with_agent(
    record: QualitativeCaptureRecord,
    suspect: SchoolQaSuspect,
    *,
    provider: str = "auto",
    model: str | None = None,
    cwd: str | None = None,
) -> SchoolQaSuspect:
    """Merge agent findings into a heuristic suspect (agent wins on conflicts)."""
    agent_findings = agent_review_record(
        record, provider=provider, model=model, cwd=cwd
    )
    if not agent_findings:
        return suspect

    by_area: dict[str, AreaQaFinding] = {f.area: f for f in suspect.findings}
    for finding in agent_findings:
        by_area[finding.area] = finding
    merged = list(by_area.values())
    return SchoolQaSuspect(
        urn=suspect.urn,
        name=suspect.name,
        score=suspect.score + 1.5 * len(agent_findings),
        flags=sorted(set(suspect.flags + ["agent_reviewed"])),
        findings=merged,
    )
