#!/usr/bin/env python3
"""Unit checks for classify-user-improvement-flag.py."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "classify-user-improvement-flag.py"


def run(payload: dict) -> dict:
    proc = subprocess.run(
        [sys.executable, str(SCRIPT)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def main() -> None:
    chrome = run(
        {
            "snippet": "Enrichment & clubs: Dinner Menu, Pay Online, Football Club",
            "area": "enrichment",
            "reasonCode": "chrome-nav",
        }
    )
    assert chrome["gate"] == "chrome_auto", chrome
    phrases = {p["phrase"].lower() for p in chrome["phrases"]}
    assert any("dinner" in p or "pay online" in p for p in phrases), phrases
    assert all(p["junkClass"] == "user_chrome" for p in chrome["phrases"])

    ethos = run(
        {
            "snippet": "We are a Catholic community rooted in Gospel values.",
            "area": "ethos",
            "reasonCode": "missing-point",
        }
    )
    assert ethos["gate"] == "gated_refresh", ethos

    outdated = run(
        {
            "snippet": "The school website lists Chess Club, Drama",
            "area": "enrichment",
            "reasonCode": "outdated",
        }
    )
    assert outdated["gate"] == "gated_review", outdated

    other = run(
        {
            "snippet": "Something odd about this paragraph",
            "area": None,
            "reasonCode": "other",
            "reasonDetail": "Doesn’t match the school site I opened",
        }
    )
    assert other["gate"] in {"gated_review", "ignore"}, other

    print("OK classify-user-improvement-flag")


if __name__ == "__main__":
    main()
