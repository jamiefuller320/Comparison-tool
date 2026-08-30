#!/usr/bin/env python3
"""Smoke test for the qualitative quality loop dry-run path."""

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
            str(ROOT / "scripts" / "run-qualitative-quality-loop.py"),
            "--dry-run",
            "--limit",
            "50",
        ],
        cwd=ROOT,
        text=True,
    )
    payload = json.loads(out)
    assert payload["dryRun"] is True
    assert payload.get("provider") == "none"
    assert "before" in payload
    assert "suspectCount" in payload["before"]
    trigger = payload.get("trigger") or {}
    assert "shouldApply" in trigger
    assert "reason" in trigger
    assert "fingerprint" in trigger
    digest = ROOT / "public" / "data" / "packs" / "qualitative-quality-loop-latest.json"
    assert digest.is_file()
    print("OK qualitative-quality-loop dry-run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
