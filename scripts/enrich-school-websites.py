#!/usr/bin/env python3
"""Join GIAS/Edubase SchoolWebsite + giasUrl onto schools-index (all sectors).

Independents already get this via enrich-independents.py; state schools did not.
This pass fills the gap so every school can show a website (or GIAS) link.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from importlib.machinery import SourceFileLoader  # noqa: E402

_indie = SourceFileLoader(
    "enrich_independents", str(SCRIPTS / "enrich-independents.py")
).load_module()
ensure_edubase = _indie.ensure_edubase


def load_edubase_web_by_urn() -> dict[str, dict[str, str]]:
    path = ensure_edubase()
    raw = path.read_bytes()
    text = None
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise RuntimeError("Could not decode Edubase CSV")

    by_urn: dict[str, dict[str, str]] = {}
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        urn = str(row.get("URN") or "").strip()
        if not urn:
            continue
        website = (row.get("SchoolWebsite") or "").strip()
        entry: dict[str, str] = {
            "giasUrl": (
                "https://www.get-information-schools.service.gov.uk/"
                f"Establishments/Establishment/Details/{urn}"
            )
        }
        if website:
            if not website.startswith("http"):
                website = "https://" + website
            entry["schoolWebsite"] = website
        by_urn[urn] = entry
    return by_urn


def enrich_index(path: Path, edubase: dict[str, dict[str, str]]) -> dict[str, int]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    schools = payload.get("schools") or []
    added_web = 0
    added_gias = 0
    kept_web = 0
    for school in schools:
        urn = str(school.get("urn") or "").strip()
        gias = edubase.get(urn)
        if not gias:
            # Still provide a GIAS URL when URN looks numeric.
            if urn.isdigit() and not school.get("giasUrl"):
                school["giasUrl"] = (
                    "https://www.get-information-schools.service.gov.uk/"
                    f"Establishments/Establishment/Details/{urn}"
                )
                added_gias += 1
            continue
        if gias.get("schoolWebsite"):
            if school.get("schoolWebsite"):
                kept_web += 1
            else:
                added_web += 1
            school["schoolWebsite"] = gias["schoolWebsite"]
        if gias.get("giasUrl") and not school.get("giasUrl"):
            school["giasUrl"] = gias["giasUrl"]
            added_gias += 1
        elif gias.get("giasUrl"):
            school["giasUrl"] = gias["giasUrl"]

    path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    with_web = sum(1 for s in schools if s.get("schoolWebsite"))
    with_gias = sum(1 for s in schools if s.get("giasUrl"))
    return {
        "schools": len(schools),
        "withWebsite": with_web,
        "withGias": with_gias,
        "addedWebsite": added_web,
        "keptWebsite": kept_web,
        "addedGias": added_gias,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--index",
        default="public/data/schools-index.json",
        help="Schools index JSON (default: Hampshire root)",
    )
    parser.add_argument(
        "--all-packs",
        action="store_true",
        help="Also enrich every pack schools-index.json",
    )
    args = parser.parse_args()

    print("Loading Edubase…", flush=True)
    edubase = load_edubase_web_by_urn()
    print(f"  Edubase rows: {len(edubase)}", flush=True)

    targets = [ROOT / args.index]
    if args.all_packs:
        targets.extend(sorted((ROOT / "public/data/packs").glob("*/schools-index.json")))

    for path in targets:
        if not path.exists():
            print(f"Skip missing {path}", flush=True)
            continue
        stats = enrich_index(path, edubase)
        print(
            f"Updated {path.relative_to(ROOT)}: "
            f"website {stats['withWebsite']}/{stats['schools']} "
            f"(+{stats['addedWebsite']} new); "
            f"gias {stats['withGias']}/{stats['schools']}",
            flush=True,
        )


if __name__ == "__main__":
    main()
