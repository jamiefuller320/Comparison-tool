"""Source-vs-site qualitative fidelity spot-check (loop harness).

Compares published qualitative shards to live school websites for a small
rotating sample. Detects chrome / PDF-junk / overclaim patterns from the
human spot-check bar without mutating extractor internals.

Findings feed digests the ops loops already commit. Safe high-confidence
chrome / PDF junk phrases auto-integrate into ``learned-qa-patterns.json``
(and can trigger ``loop:qualitative-quality``). Ambiguous candidates stay
human-gated via ``npm run qa:human-flags``. Ethos underclaim / unsupported
offerings never auto-learn.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
SCRIPTS = Path(__file__).resolve().parent
for path in (CAPTURE_ROOT, SCRIPTS):
    if str(path) not in __import__("sys").path:
        __import__("sys").path.insert(0, str(path))

from school_capture.http_utils import (  # noqa: E402
    normalize_url,
    parse_html,
    polite_sleep,
    safe_fetch,
    same_site,
)
from school_capture.list_filters import (  # noqa: E402
    CHROME_FRAGMENTS,
    NAV_LIST_LABELS,
    PDF_UI_CRUMB_LABELS,
    POLICY_DOCUMENT_LABELS,
    SEND_DIRECTORY_LABELS,
    is_nav_or_junk_list_item,
    is_plausible_list_offering,
)
from school_capture.qa_heuristics import (  # noqa: E402
    heuristic_area_findings,
)
from seed_scope import (  # noqa: E402
    LONDON_BOROUGH_LOCAL_AUTHORITIES,
    PACKS_ROOT_REL,
    SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES,
    la_slug,
)

DEFAULT_SHARDS = ROOT / "public" / "data" / "qualitative"
DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
PACKS_ROOT = ROOT / PACKS_ROOT_REL
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-spotcheck-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "qualitative-spotcheck-latest.md"
CANDIDATES_JSONL = ROOT / "output" / "spotcheck-human-flag-candidates.jsonl"
GATED_CANDIDATES_JSONL = ROOT / "output" / "spotcheck-human-gated-candidates.jsonl"

DEFAULT_SAMPLE_SIZE = 7
# Hard ceiling so daily wall-clock stays bounded as the shard corpus grows.
# Spot-check is a fidelity sample after quality apply — not a full-corpus walk.
MAX_SAMPLE_SIZE = 21
DEFAULT_MAX_PAGES = 3
DEFAULT_TIMEOUT_NOTE = "Live fetch; polite rate limit"

# Anchor URNs from the human fidelity spot-check (prefer when still published).
ANCHOR_URNS: tuple[str, ...] = (
    "147519",  # St Anne's — chrome pollution
    "148724",  # Stafford Junior — mixed
    "126066",  # Millais — thin paraphrase
    "150721",  # Uplands — PDF crumbs
    "100598",  # Allen Edwards — London
    "130352",  # Arnhem Wharf — underclaim
    "135086",  # Akiva — ethos mis-bucket
)

# Chrome / nav tokens the human bar treats as fidelity failures even when
# extractor denylists have not caught up yet (parallel extractor PR).
SPOTCHECK_CHROME_PHRASES: frozenset[str] = frozenset(
    {
        "dinner menu",
        "school dinners",
        "school meals",
        "menus",
        "newsletters",
        "newsletter",
        "pay online",
        "online payments",
        "school calendar",
        "calendar",
        "term dates",
        "facebook",
        "twitter",
        "instagram",
        "x (twitter)",
        "prospectus",
        "vacancies",
        "current vacancies",
        "staff portal",
        "parent view",
        "ofsted report",
        "cookie settings",
        "cookie policy",
        "privacy notice",
        "contact us",
        "key information",
        "statutory information",
    }
)

PDF_UI_CRUMBS: frozenset[str] = frozenset(
    {
        "ascending",
        "descending",
        "modified",
        "page",
        "of",
        "previous",
        "next",
        "zoom",
        "print",
        "download",
    }
)

ALL_CAPS_QUESTION_RE = re.compile(
    r"^[A-Z0-9][A-Z0-9\s,;:'\"()\-/&?]{8,}\?$",
)
OVERCLAIM_RE = re.compile(
    r"strong publicly visible evidence|strong evidence|excellent publicly",
    re.I,
)
# Lightweight distinctive-source hints for possible underclaim (human review).
ETHOS_HINT_RE = re.compile(
    r"\b(our (mission|vision|values|ethos)|let all you do|"
    r"rights?\s*respecting|jewish|catholic|church of england|"
    r"tikkun olam|faithful|be the best you can be|"
    r"inspired to achieve)\b",
    re.I,
)

FetchFn = Callable[[str], tuple[str | None, str | None]]


@dataclass
class SpotFlag:
    code: str
    severity: str  # fail | warn | info
    area: str | None = None
    detail: str = ""
    excerpts: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None and v != []}


@dataclass
class SchoolSpotResult:
    urn: str
    name: str
    la: str
    website: str | None
    assessedAt: str | None
    verdict: str  # pass | warn | fail | fetch_error | skip
    flags: list[SpotFlag] = field(default_factory=list)
    pagesFetched: int = 0
    offeringsChecked: int = 0
    chromeOfferings: list[str] = field(default_factory=list)
    pdfJunkOfferings: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "urn": self.urn,
            "name": self.name,
            "la": self.la,
            "website": self.website,
            "assessedAt": self.assessedAt,
            "verdict": self.verdict,
            "pagesFetched": self.pagesFetched,
            "offeringsChecked": self.offeringsChecked,
            "chromeOfferings": self.chromeOfferings,
            "pdfJunkOfferings": self.pdfJunkOfferings,
            "flags": [f.to_dict() for f in self.flags],
            "notes": self.notes,
        }


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip().rstrip(":.").strip()


def _is_spotcheck_chrome(item: str) -> bool:
    key = _norm(item)
    if not key:
        return True
    if key in SPOTCHECK_CHROME_PHRASES:
        return True
    if key in PDF_UI_CRUMBS:
        return True
    if is_nav_or_junk_list_item(item):
        return True
    if ALL_CAPS_QUESTION_RE.match(item.strip()):
        return True
    # Short Title Case nav-ish labels that are not plausible offerings.
    if len(key.split()) <= 3 and not is_plausible_list_offering(item):
        if any(frag in key for frag in ("menu", "newsletter", "calendar", "prospectus")):
            return True
    return False


def _is_pdf_fragment_junk(item: str) -> bool:
    key = _norm(item)
    if key in PDF_UI_CRUMBS:
        return True
    if ALL_CAPS_QUESTION_RE.match(item.strip()):
        return True
    # ALL-CAPS multi-word fragment without sentence punctuation (questionnaire).
    stripped = item.strip()
    letters = re.sub(r"[^A-Za-z]", "", stripped)
    if (
        len(stripped.split()) >= 3
        and letters
        and letters.isupper()
        and "?" in stripped
    ):
        return True
    return False


def load_website_index(
    *,
    root_index: Path = DEFAULT_INDEX,
    packs_root: Path = PACKS_ROOT,
) -> dict[str, dict[str, str]]:
    """Map URN → {name, website, la, laSlug} from root + pack indexes."""
    out: dict[str, dict[str, str]] = {}

    def ingest(schools: list[dict], *, default_la: str, la_slug_hint: str) -> None:
        for school in schools:
            urn = str(school.get("urn") or "").strip()
            website = (school.get("schoolWebsite") or "").strip()
            if not urn or not website:
                continue
            la = str(school.get("localAuthority") or default_la or "").strip()
            out[urn] = {
                "name": str(school.get("name") or urn),
                "website": website,
                "la": la,
                "laSlug": la_slug_hint or la_slug(la) if la else la_slug_hint,
            }

    if root_index.is_file():
        payload = json.loads(root_index.read_text(encoding="utf-8"))
        ingest(payload.get("schools") or [], default_la="Hampshire", la_slug_hint="hampshire")

    if packs_root.is_dir():
        for idx in sorted(packs_root.glob("*/schools-index.json")):
            slug = idx.parent.name
            try:
                payload = json.loads(idx.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            schools = payload.get("schools") or []
            default_la = ""
            if schools:
                default_la = str(schools[0].get("localAuthority") or "")
            ingest(schools, default_la=default_la, la_slug_hint=slug)
    return out


def _region_bucket(la: str, la_slug_hint: str) -> str:
    if la in LONDON_BOROUGH_LOCAL_AUTHORITIES or la_slug_hint in {
        la_slug(x) for x in LONDON_BOROUGH_LOCAL_AUTHORITIES
    }:
        return "london"
    if la in SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES or la_slug_hint in {
        la_slug(x) for x in SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES
    }:
        return "southeast"
    return "other"


def select_sample(
    *,
    website_index: dict[str, dict[str, str]],
    shards_dir: Path = DEFAULT_SHARDS,
    sample_size: int = DEFAULT_SAMPLE_SIZE,
    seed: int | None = None,
    prefer_urns: list[str] | None = None,
    only_urns: list[str] | None = None,
) -> list[str]:
    """Pick a small mixed SE + London sample with published shards."""
    if only_urns:
        return [u for u in only_urns if (shards_dir / f"{u}.json").is_file()]

    eligible = [
        urn
        for urn, meta in website_index.items()
        if (shards_dir / f"{urn}.json").is_file()
    ]
    if not eligible:
        return []

    rng = random.Random(seed if seed is not None else _default_seed())
    preferred = [
        u
        for u in (prefer_urns or list(ANCHOR_URNS))
        if u in website_index and (shards_dir / f"{u}.json").is_file()
    ]

    by_region: dict[str, list[str]] = {"london": [], "southeast": [], "other": []}
    for urn in eligible:
        meta = website_index[urn]
        bucket = _region_bucket(meta.get("la", ""), meta.get("laSlug", ""))
        by_region[bucket].append(urn)
    for bucket in by_region:
        rng.shuffle(by_region[bucket])

    chosen: list[str] = []
    seen: set[str] = set()

    def take(urn: str) -> None:
        if urn in seen or len(chosen) >= sample_size:
            return
        seen.add(urn)
        chosen.append(urn)

    # Keep up to ~half anchors when available, then fill balanced regions.
    for urn in preferred[: max(1, sample_size // 2)]:
        take(urn)

    target_london = max(2, sample_size // 3)
    for urn in by_region["london"]:
        if sum(1 for u in chosen if _region_bucket(
            website_index[u].get("la", ""), website_index[u].get("laSlug", "")
        ) == "london") >= target_london:
            break
        take(urn)

    for urn in by_region["southeast"]:
        if len(chosen) >= sample_size:
            break
        take(urn)

    for urn in by_region["other"] + by_region["london"] + by_region["southeast"]:
        if len(chosen) >= sample_size:
            break
        take(urn)

    return chosen


def _default_seed() -> int:
    """Day-stable seed so scheduled runs rotate without thrashing."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return int(hashlib.sha256(today.encode()).hexdigest()[:8], 16)


