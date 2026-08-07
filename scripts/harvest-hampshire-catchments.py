#!/usr/bin/env python3
"""Harvest Hampshire County Council school catchment polygons.

Source: Hampshire Open Data FeatureServers on ArcGIS Online (OS Open Data
licence). Layers cover infant/primary ages 4–6, junior ages 7–10, and
secondary ages 11–16. Cross-hatched / shared catchments may appear as
overlapping polygons.

Writes a lean GeoJSON FeatureCollection under public/data/catchments/ for
map overlay + home in/out checks. Features are keyed by URN when the DfE
establishment number maps via GIAS (LA 850).

Usage:
  python3 scripts/harvest-hampshire-catchments.py
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "data" / "catchments"
OUT_PATH = OUT_DIR / "hampshire.json"
GIAS_CACHE = Path("/tmp/edubase-all.csv")

UA = "Mozilla/5.0 (compatible; SchoolCompass/0.1; +https://github.com/jamiefuller320/Comparison-tool)"
HAMPSHIRE_LA_CODE = "850"

LAYERS = [
    {
        "band": "ages-4-6",
        "label": "Infant / primary (ages 4–6)",
        "url": "https://services-eu1.arcgis.com/JZryykSnmiY7YI6X/arcgis/rest/services/School_Catchments_4_6/FeatureServer/0",
    },
    {
        "band": "ages-7-10",
        "label": "Junior (ages 7–10)",
        "url": "https://services-eu1.arcgis.com/JZryykSnmiY7YI6X/arcgis/rest/services/School_Catchments_7_10/FeatureServer/0",
    },
    {
        "band": "ages-11-16",
        "label": "Secondary (ages 11–16)",
        "url": "https://services-eu1.arcgis.com/JZryykSnmiY7YI6X/arcgis/rest/services/School_Catchments_11_16/FeatureServer/0",
    },
]


def get_json(url: str, retries: int = 4) -> dict:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json", "User-Agent": UA},
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.load(resp)
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries - 1:
                time.sleep(2**attempt)
                continue
            raise
    raise RuntimeError(f"Failed GET {url}: {last}")


def download_gias() -> Path:
    if GIAS_CACHE.exists() and GIAS_CACHE.stat().st_size > 1_000_000:
        return GIAS_CACHE
    for delta in range(0, 14):
        d = (date.today() - timedelta(days=delta)).strftime("%Y%m%d")
        url = (
            "https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/"
            f"edubasealldata{d}.csv"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as resp:
                GIAS_CACHE.write_bytes(resp.read())
            return GIAS_CACHE
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                continue
            raise
    raise RuntimeError("Could not download GIAS edubase CSV")


def hampshire_estab_to_urn() -> dict[str, str]:
    path = download_gias()
    # GIAS is latin-1 historically
    text = path.read_bytes().decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    out: dict[str, str] = {}
    for row in reader:
        la = (row.get("LA (code)") or "").strip()
        if la != HAMPSHIRE_LA_CODE:
            continue
        estab = (row.get("EstablishmentNumber") or "").strip()
        urn = (row.get("URN") or "").strip()
        if estab and urn:
            out[estab.lstrip("0") or "0"] = urn
            out[estab.zfill(4)] = urn
    return out


def round_ring(ring: list, ndigits: int = 4, step: int = 4) -> list:
    if not ring:
        return ring
    simplified = []
    for i, pt in enumerate(ring):
        if i % step != 0 and i != 0 and i != len(ring) - 1:
            continue
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            continue
        simplified.append([round(float(pt[0]), ndigits), round(float(pt[1]), ndigits)])
    if simplified and simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified


def simplify_geometry(geom: dict | None) -> dict | None:
    if not geom:
        return None
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype == "Polygon":
        return {
            "type": "Polygon",
            "coordinates": [round_ring(ring) for ring in coords or []],
        }
    if gtype == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [
                [round_ring(ring) for ring in poly] for poly in coords or []
            ],
        }
    return geom


def fetch_layer_features(layer_url: str) -> list[dict]:
    features: list[dict] = []
    offset = 0
    page = 200
    while True:
        query = urllib.parse.urlencode(
            {
                "where": "1=1",
                "outFields": "School,Dfe",
                "returnGeometry": "true",
                "outSR": "4326",
                "f": "geojson",
                "resultOffset": str(offset),
                "resultRecordCount": str(page),
            }
        )
        payload = get_json(f"{layer_url}/query?{query}")
        batch = payload.get("features") or []
        features.extend(batch)
        if not batch:
            break
        if payload.get("exceededTransferLimit") or len(batch) >= page:
            offset += len(batch)
            continue
        break
    return features


def build_feature(
    raw: dict,
    band: str,
    estab_to_urn: dict[str, str],
) -> dict | None:
    props = raw.get("properties") or {}
    dfe_raw = str(props.get("Dfe") or "").strip()
    if not dfe_raw:
        return None
    dfe = dfe_raw.lstrip("0") or "0"
    urn = estab_to_urn.get(dfe) or estab_to_urn.get(dfe_raw.zfill(4))
    geom = simplify_geometry(raw.get("geometry"))
    if not geom:
        return None
    return {
        "type": "Feature",
        "properties": {
            "urn": urn,
            "name": (props.get("School") or "").strip() or None,
            "dfe": dfe_raw.zfill(4),
            "laEstab": f"{HAMPSHIRE_LA_CODE}{dfe_raw.zfill(4)}",
            "band": band,
        },
        "geometry": geom,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        type=Path,
        default=OUT_PATH,
        help="Output GeoJSON path",
    )
    args = parser.parse_args()

    estab_to_urn = hampshire_estab_to_urn()
    features: list[dict] = []
    stats: dict[str, int] = {}

    for layer in LAYERS:
        raw_features = fetch_layer_features(layer["url"])
        kept = 0
        with_urn = 0
        for raw in raw_features:
            feat = build_feature(raw, layer["band"], estab_to_urn)
            if not feat:
                continue
            features.append(feat)
            kept += 1
            if feat["properties"].get("urn"):
                with_urn += 1
        stats[layer["band"]] = kept
        print(
            f"{layer['band']}: kept {kept} / fetched {len(raw_features)} "
            f"(URN-matched {with_urn})"
        )

    payload = {
        "type": "FeatureCollection",
        "generatedAt": date.today().isoformat(),
        "localAuthority": "Hampshire",
        "laCode": HAMPSHIRE_LA_CODE,
        "source": {
            "publisher": "Hampshire County Council",
            "licence": "OS Open Data Licence",
            "note": (
                "Catchment polygons from Hampshire Open Data ArcGIS layers. "
                "Boundaries change; living in-catchment does not guarantee a place. "
                "Academies and faith schools may apply different admissions criteria."
            ),
            "layers": [
                {"band": layer["band"], "label": layer["label"], "url": layer["url"]}
                for layer in LAYERS
            ],
            "finder": "https://www.hants.gov.uk/educationandlearning/findaschool/schooldetails",
        },
        "stats": {"featureCount": len(features), "byBand": stats},
        "features": features,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {args.out} ({args.out.stat().st_size:,} bytes, {len(features)} features)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
