"""Apply a GIAS edubase extract to pack indexes.

Marks closed establishments, records a successor when GIAS links one, adds
open schools that covered local authorities do not yet list, and strips
placeholder tokens from addresses. Does not change the SEO page-budget
constants or which areas are included — callers only refresh counts.
"""

from __future__ import annotations

import importlib.util
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from gias_address import (
    is_gias_null_token,
    parse_gias_date,
    strip_gias_address,
    strip_gias_token,
)

SCRIPTS = Path(__file__).resolve().parent

_POST16_MARKERS = (
    "post 16",
    "post-16",
    "16-19",
    "16 to 19",
    "16 plus",
)

_RELIGION_SKIP = {"", "none", "does not apply", "not applicable"}


def _load_module(name: str, filename: str):
    path = SCRIPTS / filename
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_enrich = _load_module("enrich_secondaries_mod", "enrich-secondaries.py")
_report = _load_module("report_seo_coverage_mod", "report-seo-coverage.py")
_seed = _load_module("seed_scope_mod", "seed_scope.py")

phases_from_ages = _enrich.phases_from_ages
suggest_phase = _enrich.suggest_phase
sector_from_type = _enrich.sector_from_type
is_local_authority = _seed.is_local_authority
town_stats = _report.town_stats


def is_closed_status(status: str | None) -> bool:
    text = (status or "").strip().lower()
    return text == "closed" or text.startswith("closed")


def is_listable_open_status(status: str | None) -> bool:
    """Open, including 'Open, but proposed to close'. Not 'Proposed to open'."""
    text = (status or "").strip().lower()
    return text == "open" or text.startswith("open")


def is_post16_establishment(type_name: str | None, phase_name: str | None) -> bool:
    blob = f"{type_name or ''} {phase_name or ''}".lower()
    return any(marker in blob for marker in _POST16_MARKERS)


def phases_for_establishment(
    *,
    low_age: str | None,
    high_age: str | None,
    type_name: str | None,
    phase_name: str | None,
) -> tuple[list[str], str | None]:
    """Comparable EY–KS4 phases, or empty when the setting is out of scope.

    A new free/special school sometimes publishes only the upper age. Infer a
    low age so it can be found in the compare tool. Post-16 institutions stay
    out, matching the existing harvest.
    """
    if is_post16_establishment(type_name, phase_name):
        return [], None
    lo_raw = (low_age or "").strip()
    hi_raw = (high_age or "").strip()
    try:
        if lo_raw and hi_raw:
            lo, hi = int(lo_raw), int(hi_raw)
            return phases_from_ages(lo, hi), f"{lo} to {hi}"
        if hi_raw and not lo_raw:
            hi = int(hi_raw)
            if hi < 5:
                return [], None
            lo = 5 if hi >= 11 else 3
            phases = phases_from_ages(lo, hi)
            if not phases:
                return [], None
            return phases, f"{lo} to {hi}"
    except ValueError:
        return [], None
    return [], None


def norm_name(name: str | None) -> str:
    text = (name or "").lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def link_direction(link_type: str | None) -> str | None:
    """'successor' means URN -> LinkURN. 'predecessor' is the inverse."""
    text = (link_type or "").strip().lower()
    if text.startswith("successor"):
        return "successor"
    if text.startswith("predecessor"):
        return "predecessor"
    return None


@dataclass
class SuccessorOpt:
    urn: str
    name: str
    date: str


def choose_successor(
    options: list[SuccessorOpt],
    *,
    open_urns: set[str],
) -> SuccessorOpt | None:
    """Prefer an open successor, then the latest link date, then the lowest URN."""
    if not options:
        return None
    by_urn: dict[str, SuccessorOpt] = {}
    for opt in options:
        current = by_urn.get(opt.urn)
        if current is None or (opt.date or "") >= (current.date or ""):
            by_urn[opt.urn] = opt
    pool = list(by_urn.values())
    open_pool = [opt for opt in pool if opt.urn in open_urns]
    if open_pool:
        pool = open_pool

    def sort_key(opt: SuccessorOpt) -> tuple:
        urn_num = int(opt.urn) if opt.urn.isdigit() else 10**12
        return (opt.date or "", -urn_num)

    pool.sort(key=sort_key)
    return pool[-1]