def load_shard(urn: str, shards_dir: Path = DEFAULT_SHARDS) -> dict[str, Any] | None:
    path = shards_dir / f"{urn}.json"
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _collect_signal_urls(shard: dict[str, Any], *, root: str, limit: int) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for area in shard.get("areas") or []:
        for signal in area.get("signals") or []:
            raw = (signal.get("sourceUrl") or "").strip()
            norm = normalize_url(raw)
            if not norm or norm in seen:
                continue
            if not same_site(norm, root):
                continue
            # Prefer HTML pages over PDFs for text fidelity (PDF binary not parsed here).
            path = urlparse(norm).path.lower()
            if path.endswith(".pdf"):
                continue
            seen.add(norm)
            urls.append(norm)
            if len(urls) >= limit:
                return urls
    return urls


def fetch_school_corpus(
    website: str,
    shard: dict[str, Any],
    *,
    max_pages: int = DEFAULT_MAX_PAGES,
    fetch: FetchFn | None = None,
) -> tuple[str, int, list[str]]:
    """Fetch homepage (+ capped signal pages). Returns (text, page_count, notes)."""
    fetch_fn = fetch or safe_fetch
    notes: list[str] = []
    root = normalize_url(website) or website
    texts: list[str] = []
    pages = 0

    final, html = fetch_fn(root)
    if not final or html is None:
        notes.append(f"Homepage fetch failed for {root}")
        return "", 0, notes

    pages += 1
    parsed = parse_html(html)
    texts.append(parsed.text or "")
    # Follow a few same-site signal URLs already cited in the product shard.
    extra = _collect_signal_urls(shard, root=final, limit=max(0, max_pages - 1))
    for url in extra:
        polite_sleep(0.35)
        _f, body = fetch_fn(url)
        if body is None:
            notes.append(f"Signal page fetch failed: {url}")
            continue
        pages += 1
        texts.append(parse_html(body).text or "")

    # Also pull a couple of about/ethos/vision links from the homepage when present.
    if pages < max_pages:
        for href, _label in parsed.links:
            abs_url = normalize_url(urljoin(final, href))
            if not abs_url or not same_site(abs_url, final):
                continue
            blob = f"{href}".lower()
            if not any(
                tok in blob
                for tok in ("ethos", "vision", "values", "about", "mission", "welcome")
            ):
                continue
            if abs_url in {root, final, *(extra or [])}:
                continue
            polite_sleep(0.35)
            _f, body = fetch_fn(abs_url)
            if body is None:
                continue
            pages += 1
            texts.append(parse_html(body).text or "")
            if pages >= max_pages:
                break

    return "\n".join(texts), pages, notes


