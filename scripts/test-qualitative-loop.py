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
        [sys.executable, str(ROOT / "scripts" / "run-qualitative-loop.py"), "--dry-run"],
        cwd=ROOT,
        text=True,
    )
    payload = json.loads(out)
    assert payload["dryRun"] is True
    assert payload["la"] == "Hampshire"
    assert payload.get("qaProvider") == "none"
    assert "qa" in payload
    digest = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.json"
    assert digest.is_file()
    print("OK qualitative-loop dry-run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