def successor_options_from_links(link_rows: list[dict[str, Any]]) -> dict[str, list[SuccessorOpt]]:
    """Map a predecessor URN to candidate successors."""
    out: dict[str, list[SuccessorOpt]] = {}
    for row in link_rows:
        direction = link_direction(row.get("LinkType") or row.get("linkType"))
        if direction is None:
            continue
        urn = str(row.get("URN") or row.get("urn") or "").strip()
        link_urn = str(row.get("LinkURN") or row.get("linkUrn") or "").strip()
        link_name = str(row.get("LinkName") or row.get("linkName") or "").strip()
        date = parse_gias_date(
            row.get("LinkEstablishedDate") or row.get("linkEstablishedDate")
        ) or ""
        if not urn or not link_urn or urn == link_urn:
            continue
        if direction == "successor":
            predecessor, successor, name = urn, link_urn, link_name
        else:
            # Predecessor row: URN is the successor, LinkURN is the old school.
            # LinkName is the predecessor, so the successor name is filled later.
            predecessor, successor, name = link_urn, urn, ""
        out.setdefault(predecessor, []).append(
            SuccessorOpt(urn=successor, name=name, date=date)
        )
    return out


def _gias_field(row: dict[str, Any], *keys: str) -> str:
    for key in keys:
        if key in row and row[key] is not None:
            return str(row[key]).strip()
    return ""


@dataclass
class GiasEstablishment:
    urn: str
    name: str
    status: str
    la: str
    open_date: str | None
    close_date: str | None
    close_reason: str | None
    open_reason: str | None
    type_name: str | None
    phase_name: str | None
    low_age: str
    high_age: str
    town: str | None
    postcode: str | None
    address: str | None
    website: str | None
    telephone: str | None
    religion: str | None


def parse_establishment(row: dict[str, Any]) -> GiasEstablishment | None:
    urn = _gias_field(row, "URN", "urn")
    if not urn:
        return None
    parts = [
        _gias_field(row, "Street"),
        _gias_field(row, "Locality"),
        _gias_field(row, "Address3"),
        _gias_field(row, "Town"),
        _gias_field(row, "County (name)", "County"),
        _gias_field(row, "Postcode"),
    ]
    religion = _gias_field(row, "ReligiousCharacter (name)")
    if religion.lower() in _RELIGION_SKIP:
        religion = ""
    website = _gias_field(row, "SchoolWebsite")
    if website and not website.lower().startswith("http"):
        website = "https://" + website
    return GiasEstablishment(
        urn=urn,
        name=_gias_field(row, "EstablishmentName") or urn,
        status=_gias_field(row, "EstablishmentStatus (name)"),
        la=_gias_field(row, "LA (name)"),
        open_date=parse_gias_date(_gias_field(row, "OpenDate")),
        close_date=parse_gias_date(_gias_field(row, "CloseDate")),
        close_reason=_gias_field(row, "ReasonEstablishmentClosed (name)") or None,
        open_reason=_gias_field(row, "ReasonEstablishmentOpened (name)") or None,
        type_name=_gias_field(row, "TypeOfEstablishment (name)") or None,
        phase_name=_gias_field(row, "PhaseOfEducation (name)") or None,
        low_age=_gias_field(row, "StatutoryLowAge"),
        high_age=_gias_field(row, "StatutoryHighAge"),
        town=strip_gias_token(_gias_field(row, "Town")),
        postcode=strip_gias_token(_gias_field(row, "Postcode")),
        address=strip_gias_address(", ".join(part for part in parts if part)),
        website=website or None,
        telephone=strip_gias_token(_gias_field(row, "TelephoneNum")),
        religion=religion or None,
    )


