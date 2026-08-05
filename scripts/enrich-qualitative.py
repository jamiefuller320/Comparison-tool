#!/usr/bin/env python3
"""Run qualitative website capture and merge into schools-index.json.

Usage:
  pip install -e 'tools/school-capture[llm]'
  python3 scripts/enrich-qualitative.py --la Hampshire --limit 12
  # Cursor SDK narratives (same arrangement as value_investor):
  CURSOR_API_KEY=crsr_... python3 scripts/enrich-qualitative.py --la Hampshire --limit 12 --synthesize
  # Or OpenAI:
  OPENAI_API_KEY=... python3 scripts/enrich-qualitative.py --la Hampshire --limit 12 --synthesize --synthesize-provider openai
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
DEFAULT_OUTPUT = ROOT / "output" / "qualitative-capture.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Capture qualitative school evidence.")
    parser.add_argument("--index", type=Path, default=DEFAULT_INDEX)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--la", default="Hampshire")
    parser.add_argument("--urn")
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--require-website", action="store_true")
    parser.add_argument("--synthesize", action="store_true")
    parser.add_argument(
        "--synthesize-provider",
        choices=("auto", "cursor", "openai", "none"),
        default="auto",
    )
    parser.add_argument("--synthesize-model", default="")
    parser.add_argument("--no-merge", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args, extra = parser.parse_known_args(argv)

    capture_cmd = [
        sys.executable,
        "-m",
        "school_capture.cli",
        "--index",
        str(args.index),
        "--la",
        args.la,
        "--limit",
        str(args.limit),
        "--output",
        str(args.output),
        "--learned-terms",
        str(ROOT / "output" / "learned-url-terms.json"),
        *extra,
    ]
    if args.urn:
        capture_cmd.extend(["--urn", args.urn])
    if args.require_website:
        capture_cmd.append("--require-website")
    if args.synthesize:
        capture_cmd.append("--synthesize")
        capture_cmd.extend(["--synthesize-provider", args.synthesize_provider])
        if args.synthesize_model:
            capture_cmd.extend(["--synthesize-model", args.synthesize_model])

    env = dict(**{k: v for k, v in __import__("os").environ.items()})
    pkg = str(CAPTURE_ROOT)
    env["PYTHONPATH"] = pkg + (":" + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")

    print("Running capture:", " ".join(capture_cmd), file=sys.stderr)
    subprocess.run(capture_cmd, cwd=CAPTURE_ROOT, env=env, check=True)

    if args.no_merge:
        return 0

    merge_cmd = [
        sys.executable,
        str(CAPTURE_ROOT / "scripts" / "merge-qualitative.py"),
        "--index",
        str(args.index),
        "--capture",
        str(args.output),
    ]
    if args.dry_run:
        merge_cmd.append("--dry-run")

    print("Merging sidecar:", " ".join(merge_cmd), file=sys.stderr)
    subprocess.run(merge_cmd, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
