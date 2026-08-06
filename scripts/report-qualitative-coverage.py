#!/usr/bin/env python3
"""Summarise qualitativeCapture coverage in a schools-index (or sidecar)."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Qualitative capture coverage report")
    parser.add_argument(
        "--index",
        type=Path,
        default=ROOT / "public" / "data" / "schools-index.json",
    )
    parser.add_argument(
        "--capture",
        type=Path,
        default=ROOT / "output" / "qualitative-capture.json",
        help="Optional sidecar for record count cross-check",
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    payload = json.loads(args.index.read_text(encoding="utf-8"))
    schools = payload.get("schools") or []
    with_web = [s for s in schools if (s.get("schoolWebsite") or "").strip()]
    with_q = [s for s in schools if s.get("qualitativeCapture")]

    methods: Counter[str] = Counter()
    documented_areas = 0
    rich_schools = 0
    for school in with_q:
        areas = (school.get("qualitativeCapture") or {}).get("areas") or []
        documented = 0
        for area in areas:
            method = area.get("synthesisMethod") or "none"
            methods[method] += 1
            if (area.get("signals") or []) or (area.get("offerings") or []):
                documented += 1
                documented_areas += 1
        if documented >= 2:
            rich_schools += 1

    sidecar_n = 0
    if args.capture.is_file():
        sidecar_n = len(
            json.loads(args.capture.read_text(encoding="utf-8")).get("records") or []
        )

    report = {
        "indexSchools": len(schools),
        "withWebsite": len(with_web),
        "withQualitativeCapture": len(with_q),
        "coverageOfWebsitesPct": round(
            100.0 * len(with_q) / max(1, len(with_web)), 1
        ),
        "richSchools": rich_schools,
        "documentedAreas": documented_areas,
        "synthesisMethods": dict(methods),
        "sidecarRecords": sidecar_n,
        "remainingWithWebsite": max(0, len(with_web) - len(with_q)),
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(
            f"Qualitative coverage: {report['withQualitativeCapture']}/"
            f"{report['withWebsite']} websites "
            f"({report['coverageOfWebsitesPct']}%)"
        )
        print(f"  Rich (≥2 evidenced areas): {report['richSchools']}")
        print(f"  Remaining with website: {report['remainingWithWebsite']}")
        print(f"  Synthesis methods: {report['synthesisMethods']}")
        print(f"  Sidecar records: {report['sidecarRecords']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
