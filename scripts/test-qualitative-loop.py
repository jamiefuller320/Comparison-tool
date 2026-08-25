#!/usr/bin/env python3
"""Smoke test for the qualitative capture loop dry-run path."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    out = subprocess.check_output(
        [
            sys.executable,
            str(ROOT / "scripts" / "run-qualitative-loop.py"),
            "--dry-run",
            "--skip-website-enrich",
            "--scope",
            "parallel",
            "--parallel-las",
            "Dorset|East Sussex",
            "--include-seed",
        ],
        cwd=ROOT,
        text=True,
    )
    payload = json.loads(out)
    assert payload["dryRun"] is True
    assert payload.get("scope") == "parallel"
    assert payload.get("la")
    assert payload.get("index")
    assert "remainingWithWebsite" in payload
    assert payload.get("qaProvider") == "none"
    assert "qa" in payload
    streams = payload.get("streams") or []
    assert len(streams) == 3, streams
    las = {s.get("la") for s in streams}
    assert "Hampshire" in las
    assert "Dorset" in las
    assert "East Sussex" in las
    assert payload.get("limit") == 60
    digest = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.json"
    assert digest.is_file()
    print("OK qualitative-loop parallel dry-run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
