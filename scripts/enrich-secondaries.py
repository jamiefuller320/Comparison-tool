#!/usr/bin/env python3
"""Merge open GIAS Edubase settings into the school index.

The core harvest is KS2 performance tables, so pure infants / nurseries /
secondaries were missing from map search. This script adds open establishments
that offer any of EY / KS1 / KS2 / KS3 / KS4 from statutory age range, then
geocodes new postcodes.

Usage:
  python3 scripts/enrich-secondaries.py
"""

from __future__ import annotations

import csv
import io
import json
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "public" / "data" / "schools-index.json"
DIRECTORY = ROOT / "public" / "data" / "schools-directory.json"
SUMMARY = ROOT / "public" / "data" / "harvest-summary.json"
CACHE = Path("/tmp/edubase-all.csv")
UA = "Mozilla/5.0 (compatible; Schoolside/0.1; +https://github.com/jamiefuller320/Comparison-tool)"


def phases_from_ages(lo: int, hi: int) -> list[str]:
    phases: list[str] = []
    if lo <= 4:
        phases.append("early-years")
    if lo <= 5 and hi >= 7:
        phases.append("ks1")
    if lo <= 10 and hi >= 9:
        phases.append("ks2")
    if lo <= 13 and hi >= 12:
        phases.append("ks3")
    if lo <= 15 and hi >= 15:
        phases.append("ks4")
    return phases


def suggest_phase(phases: list[str]) -> str:
    has_sec = "ks3" in phases or "ks4" in phases
    if has_sec and ("ks2" in phases or "ks1" in phases):
        return "all-through"
    if "ks3" in phases and "ks4" in phases:
        return "secondary"
    if "ks4" in phases:
        return "ks4"
    if "ks3" in phases:
        return "ks3"
    if "ks2" in phases and "ks1" in phases:
        return "primary"
    if "ks2" in phases:
        return "junior"
    if "ks1" in phases or "early-years" in phases:
        return "infant"
    return "other"


