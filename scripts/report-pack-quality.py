#!/usr/bin/env python3
"""Report qualitative coverage for Hampshire root + ready region packs.

Prints mainstream / independent précis rates, ISI citation coverage, EY/CM
précis, and soft-launch guideline pass/fail. Read-only.

Usage:
  python3 scripts/report-pack-quality.py
  python3 scripts/report-pack-quality.py --json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import SEED_LOCAL_AUTHORITY, la_slug  # noqa: E402

MANIFEST = ROOT / "public" / "data" / "packs" / "manifest.json"

SPECIALISH = (
    "special",
    "alternative provision",
    "pupil referral",
    "hospital",
    "secure unit",
)


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def is_independent(school: dict) -> bool:
    return (school.get("sector") or "").lower() == "independent" or bool(
        school.get("isIndependent")
    )


def is_specialish(school: dict) -> bool:
    blob = " ".join(
        str(school.get(k) or "")
        for k in ("typeOfEstablishment", "phase", "name")
    ).lower()
    return any(token in blob for token in SPECIALISH)


def is_mainstream_primary(school: dict) -> bool:
    phase = (school.get("phase") or "").lower()
    phases = school.get("phases") or []
    return phase in {"primary", "infant", "junior", "middle deemed primary"} or (
        "ks2" in phases and "ks4" not in phases
    )


def is_mainstream_secondary(school: dict) -> bool:
    phase = (school.get("phase") or "").lower()
    phases = school.get("phases") or []
    return phase in {"secondary", "all-through", "middle deemed secondary"} or (
        "ks4" in phases
    )


def school_metrics(schools: list[dict]) -> dict:
    total = len(schools)
    with_precis = sum(1 for s in schools if s.get("inspectionPrecis"))
    indie = [s for s in schools if is_independent(s)]
    state = [s for s in schools if not is_independent(s)]
    ms = [s for s in state if not is_specialish(s)]
    ms_pri = [s for s in ms if is_mainstream_primary(s)]
    ms_sec = [s for s in ms if is_mainstream_secondary(s)]
    highlights = sum(
        1
        for s in schools
        if s.get("inspectionPrecis")
        and (s.get("inspectionStrengths") or s.get("inspectionImprovements"))
    )
    isi_urls = sum(
        1
        for s in indie
        if s.get("isiLatestReportUrl") or s.get("isiProfileUrl")
    )
    return {
        "schoolCount": total,
        "withPrecis": with_precis,
        "precisPct": round(100 * with_precis / total, 1) if total else 0.0,
        "mainstreamPrimaryPrecis": _rate(ms_pri),
        "mainstreamSecondaryPrecis": _rate(ms_sec),
        "independentPrecis": _rate(indie),
        "independentCount": len(indie),
        "independentWithIsiUrl": isi_urls,
        "highlightPct": round(100 * highlights / with_precis, 1) if with_precis else 0.0,
    }


def _rate(rows: list[dict]) -> dict:
    n = len(rows)
    with_p = sum(1 for s in rows if s.get("inspectionPrecis"))
    return {
        "n": n,
        "withPrecis": with_p,
        "pct": round(100 * with_p / n, 1) if n else 0.0,
    }


def provider_metrics(path: Path | None) -> dict:
    if not path or not path.exists():
        return {"n": 0, "withPrecis": 0, "pct": 0.0}
    payload = load(path)
    providers = payload.get("providers") or []
    n = len(providers)
    with_p = sum(1 for p in providers if p.get("inspectionPrecis"))
    return {
        "n": n,
        "withPrecis": with_p,
        "pct": round(100 * with_p / n, 1) if n else 0.0,
    }


def area_report(name: str, schools_path: Path, ey_path: Path, cm_path: Path) -> dict:
    schools = load(schools_path).get("schools") or []
    row = {
        "localAuthority": name,
        "slug": la_slug(name),
        **school_metrics(schools),
        "ey": provider_metrics(ey_path),
        "childminders": provider_metrics(cm_path),
    }
    row["softLaunchPass"] = (
        row["mainstreamPrimaryPrecis"]["pct"] >= 70
        and row["mainstreamSecondaryPrecis"]["pct"] >= 70
        and row["ey"]["pct"] >= 40
        and row["childminders"]["pct"] >= 40
    )
    return row


def collect() -> list[dict]:
    rows = [
        area_report(
            SEED_LOCAL_AUTHORITY,
            ROOT / "public/data/schools-index.json",
            ROOT / "public/data/ey-providers-index.json",
            ROOT / "public/data/childminders-index.json",
        )
    ]
    manifest = load(MANIFEST) if MANIFEST.exists() else {"packs": {}}
    packs = sorted(
        (manifest.get("packs") or {}).values(),
        key=lambda p: p.get("localAuthority") or "",
    )
    for pack in packs:
        if pack.get("status") != "ready":
            continue
        slug = pack["slug"]
        base = ROOT / "public/data/packs" / slug
        rows.append(
            area_report(
                pack["localAuthority"],
                base / "schools-index.json",
                base / "ey-providers-index.json",
                base / "childminders-index.json",
            )
        )
    return rows


def print_table(rows: list[dict]) -> None:
    header = (
        f"{'LA':32} {'sch%':>5} {'msP%':>5} {'msS%':>5} {'ind%':>5} "
        f"{'isi':>7} {'hl%':>5} {'ey%':>5} {'cm%':>5} pass"
    )
    print(header)
    print("-" * len(header))
    for row in rows:
        isi = (
            f"{row['independentWithIsiUrl']}/{row['independentCount']}"
            if row["independentCount"]
            else "0/0"
        )
        print(
            f"{row['localAuthority'][:32]:32} "
            f"{row['precisPct']:5.1f} "
            f"{row['mainstreamPrimaryPrecis']['pct']:5.1f} "
            f"{row['mainstreamSecondaryPrecis']['pct']:5.1f} "
            f"{row['independentPrecis']['pct']:5.1f} "
            f"{isi:>7} "
            f"{row['highlightPct']:5.1f} "
            f"{row['ey']['pct']:5.1f} "
            f"{row['childminders']['pct']:5.1f} "
            f"{'yes' if row['softLaunchPass'] else 'NO'}"
        )
    weak = sorted(
        [r for r in rows if r["slug"] != la_slug(SEED_LOCAL_AUTHORITY)],
        key=lambda r: (r["independentPrecis"]["pct"], r["precisPct"]),
    )[:5]
    print("\nWeakest pack independent précis:")
    for row in weak:
        print(
            f"  {row['localAuthority']}: "
            f"{row['independentPrecis']['withPrecis']}/"
            f"{row['independentPrecis']['n']} "
            f"({row['independentPrecis']['pct']}%) · "
            f"ISI URLs {row['independentWithIsiUrl']}/{row['independentCount']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    rows = collect()
    if args.json:
        print(json.dumps(rows, indent=2))
    else:
        print_table(rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