def clean_school_placeholders(school: dict[str, Any]) -> tuple[bool, int]:
    """Return (address_changed, contact_address_fixes)."""
    address_changed = False
    original = school.get("address")
    if isinstance(original, str):
        cleaned = strip_gias_address(original)
        if cleaned != original:
            address_changed = True
            if cleaned:
                school["address"] = cleaned
            else:
                school.pop("address", None)
    for key in ("town", "postcode", "telephone"):
        value = school.get(key)
        if isinstance(value, str) and strip_gias_token(value) is None:
            school.pop(key, None)
    contact_fixes = 0
    capture = school.get("contactCapture")
    if isinstance(capture, dict):
        for entry in capture.get("contacts") or []:
            if not isinstance(entry, dict):
                continue
            raw = entry.get("address")
            if not isinstance(raw, str) or not raw:
                continue
            cleaned = strip_gias_address(raw)
            if cleaned == raw:
                continue
            contact_fixes += 1
            if cleaned:
                entry["address"] = cleaned
            else:
                entry.pop("address", None)
    return address_changed, contact_fixes


def recount_open_stats(payload: dict[str, Any]) -> None:
    """Point census counters at open schools. Leave enrich-only counters alone."""
    schools = payload.get("schools") or []
    open_schools = [s for s in schools if not s.get("closed")]
    stats = payload.setdefault("stats", {})
    stats["schoolCount"] = len(open_schools)
    stats["closedCount"] = len(schools) - len(open_schools)
    stats["withRwm"] = sum(1 for s in open_schools if s.get("rwmExpected") is not None)
    stats["withCoordinates"] = sum(
        1
        for s in open_schools
        if s.get("latitude") is not None and s.get("longitude") is not None
    )
    stats["stateCount"] = sum(1 for s in open_schools if s.get("sector") == "state")
    stats["independentCount"] = sum(
        1 for s in open_schools if s.get("sector") == "independent"
    )
    # withKs4 is the enrich harvest hit-count, not an Attainment 8 tally.
    # Leave it, and the state/independent splits, for the KS4 enricher.
    stats["localAuthorityCount"] = len(
        {s.get("localAuthority") for s in open_schools if s.get("localAuthority")}
    )
    stats["withInspectionPrecis"] = sum(
        1 for s in open_schools if str(s.get("inspectionPrecis") or "").strip()
    )
    if "infantOrNurseryCount" in stats:
        stats["infantOrNurseryCount"] = sum(
            1
            for s in open_schools
            if s.get("phases")
            and set(s.get("phases") or []).issubset({"early-years", "ks1"})
            and "ks2" not in (s.get("phases") or [])
        )


def _set_or_pop(school: dict[str, Any], key: str, value: Any) -> None:
    if value:
        school[key] = value
    else:
        school.pop(key, None)


def _mark_closed(school: dict[str, Any], est: GiasEstablishment, successor: SuccessorOpt | None) -> None:
    school["closed"] = True
    _set_or_pop(school, "closeDate", est.close_date)
    _set_or_pop(school, "closeReason", est.close_reason)
    if successor:
        school["successorUrn"] = successor.urn
        if successor.name:
            school["successorName"] = successor.name
    else:
        school.pop("successorUrn", None)
        school.pop("successorName", None)


def _clear_closed(school: dict[str, Any]) -> None:
    school.pop("closed", None)
    school.pop("closeDate", None)
    school.pop("closeReason", None)
    school.pop("successorUrn", None)
    school.pop("successorName", None)