def download_edubase() -> Path:
    if CACHE.exists() and CACHE.stat().st_size > 1_000_000:
        return CACHE
    last_err: Exception | None = None
    for i in range(14):
        d = (date.today() - timedelta(days=i)).strftime("%Y%m%d")
        url = (
            "https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/"
            f"edubasealldata{d}.csv"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as resp:
                CACHE.write_bytes(resp.read())
            print(f"Downloaded Edubase {d} ({CACHE.stat().st_size // 1024} KB)", flush=True)
            return CACHE
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue
    raise RuntimeError(f"Could not download Edubase CSV: {last_err}")


def post_json(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": UA,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def bulk_geocode(postcodes: list[str]) -> dict[str, tuple[float, float]]:
    out: dict[str, tuple[float, float]] = {}
    batch = 100
    for i in range(0, len(postcodes), batch):
        chunk = postcodes[i : i + batch]
        for attempt in range(4):
            try:
                data = post_json("https://api.postcodes.io/postcodes", {"postcodes": chunk})
                break
            except urllib.error.HTTPError as exc:
                if attempt == 3 or exc.code not in {429, 500, 502, 503, 504}:
                    raise
                time.sleep(2**attempt)
        else:
            continue
        for row in data.get("result") or []:
            query = row.get("query")
            result = row.get("result")
            if not query or not result:
                continue
            lat, lon = result.get("latitude"), result.get("longitude")
            if lat is None or lon is None:
                continue
            out[str(query).upper()] = (float(lat), float(lon))
        print(f"  geocoded {min(i + batch, len(postcodes))}/{len(postcodes)}", flush=True)
        time.sleep(0.05)
    return out


def build_address(row: dict[str, str]) -> str | None:
    parts = [
        row.get("Street") or "",
        row.get("Locality") or "",
        row.get("Address3") or "",
        row.get("Town") or "",
        row.get("County (name)") or "",
        row.get("Postcode") or "",
    ]
    cleaned = [p.strip() for p in parts if p and str(p).strip() and str(p).strip().lower() != "z"]
    return ", ".join(cleaned) if cleaned else None


def main() -> int:
    payload = json.loads(INDEX.read_text(encoding="utf-8"))
    by_urn = {s["urn"]: s for s in payload["schools"]}
    before = len(by_urn)

    path = download_edubase()
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    added = 0
    updated_meta = 0
    new_schools: list[dict] = []

    for row in reader:
        if (row.get("EstablishmentStatus (name)") or "") != "Open":
            continue
        urn = str(row.get("URN") or "").strip()
        if not urn:
            continue
        try:
            lo = int(row.get("StatutoryLowAge") or "")
            hi = int(row.get("StatutoryHighAge") or "")
        except ValueError:
            continue
        phases = phases_from_ages(lo, hi)
        # Include every open setting that offers at least one parental stage
        # (EY, KS1, KS2, KS3, KS4) — not only secondaries.
        if not phases:
            continue

        age_range = f"{lo} to {hi}"
        name = (row.get("EstablishmentName") or "").strip()
        postcode = (row.get("Postcode") or "").strip().upper() or None
        town = (row.get("Town") or "").strip() or None
        la = (row.get("LA (name)") or "").strip() or None
        school_type = (row.get("TypeOfEstablishment (name)") or "").strip() or None
        religion = (row.get("ReligiousCharacter (name)") or "").strip()
        if religion in {"", "None", "Does not apply", "Not applicable"}:
            religion = None

        if urn in by_urn:
            existing = by_urn[urn]
            # Refresh age/phase metadata; keep KS2 attainment fields.
            existing["ageRange"] = age_range
            existing["phases"] = phases
            existing["phase"] = suggest_phase(phases)
            if postcode and not existing.get("postcode"):
                existing["postcode"] = postcode
            if town and not existing.get("town"):
                existing["town"] = town
            updated_meta += 1
            continue

        school = {
            "urn": urn,
            "name": name or urn,
            "localAuthority": la,
            "town": town,
            "postcode": postcode,
            "address": build_address(row),
            "ageRange": age_range,
            "phase": suggest_phase(phases),
            "phases": phases,
            "schoolTypeLabel": school_type,
            "religiousDenomination": religion,
            "compareUrl": (
                f"https://www.compare-school-performance.service.gov.uk/school/{urn}"
            ),
            "source": "gias",
            "giasPhase": (row.get("PhaseOfEducation (name)") or "").strip() or None,
        }
        new_schools.append(school)
        by_urn[urn] = school
        added += 1

    # Geocode schools missing coordinates
    need_geo = sorted(
        {
            str(s["postcode"]).upper()
            for s in by_urn.values()
            if s.get("postcode") and s.get("latitude") is None
        }
    )
    print(f"Geocoding {len(need_geo)} postcodes for schools without coordinates…", flush=True)
    coords = bulk_geocode(need_geo) if need_geo else {}
    with_coords = 0
    for school in by_urn.values():
        if school.get("latitude") is not None and school.get("longitude") is not None:
            with_coords += 1
            continue
        pc = school.get("postcode")
        if not pc:
            continue
        pair = coords.get(str(pc).upper())
        if not pair:
            continue
        school["latitude"] = round(pair[0], 6)
        school["longitude"] = round(pair[1], 6)
        with_coords += 1

    schools = sorted(by_urn.values(), key=lambda s: (s.get("localAuthority") or "", s.get("name") or ""))
    payload["schools"] = schools
    payload["stats"]["schoolCount"] = len(schools)
    payload["stats"]["withRwm"] = sum(1 for s in schools if s.get("rwmExpected") is not None)
    payload["stats"]["withCoordinates"] = with_coords
    payload["stats"]["localAuthorityCount"] = len(
        {s.get("localAuthority") for s in schools if s.get("localAuthority")}
    )
    payload["stats"]["giasEnriched"] = True
    infant_only = sum(
        1
        for s in schools
        if set(s.get("phases") or []).issubset({"early-years", "ks1"})
        and (s.get("phases") or [])
        and "ks2" not in (s.get("phases") or [])
    )
    payload["stats"]["infantOrNurseryCount"] = infant_only

    INDEX.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    directory = []
    for s in schools:
        row = {
            k: s[k]
            for k in [
                "urn",
                "name",
                "localAuthority",
                "town",
                "postcode",
                "ageRange",
                "phase",
                "schoolTypeLabel",
                "rwmExpected",
                "eligiblePupils",
            ]
            if k in s and s[k] not in (None, "")
        }
        directory.append(row)
    DIRECTORY.write_text(
        json.dumps(
            {
                "generatedAt": payload.get("generatedAt"),
                "period": payload.get("period"),
                "schools": directory,
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    summary = {
        "generatedAt": payload.get("generatedAt"),
        "period": payload.get("period"),
        "schoolCount": payload["stats"]["schoolCount"],
        "withRwm": payload["stats"]["withRwm"],
        "withCoordinates": with_coords,
        "localAuthorityCount": payload["stats"]["localAuthorityCount"],
        "secondaryAdded": added,
        "secondaryMetaUpdated": updated_meta,
        "indexBytes": INDEX.stat().st_size,
        "files": [
            "public/data/schools-index.json",
            "public/data/schools-directory.json",
        ],
    }
    SUMMARY.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (ROOT / "src" / "data" / "harvest-summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    print(
        json.dumps(
            {
                **summary,
                "beforeCount": before,
                "hounsdown": next(
                    (
                        {
                            "urn": s["urn"],
                            "name": s["name"],
                            "postcode": s.get("postcode"),
                            "phases": s.get("phases"),
                            "latitude": s.get("latitude"),
                            "longitude": s.get("longitude"),
                        }
                        for s in schools
                        if s["urn"] == "137229"
                    ),
                    None,
                ),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
