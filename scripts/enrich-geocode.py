#!/usr/bin/env python3
"""Enrich schools-index.json with latitude/longitude via postcodes.io.

Usage:
  python3 scripts/enrich-geocode.py
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "public" / "data" / "schools-index.json"
DIRECTORY = ROOT / "public" / "data" / "schools-directory.json"
SUMMARY = ROOT / "public" / "data" / "harvest-summary.json"
UA = "Schoolside/0.1 (https://github.com/jamiefuller320/Comparison-tool)"
BATCH = 100


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


def bulk_lookup(postcodes: list[str]) -> dict[str, tuple[float, float]]:
    out: dict[str, tuple[float, float]] = {}
    for i in range(0, len(postcodes), BATCH):
        chunk = postcodes[i : i + BATCH]
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
            lat = result.get("latitude")
            lon = result.get("longitude")
            if lat is None or lon is None:
                continue
            out[str(query).upper()] = (float(lat), float(lon))
        print(f"  geocoded {min(i + BATCH, len(postcodes))}/{len(postcodes)}", flush=True)
        time.sleep(0.05)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--index",
        default=str(INDEX.relative_to(ROOT)),
        help="Path to schools-index.json (default: public/data/schools-index.json)",
    )
    args = parser.parse_args()
    index_path = Path(args.index)
    if not index_path.is_absolute():
        index_path = ROOT / index_path
    if not index_path.exists():
        raise SystemExit(f"Missing {index_path}")

    payload = json.loads(index_path.read_text(encoding="utf-8"))
    schools = payload["schools"]
    unique = sorted(
        {
            str(s["postcode"]).upper()
            for s in schools
            if s.get("postcode")
        }
    )
    print(f"Unique postcodes: {len(unique)} across {len(schools)} schools", flush=True)
    coords = bulk_lookup(unique)

    hit = 0
    for school in schools:
        pc = school.get("postcode")
        if not pc:
            school.pop("latitude", None)
            school.pop("longitude", None)
            continue
        pair = coords.get(str(pc).upper())
        if not pair:
            school.pop("latitude", None)
            school.pop("longitude", None)
            continue
        school["latitude"] = round(pair[0], 6)
        school["longitude"] = round(pair[1], 6)
        hit += 1

    payload["stats"]["withCoordinates"] = hit
    index_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    directory_path = index_path.with_name("schools-directory.json")
    summary_path = index_path.with_name("harvest-summary.json")

    summary = {
        "generatedAt": payload.get("generatedAt"),
        "period": payload.get("period"),
        "schoolCount": payload["stats"]["schoolCount"],
        "withRwm": payload["stats"]["withRwm"],
        "withCoordinates": hit,
        "localAuthorityCount": payload["stats"]["localAuthorityCount"],
        "maintainedScope": payload.get("maintainedScope"),
        "files": [str(index_path.relative_to(ROOT)), str(directory_path.relative_to(ROOT))],
        "indexBytes": index_path.stat().st_size,
        "geocodedAt": time.strftime("%Y-%m-%d"),
    }
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    if index_path.resolve() == INDEX.resolve():
        (ROOT / "src" / "data" / "harvest-summary.json").write_text(
            json.dumps(summary, indent=2) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
