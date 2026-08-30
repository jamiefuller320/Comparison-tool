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
            "--advance-streams",
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
    assert payload.get("advanceStreams") is True
    assert payload.get("qaProvider") == "none"
    assert "qa" in payload
    streams = payload.get("streams") or []
    assert len(streams) == 3, streams
    # Preferred starters may be exhausted; advance fills slots with next LAs.
    las = {s.get("la") for s in streams}
    assert len(las) == 3, las
    notes = " ".join(payload.get("notes") or [])
    # With current production data Hants/Dorset/East Sussex are exhausted,
    # so advancement notes (or remaining>0 on replacements) should appear.
    advanced = any(
        "advanced to" in n for n in (payload.get("notes") or [])
    ) or any(int(s.get("remainingWithWebsite") or 0) > 0 for s in streams)
    exhausted_fallback = all(
        int(s.get("remainingWithWebsite") or 0) == 0 for s in streams
    )
    assert advanced or exhausted_fallback, (las, notes[:500])
    assert payload.get("limit") == 60
    digest = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.json"
    assert digest.is_file()
    print("OK qualitative-loop parallel dry-run")

    # Explicit no-advance keeps preferred LAs even when empty.
    out2 = subprocess.check_output(
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
            "--no-advance-streams",
        ],
        cwd=ROOT,
        text=True,
    )
    payload2 = json.loads(out2)
    las2 = {s.get("la") for s in (payload2.get("streams") or [])}
    assert las2 == {"Hampshire", "Dorset", "East Sussex"}, las2
    assert payload2.get("advanceStreams") is False
    print("OK qualitative-loop no-advance preferred LAs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
