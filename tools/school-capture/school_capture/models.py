"""Data models aligned with School Compass qualitative sidecar conventions."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date
from enum import Enum
from typing import Any


class SubjectArea(str, Enum):
    CURRICULUM = "curriculum"
    ENRICHMENT = "enrichment"
    ETHOS = "ethos"
    BEHAVIOUR = "behaviour"
    SEND = "send"
    COMMUNITY = "community"


class SourceType(str, Enum):
    SCHOOL_WEBSITE = "school-website"
    SCHOOL_DOCUMENT = "school-document"
    LOCAL_NEWS = "local-news"
    SOCIAL_MEDIA = "social-media"
    OTHER = "other"


ENGINE_VERSION = "0.7.2"


@dataclass
class QualitativeSignal:
    """Verifiable excerpt with footnote URL — mirrors InspectionQuote."""

    text: str
    sourceUrl: str
    sourceType: str
    capturedAt: str
    pageTitle: str | None = None
    section: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out = asdict(self)
        return {k: v for k, v in out.items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> QualitativeSignal:
        return cls(
            text=str(data.get("text") or ""),
            sourceUrl=str(data.get("sourceUrl") or ""),
            sourceType=str(data.get("sourceType") or "other"),
            capturedAt=str(data.get("capturedAt") or ""),
            pageTitle=(data.get("pageTitle") or None),
            section=(data.get("section") or None),
        )


@dataclass
class SubjectAreaAssessment:
    """Value judgement for one subject area with supporting evidence."""

    area: str
    score: int
    confidence: float
    summary: str
    themes: list[str] = field(default_factory=list)
    offerings: list[str] = field(default_factory=list)
    signals: list[QualitativeSignal] = field(default_factory=list)
    narrativeSummary: str | None = None
    synthesisMethod: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "area": self.area,
            "score": self.score,
            "confidence": round(self.confidence, 3),
            "summary": self.summary,
            "themes": self.themes,
            "offerings": self.offerings,
            "signals": [s.to_dict() for s in self.signals],
        }
        if self.narrativeSummary:
            out["narrativeSummary"] = self.narrativeSummary
        if self.synthesisMethod:
            out["synthesisMethod"] = self.synthesisMethod
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SubjectAreaAssessment:
        signals = [
            QualitativeSignal.from_dict(s)
            for s in (data.get("signals") or [])
            if isinstance(s, dict)
        ]
        return cls(
            area=str(data.get("area") or ""),
            score=int(data.get("score") or 0),
            confidence=float(data.get("confidence") or 0.0),
            summary=str(data.get("summary") or ""),
            themes=[str(t) for t in (data.get("themes") or [])],
            offerings=[str(o) for o in (data.get("offerings") or [])],
            signals=signals,
            narrativeSummary=(data.get("narrativeSummary") or None),
            synthesisMethod=(data.get("synthesisMethod") or None),
        )


@dataclass
class QualitativeCaptureRecord:
    """Per-school qualitative capture sidecar (keyed by URN)."""

    urn: str
    name: str
    assessedAt: str
    engineVersion: str = ENGINE_VERSION
    sourcesScanned: int = 0
    sourceTypes: list[str] = field(default_factory=list)
    areas: list[SubjectAreaAssessment] = field(default_factory=list)
    captureNotes: list[str] = field(default_factory=list)
    documentsDiscovered: int = 0
    documentsExtracted: int = 0
    documentInventory: list[dict[str, str]] = field(default_factory=list)
    # Change-aware re-screen support (validators + extracted page text).
    verifiedAt: str | None = None
    discoveredUrls: list[str] = field(default_factory=list)
    pageCache: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "urn": self.urn,
            "name": self.name,
            "assessedAt": self.assessedAt,
            "engineVersion": self.engineVersion,
            "sourcesScanned": self.sourcesScanned,
            "sourceTypes": self.sourceTypes,
            "areas": [a.to_dict() for a in self.areas],
            "captureNotes": self.captureNotes,
            "documentsDiscovered": self.documentsDiscovered,
            "documentsExtracted": self.documentsExtracted,
            "documentInventory": self.documentInventory,
        }
        if self.verifiedAt:
            out["verifiedAt"] = self.verifiedAt
        if self.discoveredUrls:
            out["discoveredUrls"] = self.discoveredUrls
        if self.pageCache:
            out["pageCache"] = self.pageCache
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> QualitativeCaptureRecord:
        areas = [
            SubjectAreaAssessment.from_dict(a)
            for a in (data.get("areas") or [])
            if isinstance(a, dict)
        ]
        inventory = [
            dict(item)
            for item in (data.get("documentInventory") or [])
            if isinstance(item, dict)
        ]
        page_cache = [
            dict(item)
            for item in (data.get("pageCache") or [])
            if isinstance(item, dict)
        ]
        return cls(
            urn=str(data.get("urn") or "").strip(),
            name=str(data.get("name") or "").strip(),
            assessedAt=str(data.get("assessedAt") or today_iso()),
            engineVersion=str(data.get("engineVersion") or ENGINE_VERSION),
            sourcesScanned=int(data.get("sourcesScanned") or 0),
            sourceTypes=[str(t) for t in (data.get("sourceTypes") or [])],
            areas=areas,
            captureNotes=[str(n) for n in (data.get("captureNotes") or [])],
            documentsDiscovered=int(data.get("documentsDiscovered") or 0),
            documentsExtracted=int(data.get("documentsExtracted") or 0),
            documentInventory=inventory,
            verifiedAt=(str(data["verifiedAt"]) if data.get("verifiedAt") else None),
            discoveredUrls=[str(u) for u in (data.get("discoveredUrls") or []) if str(u).strip()],
            pageCache=page_cache,
        )


@dataclass
class QualitativeCaptureIndex:
    """Batch output written to output/qualitative-capture.json."""

    generatedAt: str
    engineVersion: str = ENGINE_VERSION
    schoolCount: int = 0
    records: list[QualitativeCaptureRecord] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "generatedAt": self.generatedAt,
            "engineVersion": self.engineVersion,
            "schoolCount": self.schoolCount,
            "records": [r.to_dict() for r in self.records],
            "stats": self.stats,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> QualitativeCaptureIndex:
        records = [
            QualitativeCaptureRecord.from_dict(r)
            for r in (data.get("records") or [])
            if isinstance(r, dict)
        ]
        return cls(
            generatedAt=str(data.get("generatedAt") or today_iso()),
            engineVersion=str(data.get("engineVersion") or ENGINE_VERSION),
            schoolCount=int(data.get("schoolCount") or len(records)),
            records=records,
            stats=dict(data.get("stats") or {}),
        )


@dataclass
class SchoolInput:
    """Minimal school record needed to run capture."""

    urn: str
    name: str
    schoolWebsite: str | None = None
    town: str | None = None
    localAuthority: str | None = None
    postcode: str | None = None
    address: str | None = None
    telephone: str | None = None
    giasUrl: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SchoolInput:
        return cls(
            urn=str(data.get("urn") or "").strip(),
            name=str(data.get("name") or "").strip(),
            schoolWebsite=(data.get("schoolWebsite") or None),
            town=(data.get("town") or None),
            localAuthority=(data.get("localAuthority") or None),
            postcode=(data.get("postcode") or None),
            address=(data.get("address") or None),
            telephone=(data.get("telephone") or None),
            giasUrl=(data.get("giasUrl") or None),
        )


def today_iso() -> str:
    return date.today().isoformat()
