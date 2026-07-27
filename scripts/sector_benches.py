"""KS4 sector means derived from schools already on the index."""

from __future__ import annotations

from typing import Any


def mean(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def ks4_benchmark_block(
    schools: list[dict[str, Any]],
    *,
    sector: str,
    ks4_year: str | None = None,
    ks5_year: str | None = None,
) -> dict[str, Any]:
    def collect(key: str) -> list[float]:
        return [
            float(s[key])
            for s in schools
            if s.get("sector") == sector and s.get(key) is not None
        ]

    att8_vals = collect("att8Average")
    ks5_aps_vals = collect("ks5ApsPerEntry")
    label = "independents" if sector == "independent" else "state schools"
    period = ks4_year
    ks5_period = ks5_year
    if period is None:
        for s in schools:
            if s.get("sector") == sector and s.get("ks4Period"):
                period = s.get("ks4Period")
                break
    if ks5_period is None:
        for s in schools:
            if s.get("sector") == sector and s.get("ks5Period"):
                ks5_period = s.get("ks5Period")
                break
    return {
        "att8Average": mean(att8_vals),
        "engMath94Percent": mean(collect("engMath94Percent")),
        "engMath95Percent": mean(collect("engMath95Percent")),
        "ebaccEnteringPercent": mean(collect("ebaccEnteringPercent")),
        "anyPassPercent": mean(collect("anyPassPercent")),
        "ebaccEng94Percent": mean(collect("ebaccEng94Percent")),
        "ebaccMat94Percent": mean(collect("ebaccMat94Percent")),
        "ks5ApsPerEntry": mean(ks5_aps_vals),
        "ks5Best3Aps": mean(collect("ks5Best3Aps")),
        "period": period,
        "ks5Period": ks5_period,
        "schoolCount": len(att8_vals),
        "ks5SchoolCount": len(ks5_aps_vals),
        "note": (
            f"Mean of {label} in this index with usable KS4 figures "
            "(nil/zero returns removed); KS5 means use A-level APS where published"
        ),
    }


def recompute_index_sector_benches(payload: dict[str, Any]) -> dict[str, Any]:
    """Recompute KS4 sector means + related stats from schools already in the index."""
    schools = payload.get("schools") or []
    benches = payload.setdefault("benchmarks", {})
    indie = ks4_benchmark_block(schools, sector="independent")
    state = ks4_benchmark_block(schools, sector="state")
    prior_indie = benches.get("independent") or {}
    prior_state = benches.get("stateKs4") or {}
    if indie.get("period") is None:
        indie["period"] = prior_indie.get("period")
    if indie.get("ks5Period") is None:
        indie["ks5Period"] = prior_indie.get("ks5Period")
    if state.get("period") is None:
        state["period"] = prior_state.get("period")
    if state.get("ks5Period") is None:
        state["ks5Period"] = prior_state.get("ks5Period")
    benches["independent"] = indie
    benches["stateKs4"] = state

    stats = payload.setdefault("stats", {})
    stats["schoolCount"] = len(schools)
    stats["withRwm"] = sum(1 for s in schools if s.get("rwmExpected") is not None)
    stats["stateCount"] = sum(1 for s in schools if s.get("sector") == "state")
    stats["independentCount"] = sum(
        1 for s in schools if s.get("sector") == "independent"
    )
    stats["stateWithKs4"] = sum(
        1
        for s in schools
        if s.get("sector") == "state" and s.get("att8Average") is not None
    )
    stats["independentWithKs4"] = indie["schoolCount"]
    stats["stateWithKs5"] = sum(
        1
        for s in schools
        if s.get("sector") == "state" and s.get("ks5ApsPerEntry") is not None
    )
    stats["independentWithKs5"] = indie["ks5SchoolCount"]
    stats["withCoordinates"] = sum(
        1 for s in schools if s.get("latitude") is not None
    )
    stats["localAuthorityCount"] = len(
        {s.get("localAuthority") for s in schools if s.get("localAuthority")}
    )
    infant_only = sum(
        1
        for s in schools
        if set(s.get("phases") or []).issubset({"early-years", "ks1"})
        and (s.get("phases") or [])
        and "ks2" not in (s.get("phases") or [])
    )
    stats["infantOrNurseryCount"] = infant_only
    return payload