def _new_school(est: GiasEstablishment, *, period: str | None) -> dict[str, Any] | None:
    phases, age_range = phases_for_establishment(
        low_age=est.low_age,
        high_age=est.high_age,
        type_name=est.type_name,
        phase_name=est.phase_name,
    )
    if not phases:
        return None
    school: dict[str, Any] = {
        "urn": est.urn,
        "name": est.name,
        "localAuthority": est.la or None,
        "phase": suggest_phase(phases),
        "phases": phases,
        "sector": sector_from_type(est.type_name),
        "source": "gias",
        "compareUrl": (
            "https://www.compare-school-performance.service.gov.uk/school/"
            f"{est.urn}"
        ),
        "giasUrl": (
            "https://www.get-information-schools.service.gov.uk/"
            f"Establishments/Establishment/Details/{est.urn}"
        ),
    }
    if period:
        school["period"] = period
    if est.town:
        school["town"] = est.town
    if est.postcode:
        school["postcode"] = est.postcode.upper()
    if est.address:
        school["address"] = est.address
    if age_range:
        school["ageRange"] = age_range
    if est.type_name:
        school["schoolTypeLabel"] = est.type_name
    if est.phase_name:
        school["giasPhase"] = est.phase_name
    if est.religion:
        school["religiousDenomination"] = est.religion
    if est.website:
        school["schoolWebsite"] = est.website
    if est.telephone:
        school["telephone"] = est.telephone
    if est.open_date:
        school["openDate"] = est.open_date
    if est.open_reason:
        school["reasonEstablishmentOpened"] = est.open_reason
    return {k: v for k, v in school.items() if v is not None}


def _slug_for_la(la: str, la_by_slug: dict[str, str]) -> str | None:
    for slug, name in la_by_slug.items():
        if is_local_authority(la, name):
            return slug
    return None


def _seo_open_urns(
    indexes: dict[str, dict],
    included: list[str],
    seed_slug: str,
) -> set[str]:
    """Open URNs that receive a landing. Seed wins when a URN is duplicated."""
    seen: set[str] = set()
    order = [seed_slug, *[slug for slug in included if slug != seed_slug]]
    for slug in order:
        payload = indexes.get(slug)
        if not payload:
            continue
        for school in payload.get("schools") or []:
            urn = str(school.get("urn") or "")
            if not urn or urn in seen or school.get("closed"):
                continue
            seen.add(urn)
    return seen


def _indexed_urns(indexes: dict[str, dict]) -> set[str]:
    urns: set[str] = set()
    for payload in indexes.values():
        for school in payload.get("schools") or []:
            urn = str(school.get("urn") or "")
            if urn:
                urns.add(urn)
    return urns


def _open_urn_in_included(
    urn: str,
    indexes: dict[str, dict],
    included: list[str],
) -> bool:
    for slug in included:
        payload = indexes.get(slug)
        if not payload:
            continue
        for school in payload.get("schools") or []:
            if str(school.get("urn") or "") == urn and not school.get("closed"):
                return True
    return False


@dataclass
class LifecycleResult:
    closed_marked: int = 0
    sitemap_landings_removed: int = 0
    redirects: int = 0
    redirects_on_site: int = 0
    new_schools: int = 0
    address_fixes: int = 0
    contact_address_fixes: int = 0
    seo_pages_before: int = 0
    seo_pages_after: int = 0
    slots_freed: int = 0
    max_school_pages: int = 5000
    town_pages_before: int = 0
    town_pages_after: int = 0
    town_hubs_after: int = 0
    redirect_rows: list[dict[str, Any]] = field(default_factory=list)
    added_urns: list[str] = field(default_factory=list)


def _town_page_counts(
    indexes: dict[str, dict],
    included: list[str],
    *,
    town_min: int,
) -> tuple[int, int]:
    pages = 0
    hubs = 0
    for slug in included:
        payload = indexes.get(slug)
        if not payload:
            continue
        schools = [s for s in payload.get("schools") or [] if not s.get("closed")]
        stats = town_stats(schools, min_schools=town_min, area_slug=slug)
        count = int(stats["townCount"])
        pages += count
        if count:
            hubs += 1
    return pages, hubs