def _offering_supported_in_source(offering: str, source_lower: str) -> bool:
    """Loose token support: enough distinctive words appear on the live pages."""
    tokens = [
        t
        for t in re.findall(r"[a-z0-9]+", offering.lower())
        if len(t) > 3 and t not in {"with", "from", "school", "years", "club", "clubs"}
    ]
    if not tokens:
        return True  # nothing to verify
    hits = sum(1 for t in tokens if t in source_lower)
    return hits >= max(1, (len(tokens) + 1) // 2)


def assess_school(
    urn: str,
    *,
    website_index: dict[str, dict[str, str]],
    shards_dir: Path = DEFAULT_SHARDS,
    max_pages: int = DEFAULT_MAX_PAGES,
    fetch: FetchFn | None = None,
    offline_source_text: str | None = None,
) -> SchoolSpotResult:
    meta = website_index.get(urn) or {}
    shard = load_shard(urn, shards_dir)
    name = (shard or {}).get("name") or meta.get("name") or urn
    la = meta.get("la") or ""
    website = meta.get("website")
    result = SchoolSpotResult(
        urn=urn,
        name=str(name),
        la=la,
        website=website,
        assessedAt=(shard or {}).get("assessedAt"),
        verdict="skip",
    )
    if not shard:
        result.verdict = "skip"
        result.notes.append("No published qualitative shard")
        return result
    if not website and offline_source_text is None:
        result.verdict = "skip"
        result.notes.append("No schoolWebsite on index/pack")
        return result

    if offline_source_text is not None:
        source_text = offline_source_text
        result.pagesFetched = 1 if offline_source_text else 0
    else:
        source_text, pages, fetch_notes = fetch_school_corpus(
            website or "",
            shard,
            max_pages=max_pages,
            fetch=fetch,
        )
        result.pagesFetched = pages
        result.notes.extend(fetch_notes)
        if pages == 0 or not source_text.strip():
            result.verdict = "fetch_error"
            result.flags.append(
                SpotFlag(
                    code="fetch_failed",
                    severity="warn",
                    detail="Could not fetch live school pages for source comparison",
                )
            )
            # Still run product-only chrome checks below with empty source.
            source_text = ""

    source_lower = source_text.lower()
    chrome_hits: list[str] = []
    pdf_junk: list[str] = []
    unsupported: list[tuple[str, str]] = []
    overclaim_areas: list[str] = []

    # Reuse existing heuristic findings (product-only) without applying them.
    try:
        from school_capture.models import QualitativeCaptureRecord

        record = QualitativeCaptureRecord.from_dict(shard)  # type: ignore[attr-defined]
    except Exception:  # noqa: BLE001 — shard shape may vary; fall back
        record = None

    if record is not None:
        for area in record.areas:
            for finding in heuristic_area_findings(area):
                if finding.action in {"strip", "thin"} and finding.junkClass:
                    result.flags.append(
                        SpotFlag(
                            code=f"heuristic_{finding.junkClass}",
                            severity="fail"
                            if finding.junkClass
                            in {"chrome", "policy_toc", "named_person"}
                            else "warn",
                            area=finding.area,
                            detail=finding.reason,
                            excerpts=list(finding.offendingExcerpts or [])[:6],
                        )
                    )

    for area in shard.get("areas") or []:
        area_name = str(area.get("area") or "")
        offerings = [str(o) for o in (area.get("offerings") or []) if str(o).strip()]
        result.offeringsChecked += len(offerings)
        summary = str(area.get("summary") or "")
        narrative = str(area.get("narrativeSummary") or "")

        area_chrome = [o for o in offerings if _is_spotcheck_chrome(o)]
        area_pdf = [o for o in offerings if _is_pdf_fragment_junk(o)]
        chrome_hits.extend(area_chrome)
        pdf_junk.extend(area_pdf)

        if area_chrome:
            result.flags.append(
                SpotFlag(
                    code="chrome_in_offerings",
                    severity="fail",
                    area=area_name,
                    detail="Product offerings look like site chrome / nav, not provision",
                    excerpts=area_chrome[:8],
                )
            )
        if area_pdf:
            result.flags.append(
                SpotFlag(
                    code="pdf_fragment_junk",
                    severity="fail",
                    area=area_name,
                    detail="Offerings look like PDF UI crumbs or questionnaire fragments",
                    excerpts=area_pdf[:8],
                )
            )

        non_chrome = [o for o in offerings if o not in area_chrome and o not in area_pdf]
        if source_lower:
            for offering in non_chrome:
                if not _offering_supported_in_source(offering, source_lower):
                    unsupported.append((area_name, offering))

        if offerings and (
            OVERCLAIM_RE.search(summary) or OVERCLAIM_RE.search(narrative)
        ):
            chrome_ratio = len(area_chrome) / max(1, len(offerings))
            score = int(area.get("score") or 0)
            if chrome_ratio >= 0.4 or (score >= 70 and area_chrome):
                overclaim_areas.append(area_name)

    if overclaim_areas:
        result.flags.append(
            SpotFlag(
                code="overclaim",
                severity="fail",
                detail="Strong-evidence wording while offerings are chrome-heavy",
                excerpts=overclaim_areas,
            )
        )

    if unsupported:
        result.flags.append(
            SpotFlag(
                code="unsupported_offerings",
                severity="warn",
                detail="Offerings not clearly supported by fetched live page text "
                "(may be PDF-only evidence — human check)",
                excerpts=[f"{a}: {o}" for a, o in unsupported[:10]],
            )
        )

    if source_lower and ETHOS_HINT_RE.search(source_text):
        product_blob = " ".join(
            [
                str(area.get("summary") or "")
                + " "
                + str(area.get("narrativeSummary") or "")
                + " "
                + " ".join(str(t) for t in (area.get("themes") or []))
                + " "
                + " ".join(str(o) for o in (area.get("offerings") or []))
                for area in shard.get("areas") or []
                if area.get("area") in {"ethos", "behaviour", "community"}
            ]
        ).lower()
        hints = sorted({m.group(0).lower() for m in ETHOS_HINT_RE.finditer(source_text)})
        missed = [h for h in hints if h not in product_blob and len(h) > 4]
        if missed:
            result.flags.append(
                SpotFlag(
                    code="possible_underclaim",
                    severity="warn",
                    area="ethos",
                    detail="Live pages show distinctive ethos/mission language "
                    "weakly reflected in product ethos/behaviour cells",
                    excerpts=missed[:8],
                )
            )

    result.chromeOfferings = sorted(set(chrome_hits))[:20]
    result.pdfJunkOfferings = sorted(set(pdf_junk))[:20]

    severities = {f.severity for f in result.flags}
    if result.verdict == "fetch_error":
        pass
    elif "fail" in severities:
        result.verdict = "fail"
    elif "warn" in severities:
        result.verdict = "warn"
    else:
        result.verdict = "pass"

    return result


def chrome_flag_candidates(results: list[SchoolSpotResult]) -> list[dict[str, str]]:
    """High-confidence chrome / PDF junk phrases for learned-QA (class=spotcheck_*).

    Ethos underclaim and unsupported-offering warnings are intentionally excluded.
    """
    events: list[dict[str, str]] = []
    seen: set[str] = set()

    def add(phrase: str, junk_class: str) -> None:
        key = _norm(phrase)
        if not key or key in seen:
            return
        seen.add(key)
        events.append({"phrase": phrase.strip(), "junkClass": junk_class})

    for result in results:
        for phrase in result.chromeOfferings:
            if _is_spotcheck_chrome(phrase):
                add(phrase, "spotcheck_chrome")
        for phrase in result.pdfJunkOfferings:
            if _is_pdf_fragment_junk(phrase) or _is_spotcheck_chrome(phrase):
                add(phrase, "spotcheck_pdf")
        for flag in result.flags:
            if flag.severity != "fail":
                continue
            code = flag.code or ""
            if code.startswith("heuristic_"):
                junk = code.removeprefix("heuristic_")
                if junk not in {"chrome", "cms_chrome", "policy_toc", "named_person"}:
                    continue
                for excerpt in flag.excerpts or []:
                    add(str(excerpt), f"spotcheck_{junk}")
    return events


def _learned_store_knows(phrase: str) -> bool:
    """True when the phrase already lives in the learned-QA archive/active set."""
    try:
        from school_capture.learned_qa_patterns import (
            load_learned_qa_patterns,
            normalize_phrase,
        )
    except Exception:  # noqa: BLE001
        return False
    key = normalize_phrase(phrase)
    if not key:
        return False
    store = load_learned_qa_patterns()
    stats = store.get("stats") or {}
    if isinstance(stats, dict) and key in stats:
        return True
    phrases = {normalize_phrase(str(p)) for p in (store.get("phrases") or [])}
    return key in phrases


def is_safe_auto_learn_phrase(phrase: str) -> bool:
    """Guardrail: only auto-integrate denylist / PDF / already-learned chrome.

    Ambiguous short labels and SEND-directory need-type names that are not
    already in the learned store stay human-gated. Ethos/underclaim never
    reach this function (they are not emitted as candidates).
    """
    key = _norm(phrase)
    if not key:
        return False
    # Exact denylist / known chrome / PDF crumbs.
    if key in SPOTCHECK_CHROME_PHRASES:
        return True
    if key in PDF_UI_CRUMBS or key in PDF_UI_CRUMB_LABELS:
        return True
    if key in NAV_LIST_LABELS or key.rstrip("»›>") in NAV_LIST_LABELS:
        return True
    if key in POLICY_DOCUMENT_LABELS:
        return True
    if _is_pdf_fragment_junk(phrase):
        return True
    if any(frag in key for frag in CHROME_FRAGMENTS):
        return True
    # Reconfirm phrases the learned store already treats as junk.
    if _learned_store_knows(phrase):
        return True
    # SEND referral / need-type labels can be real provision on SEND pages —
    # never auto-learn a *new* one as chrome (human gate).
    if key in SEND_DIRECTORY_LABELS:
        return False
    # Known nav/junk via denylist path only (is_nav without learned would mostly
    # be denylist/chrome fragments already covered; still reject loose heuristics).
    return False


def partition_learning_candidates(
    events: list[dict[str, str]],
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Split candidates into (auto_safe, human_gated)."""
    auto: list[dict[str, str]] = []
    gated: list[dict[str, str]] = []
    for event in events:
        phrase = str(event.get("phrase") or "")
        row = {
            "phrase": phrase.strip(),
            "junkClass": str(event.get("junkClass") or "spotcheck_chrome"),
        }
        if is_safe_auto_learn_phrase(phrase):
            row["autoLearn"] = "safe"
            auto.append(row)
        else:
            row["autoLearn"] = "gated"
            gated.append(row)
    return auto, gated


def write_candidates_jsonl(
    events: list[dict[str, str]], path: Path = CANDIDATES_JSONL
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(e, ensure_ascii=False) for e in events]
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return path


def write_digest(
    payload: dict[str, Any],
    *,
    digest_json: Path = DIGEST_JSON,
    digest_md: Path = DIGEST_MD,
) -> None:
    digest_json.parent.mkdir(parents=True, exist_ok=True)
    digest_json.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    counts = payload.get("verdictCounts") or {}
    lines = [
        f"# Qualitative source spot-check — {payload.get('ranAt')}",
        "",
        f"- Mode: `{'dry-run' if payload.get('dryRun') else 'spotcheck'}`",
        f"- Sample size: `{payload.get('sampleSize')}` (requested `{payload.get('requestedSampleSize')}`)",
        f"- Seed: `{payload.get('seed')}`",
        f"- Max pages / school: `{payload.get('maxPages')}`",
        f"- Verdicts: pass `{counts.get('pass', 0)}` · warn `{counts.get('warn', 0)}` · "
        f"fail `{counts.get('fail', 0)}` · fetch_error `{counts.get('fetch_error', 0)}` · "
        f"skip `{counts.get('skip', 0)}`",
        f"- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells",
        f"- Learning candidates written: `{payload.get('candidatesWritten', 0)}` "
        f"(auto `{payload.get('autoLearnedCount', 0)}` · gated `{payload.get('gatedCount', 0)}`)",
        f"- Auto-learned into learned store: `{payload.get('flagsRecorded', False)}`",
        f"- Quality apply requested: `{payload.get('qualityApplyRequested', False)}`",
        "",
        "## Schools",
        "",
    ]
    for school in payload.get("schools") or []:
        lines.append(
            f"- **{school.get('name')}** (`{school.get('urn')}`, {school.get('la')}) — "
            f"`{school.get('verdict')}`"
        )
        for flag in school.get("flags") or []:
            excerpts = flag.get("excerpts") or []
            tip = f" — {', '.join(excerpts[:4])}" if excerpts else ""
            lines.append(
                f"  - `{flag.get('severity')}` `{flag.get('code')}`"
                f"{f' [{flag.get('area')}]' if flag.get('area') else ''}: "
                f"{flag.get('detail')}{tip}"
            )
    notes = payload.get("notes") or []
    if notes:
        lines.extend(["", "## Notes", ""])
        for note in notes:
            lines.append(f"- {note}")
    lines.extend(
        [
            "",
            "## Feedback path",
            "",
            "- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`",
            "- Safe chrome/PDF learnings auto-integrate → `output/learned-qa-patterns.json` "
            "→ quality loop apply (same day when GHA dispatches)",
            "- Human-gated candidates: `output/spotcheck-human-gated-candidates.jsonl` → "
            "`npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`",
            "- Ethos underclaim / unsupported offerings stay digest-only (never auto-learn)",
            "- Failures are **fidelity signals** for extractor / QA polish — not a hard "
            "Pages deploy gate unless `--strict` is set on the loop.",
            "",
        ]
    )
    digest_md.write_text("\n".join(lines), encoding="utf-8")


def run_spotcheck(
    *,
    sample_size: int = DEFAULT_SAMPLE_SIZE,
    seed: int | None = None,
    max_pages: int = DEFAULT_MAX_PAGES,
    only_urns: list[str] | None = None,
    prefer_urns: list[str] | None = None,
    dry_run: bool = False,
    auto_learn: bool = True,
    record_flags: bool = False,
    strict: bool = False,
    fetch: FetchFn | None = None,
    offline_sources: dict[str, str] | None = None,
    shards_dir: Path = DEFAULT_SHARDS,
    root_index: Path = DEFAULT_INDEX,
    packs_root: Path = PACKS_ROOT,
    digest_json: Path = DIGEST_JSON,
    digest_md: Path = DIGEST_MD,
    candidates_path: Path = CANDIDATES_JSONL,
    gated_candidates_path: Path = GATED_CANDIDATES_JSONL,
    learned_path: Path | None = None,
) -> dict[str, Any]:
    """Run the spot-check loop and write digests. Returns payload dict.

    By default, safe chrome/PDF candidates are recorded into the learned-QA
    store (``auto_learn=True``). ``record_flags=True`` also records human-gated
    chrome candidates (aggressive opt-in). Ethos underclaim never auto-learns.
    """
    notes: list[str] = [
        DEFAULT_TIMEOUT_NOTE,
        "Automated checks approximate the human fidelity bar; "
        "ethos underclaim and PDF-only evidence still need human review "
        "(never auto-learned).",
        f"Sample capped at {MAX_SAMPLE_SIZE} (requested path stays O(sample) "
        "as corpus grows).",
    ]
    effective_seed = seed if seed is not None else _default_seed()
    # Sample-capped: never grow with corpus size (closed loop stays O(sample)).
    sample_size = max(1, min(int(sample_size), MAX_SAMPLE_SIZE))
    website_index = load_website_index(root_index=root_index, packs_root=packs_root)
    sample = select_sample(
        website_index=website_index,
        shards_dir=shards_dir,
        sample_size=sample_size,
        seed=effective_seed,
        prefer_urns=prefer_urns,
        only_urns=only_urns,
    )
    if dry_run:
        notes.append("Dry run — selected sample only; no live fetches.")

    results: list[SchoolSpotResult] = []
    if dry_run:
        for urn in sample:
            meta = website_index.get(urn) or {}
            shard = load_shard(urn, shards_dir) or {}
            results.append(
                SchoolSpotResult(
                    urn=urn,
                    name=str(shard.get("name") or meta.get("name") or urn),
                    la=str(meta.get("la") or ""),
                    website=meta.get("website"),
                    assessedAt=shard.get("assessedAt"),
                    verdict="skip",
                    notes=["dry-run sample only"],
                )
            )
    else:
        for urn in sample:
            offline = (offline_sources or {}).get(urn)
            results.append(
                assess_school(
                    urn,
                    website_index=website_index,
                    shards_dir=shards_dir,
                    max_pages=max_pages,
                    fetch=fetch,
                    offline_source_text=offline,
                )
            )

    verdict_counts: dict[str, int] = {}
    for result in results:
        verdict_counts[result.verdict] = verdict_counts.get(result.verdict, 0) + 1

    candidates = chrome_flag_candidates(results) if not dry_run else []
    auto_events, gated_events = (
        partition_learning_candidates(candidates) if candidates else ([], [])
    )
    candidates_written = 0
    auto_learned_count = 0
    gated_count = len(gated_events)
    flags_recorded = False
    quality_apply_requested = False

    if candidates and not dry_run:
        # Full candidate list (auto + gated) for ops visibility.
        all_rows = [{**e, "autoLearn": "safe"} for e in auto_events] + gated_events
        write_candidates_jsonl(all_rows, candidates_path)
        candidates_written = len(all_rows)
        notes.append(
            f"Wrote {candidates_written} chrome/PDF flag candidates → {candidates_path}"
        )
        if gated_events:
            write_candidates_jsonl(gated_events, gated_candidates_path)
            notes.append(
                f"Wrote {len(gated_events)} human-gated candidates → "
                f"{gated_candidates_path}"
            )

        to_record: list[dict[str, str]] = []
        if auto_learn and auto_events:
            to_record.extend(
                {"phrase": e["phrase"], "junkClass": e["junkClass"]} for e in auto_events
            )
        if record_flags and gated_events:
            # Aggressive opt-in: also record gated chrome candidates.
            to_record.extend(
                {"phrase": e["phrase"], "junkClass": e["junkClass"]} for e in gated_events
            )
            notes.append(
                "record-flags: also recording human-gated chrome candidates"
            )
        elif record_flags and not gated_events and not auto_learn:
            # Legacy: --record-flags alone with auto-learn disabled.
            to_record.extend(
                {"phrase": e["phrase"], "junkClass": e["junkClass"]} for e in all_rows
            )

        if to_record:
            from school_capture.learned_qa_patterns import record_qa_learning_events

            # Deduplicate by normalized phrase while preserving order.
            seen_rec: set[str] = set()
            deduped: list[dict[str, str]] = []
            for row in to_record:
                key = _norm(row["phrase"])
                if key in seen_rec:
                    continue
                seen_rec.add(key)
                deduped.append(row)
            record_qa_learning_events(deduped, path=learned_path)
            flags_recorded = True
            auto_learned_count = len(deduped)
            quality_apply_requested = True
            notes.append(
                f"Recorded {auto_learned_count} spot-check phrase(s) into "
                "learned-qa-patterns.json (quality apply recommended)"
            )
        elif auto_events and not auto_learn:
            notes.append(
                f"{len(auto_events)} safe candidates available but auto-learn disabled"
            )

    payload: dict[str, Any] = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "dryRun": dry_run,
        "seed": effective_seed,
        "requestedSampleSize": sample_size,
        "sampleSize": len(results),
        "maxPages": max_pages,
        "verdictCounts": verdict_counts,
        "failCount": verdict_counts.get("fail", 0),
        "warnCount": verdict_counts.get("warn", 0),
        "candidatesWritten": candidates_written,
        "autoLearnedCount": auto_learned_count,
        "gatedCount": gated_count,
        "flagsRecorded": flags_recorded,
        "qualityApplyRequested": quality_apply_requested,
        "autoLearn": auto_learn,
        "recordFlags": record_flags,
        "strict": strict,
        "schools": [r.to_dict() for r in results],
        "notes": notes,
    }
    write_digest(payload, digest_json=digest_json, digest_md=digest_md)
    return payload
