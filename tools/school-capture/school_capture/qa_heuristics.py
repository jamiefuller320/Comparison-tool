"""Deterministic qualitative QA: suspect ranking + auto strip findings."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any

from school_capture.filters import (
    looks_like_admissions_marketing,
    looks_like_parent_home_advice,
)
from school_capture.learned_qa_patterns import phrase_matches_learned
from school_capture.list_filters import (
    CHROME_FRAGMENTS,
    POLICY_DOCUMENT_LABELS,
    SEND_DIRECTORY_LABELS,
    is_nav_or_junk_list_item,
    is_plausible_list_offering,
)
from school_capture.models import QualitativeCaptureRecord, SubjectAreaAssessment

VALID_ACTIONS = frozenset({"keep", "strip", "reclassify", "thin"})
VALID_AREAS = frozenset(
    {"curriculum", "enrichment", "ethos", "behaviour", "send", "community"}
)

POLICY_BOILERPLATE_RE = re.compile(
    r"(by creating this policy|this policy (aims|sets out|outlines)|"
    r"the purpose of this policy|this code of conduct|whistleblow)",
    re.I,
)
MID_SENTENCE_RE = re.compile(r"^[a-z]")
CHROME_LABEL_RE = re.compile(
    r"\b(ofsted report|parent view|staff portal|report student absence|"
    r"name of child)\b",
    re.I,
)


@dataclass
class AreaQaFinding:
    area: str
    action: str  # keep | strip | reclassify | thin
    reason: str
    junkClass: str | None = None
    offendingExcerpts: list[str] = field(default_factory=list)
    suggestedArea: str | None = None
    source: str = "heuristic"  # heuristic | cursor | openai

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None and v != []}


@dataclass
class SchoolQaSuspect:
    urn: str
    name: str
    score: float
    flags: list[str] = field(default_factory=list)
    findings: list[AreaQaFinding] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "urn": self.urn,
            "name": self.name,
            "score": round(self.score, 2),
            "flags": self.flags,
            "findings": [f.to_dict() for f in self.findings],
        }


def _area_has_content(area: SubjectAreaAssessment) -> bool:
    return bool(area.signals or area.offerings or (area.narrativeSummary or "").strip())


def _norm_label(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip().rstrip(":.").strip()


def _is_send_need_label(text: str) -> bool:
    return _norm_label(text) in SEND_DIRECTORY_LABELS


_SEND_KEEP_LABELS = frozenset(
    {
        "special educational needs",
        "special educational needs and disabilities",
        "special educational needs & disabilities",
        "send",
        "sen",
        "inclusion",
        "zones of regulation",
        "ehcp",
    }
) | SEND_DIRECTORY_LABELS


def _is_junk_offering(item: str, *, area: str) -> bool:
    """True for chrome / policy TOC / learned junk list labels (not SEND need types)."""
    if not item or not item.strip():
        return True
    key = _norm_label(item)
    # Legitimate SEND labels must stay on the SEND area.
    if area == "send" and (key in _SEND_KEEP_LABELS or _is_send_need_label(item)):
        return False
    if key in POLICY_DOCUMENT_LABELS:
        return True
    if area == "community" and key in SEND_DIRECTORY_LABELS:
        return True
    if phrase_matches_learned(item):
        return True
    if is_nav_or_junk_list_item(item):
        return True
    if not is_plausible_list_offering(item):
        # Only auto-strip short implausible labels — long prose is handled elsewhere.
        if len(item.split()) <= 6:
            return True
    return False


def _looks_like_chrome_signal(text: str) -> bool:
    """Chrome/nav labels only — never treat normal prose sentences as list junk."""
    t = (text or "").strip()
    if not t:
        return False
    if POLICY_BOILERPLATE_RE.search(t):
        return True
    if phrase_matches_learned(t):
        return True
    words = t.split()
    # Short labels / footer chrome only (is_nav treats >7 words as junk lists).
    if len(words) <= 6 and (
        is_nav_or_junk_list_item(t)
        or any(frag in t.lower() for frag in CHROME_FRAGMENTS)
        or CHROME_LABEL_RE.search(t)
    ):
        return True
    # Explicit chrome fragment in a short-ish footer line
    if len(words) <= 8 and CHROME_LABEL_RE.search(t):
        return True
    return False


def heuristic_area_findings(area: SubjectAreaAssessment) -> list[AreaQaFinding]:
    """Return strip/thin findings for one area from deterministic rules."""
    findings: list[AreaQaFinding] = []
    if not _area_has_content(area):
        return findings

    junk_offerings = [
        o for o in (area.offerings or []) if _is_junk_offering(o, area=area.area)
    ]
    if junk_offerings:
        chrome_hit = any(
            "ofsted" in o.lower() or "parent view" in o.lower() for o in junk_offerings
        )
        findings.append(
            AreaQaFinding(
                area=area.area,
                action="strip",
                reason="Offerings look like site chrome, policy TOC, or learned junk.",
                junkClass="chrome" if chrome_hit else "policy_toc",
                offendingExcerpts=junk_offerings[:8],
            )
        )

    narrative = (area.narrativeSummary or "").strip()
    signals = area.signals or []
    texts = [narrative] + [(s.text or "") for s in signals]

    if any(looks_like_parent_home_advice(t) for t in texts if t):
        if area.area in {"curriculum", "enrichment"}:
            findings.append(
                AreaQaFinding(
                    area=area.area,
                    action="strip",
                    reason="Parenting tip-sheet wording is not school curriculum/clubs evidence.",
                    junkClass="parent_tips",
                    offendingExcerpts=[
                        t[:180] for t in texts if looks_like_parent_home_advice(t)
                    ][:3],
                )
            )

    if any(looks_like_admissions_marketing(t) for t in texts if t):
        if area.area in {"enrichment", "curriculum"}:
            findings.append(
                AreaQaFinding(
                    area=area.area,
                    action="strip",
                    reason="Admissions / settling-in marketing is not enrichment evidence.",
                    junkClass="admissions",
                    offendingExcerpts=[
                        t[:180] for t in texts if looks_like_admissions_marketing(t)
                    ][:3],
                )
            )

    if narrative and POLICY_BOILERPLATE_RE.search(narrative):
        findings.append(
            AreaQaFinding(
                area=area.area,
                action="strip",
                reason="Narrative opens with staff/policy boilerplate.",
                junkClass="policy_boilerplate",
                offendingExcerpts=[narrative[:180]],
            )
        )
    elif narrative and MID_SENTENCE_RE.match(narrative):
        findings.append(
            AreaQaFinding(
                area=area.area,
                action="thin",
                reason="Narrative looks like a mid-sentence fragment.",
                junkClass="boilerplate",
                offendingExcerpts=[narrative[:180]],
            )
        )

    chrome_signals = [
        (s.text or "").strip()
        for s in signals
        if _looks_like_chrome_signal(s.text or "")
        # Avoid double-counting policy openings already flagged above.
        and not POLICY_BOILERPLATE_RE.search(s.text or "")
    ]
    if chrome_signals and not any(
        f.junkClass in {"chrome", "policy_boilerplate"} for f in findings
    ):
        findings.append(
            AreaQaFinding(
                area=area.area,
                action="strip",
                reason="Signals are site chrome or nav chrome labels.",
                junkClass="chrome",
                offendingExcerpts=chrome_signals[:5],
            )
        )

    # Wrong-area: community filled only with SEND directory / policy labels
    if area.area == "community":
        offerings = [_norm_label(o) for o in (area.offerings or [])]
        if offerings and all(
            o in SEND_DIRECTORY_LABELS or o in POLICY_DOCUMENT_LABELS for o in offerings
        ):
            findings.append(
                AreaQaFinding(
                    area=area.area,
                    action="strip",
                    reason="Community offerings are SEN directory / policy labels.",
                    junkClass="wrong_area",
                    offendingExcerpts=list(area.offerings or [])[:8],
                    suggestedArea="send",
                )
            )

    return findings


def score_record_suspicion(record: QualitativeCaptureRecord) -> SchoolQaSuspect:
    """Rank how likely a school needs QA attention."""
    flags: list[str] = []
    findings: list[AreaQaFinding] = []
    score = 0.0

    for area in record.areas:
        area_findings = heuristic_area_findings(area)
        findings.extend(area_findings)
        if area_findings:
            score += 3.0 * len(area_findings)
            for f in area_findings:
                if f.junkClass and f.junkClass not in flags:
                    flags.append(f.junkClass)

        # Soft heuristics that raise priority even before auto-findings
        narrative = (area.narrativeSummary or "").strip()
        offerings = area.offerings or []
        if area.score >= 70 and not offerings and len(area.signals or []) <= 1:
            score += 1.5
            flags.append("high_score_thin_signals")
        if area.area == "enrichment" and any(
            looks_like_admissions_marketing(s.text or "") for s in (area.signals or [])
        ):
            score += 2.0
            flags.append("admissions_in_enrichment")
        if narrative and POLICY_BOILERPLATE_RE.search(narrative):
            score += 2.5
            flags.append("policy_boilerplate")
        if any(not is_plausible_list_offering(o) for o in offerings):
            score += 2.0
            flags.append("implausible_offerings")

    # Dedupe flags while keeping order
    seen: set[str] = set()
    uniq_flags = []
    for f in flags:
        if f not in seen:
            seen.add(f)
            uniq_flags.append(f)

    return SchoolQaSuspect(
        urn=record.urn,
        name=record.name,
        score=score,
        flags=uniq_flags,
        findings=findings,
    )


def rank_suspects(
    records: list[QualitativeCaptureRecord],
    *,
    limit: int = 8,
    min_score: float = 2.0,
) -> list[SchoolQaSuspect]:
    scored = [score_record_suspicion(r) for r in records if r.urn]
    scored = [s for s in scored if s.score >= min_score or s.findings]
    scored.sort(key=lambda s: (-s.score, s.name.lower(), s.urn))
    return scored[: max(0, limit)]