def apply_gias_lifecycle(
    indexes: dict[str, dict],
    establishments: list[GiasEstablishment],
    link_rows: list[dict[str, Any]],
    *,
    la_by_slug: dict[str, str],
    included_area_slugs: list[str],
    seed_slug: str,
    max_school_pages: int = 5000,
    town_min_schools: int = 8,
) -> LifecycleResult:
    """Mutate ``indexes`` in place. Does not add or remove area slugs."""
    result = LifecycleResult(max_school_pages=max_school_pages)
    included = list(included_area_slugs)
    result.seo_pages_before = len(_seo_open_urns(indexes, included, seed_slug))
    result.town_pages_before, _ = _town_page_counts(
        indexes, included, town_min=town_min_schools
    )

    by_urn = {est.urn: est for est in establishments}
    open_urns = {est.urn for est in establishments if is_listable_open_status(est.status)}
    successors = successor_options_from_links(link_rows)

    # Same-name open establishments in covered LAs, for the link-file fallback.
    open_by_name: dict[tuple[str, str], list[GiasEstablishment]] = {}
    for est in establishments:
        if not is_listable_open_status(est.status):
            continue
        slug = _slug_for_la(est.la, la_by_slug)
        if not slug:
            continue
        key = (norm_name(est.name), slug)
        open_by_name.setdefault(key, []).append(est)

    known = _indexed_urns(indexes)

    for slug, payload in indexes.items():
        for school in payload.get("schools") or []:
            urn = str(school.get("urn") or "")
            address_changed, contact_fixes = clean_school_placeholders(school)
            if address_changed:
                result.address_fixes += 1
            result.contact_address_fixes += contact_fixes
            est = by_urn.get(urn)
            if est is None:
                continue
            was_closed = bool(school.get("closed"))
            if is_closed_status(est.status):
                options = list(successors.get(urn) or [])
                chosen = choose_successor(options, open_urns=open_urns)
                if chosen is None:
                    chosen = _same_name_successor(school, est, slug, open_by_name, by_urn)
                if chosen and not chosen.name:
                    named = by_urn.get(chosen.urn)
                    if named:
                        chosen = SuccessorOpt(
                            urn=chosen.urn, name=named.name, date=chosen.date
                        )
                if not was_closed:
                    result.closed_marked += 1
                    if slug in included:
                        result.sitemap_landings_removed += 1
                _mark_closed(school, est, chosen)
            elif is_listable_open_status(est.status) and was_closed:
                _clear_closed(school)

    # Add open schools the covered LAs do not list yet.
    for est in establishments:
        if est.urn in known or not is_listable_open_status(est.status):
            continue
        slug = _slug_for_la(est.la, la_by_slug)
        if not slug or slug not in indexes:
            continue
        payload = indexes[slug]
        school = _new_school(est, period=payload.get("period"))
        if school is None:
            continue
        payload.setdefault("schools", []).append(school)
        known.add(est.urn)
        result.new_schools += 1
        result.added_urns.append(est.urn)

    # Rebuild successor display names now that new schools exist, then redirects.
    redirect_rows: list[dict[str, Any]] = []
    seen_redirects: set[str] = set()
    for slug in included:
        payload = indexes.get(slug)
        if not payload:
            continue
        for school in payload.get("schools") or []:
            if not school.get("closed"):
                continue
            urn = str(school.get("urn") or "")
            successor_urn = str(school.get("successorUrn") or "")
            if not urn or not successor_urn or urn in seen_redirects:
                continue
            successor_name = str(school.get("successorName") or "")
            if not successor_name:
                named = by_urn.get(successor_urn)
                successor_name = named.name if named else successor_urn
                school["successorName"] = successor_name
            on_site = _open_urn_in_included(successor_urn, indexes, included)
            seen_redirects.add(urn)
            redirect_rows.append(
                {
                    "urn": urn,
                    "name": school.get("name") or urn,
                    "localAuthority": school.get("localAuthority"),
                    "areaSlug": slug,
                    "successorUrn": successor_urn,
                    "successorName": successor_name,
                    "successorOnSite": on_site,
                    "closeDate": school.get("closeDate"),
                    "closeReason": school.get("closeReason"),
                }
            )
    redirect_rows.sort(key=lambda row: row["urn"])
    result.redirect_rows = redirect_rows
    result.redirects = len(redirect_rows)
    result.redirects_on_site = sum(1 for row in redirect_rows if row["successorOnSite"])

    for payload in indexes.values():
        recount_open_stats(payload)

    result.seo_pages_after = len(_seo_open_urns(indexes, included, seed_slug))
    result.slots_freed = result.seo_pages_before - result.seo_pages_after
    result.town_pages_after, result.town_hubs_after = _town_page_counts(
        indexes, included, town_min=town_min_schools
    )
    return result


def _same_name_successor(
    school: dict[str, Any],
    est: GiasEstablishment,
    slug: str,
    open_by_name: dict[tuple[str, str], list[GiasEstablishment]],
    by_urn: dict[str, GiasEstablishment],
) -> SuccessorOpt | None:
    """One open same-name school in the LA, when the links file has no row."""
    key = (norm_name(school.get("name") or est.name), slug)
    candidates = [
        other
        for other in open_by_name.get(key, [])
        if other.urn != est.urn and is_listable_open_status(other.status)
    ]
    if est.close_date:
        dated = [
            other
            for other in candidates
            if not other.open_date or other.open_date >= est.close_date
        ]
        # Prefer candidates whose open date is known and not before the closure.
        known_dates = [other for other in dated if other.open_date]
        if len(known_dates) == 1:
            candidates = known_dates
        elif dated:
            candidates = dated
    if len(candidates) != 1:
        return None
    other = candidates[0]
    # Silence unused in case the caller only needs the urn.
    _ = by_urn
    return SuccessorOpt(urn=other.urn, name=other.name, date=other.open_date or "")


def apply_coverage_stats(coverage: dict[str, Any], result: LifecycleResult) -> dict[str, Any]:
    """Refresh recorded page counts. Leave the budget and included areas alone."""
    updated = {
        "version": coverage.get("version", 1),
        "generatedAt": coverage.get("generatedAt"),
        "pageBudget": dict(coverage.get("pageBudget") or {}),
        "policy": dict(coverage.get("policy") or {}),
        "includedAreaSlugs": list(coverage.get("includedAreaSlugs") or []),
    }
    stats = dict(coverage.get("stats") or {})
    max_schools = int(
        updated["pageBudget"].get("maxSchoolPages") or result.max_school_pages
    )
    stats["schoolPages"] = result.seo_pages_after
    stats["townPages"] = result.town_pages_after
    stats["townHubs"] = result.town_hubs_after
    stats["schoolBudgetUsedPct"] = (
        round(100.0 * result.seo_pages_after / max_schools, 1) if max_schools else 0.0
    )
    stats["giasSlotsFreed"] = result.slots_freed
    updated["stats"] = stats
    return updated


def sync_directory_schools(
    directory: dict[str, Any],
    schools: list[dict[str, Any]],
) -> None:
    """Drop closed URNs from the directory and append newly added open schools."""
    open_by_urn = {
        str(s.get("urn")): s for s in schools if s.get("urn") and not s.get("closed")
    }
    kept: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in directory.get("schools") or []:
        urn = str(row.get("urn") or "")
        school = open_by_urn.get(urn)
        if not school or urn in seen:
            continue
        for key in ("name", "town", "postcode"):
            if school.get(key):
                row[key] = school[key]
        kept.append(row)
        seen.add(urn)
    for school in schools:
        urn = str(school.get("urn") or "")
        if not urn or urn in seen or school.get("closed"):
            continue
        row = {
            key: school[key]
            for key in (
                "urn",
                "name",
                "localAuthority",
                "town",
                "postcode",
                "ageRange",
                "phase",
                "schoolTypeLabel",
                "sector",
            )
            if school.get(key) not in (None, "")
        }
        kept.append(row)
        seen.add(urn)
    directory["schools"] = kept
