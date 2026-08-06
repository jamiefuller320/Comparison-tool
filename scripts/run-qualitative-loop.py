#!/usr/bin/env python3
"""Scheduled qualitative capture loop for School Compass.

Batch-resumable website capture → learned-term prune → selective synthesis →
merge into schools-index → write digest.

Default CI path uses deterministic narratives (no LLM spend). Pass
--synthesize-provider openai|cursor when the matching API key is available.

Usage:
  python3 scripts/run-qualitative-loop.py --dry-run
  python3 scripts/run-qualitative-loop.py --limit 25 --skip-existing
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
SCRIPTS = Path(__file__).resolve().parent

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
DEFAULT_CAPTURE = ROOT / "output" / "qualitative-capture.json"
DEFAULT_LEARNED = ROOT / "output" / "learned-url-terms.json"
DEFAULT_PROGRESS = ROOT / "output" / "qualitative-progress.json"
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.md"


def run(cmd: list[str], *, env: dict[str, str] | None = None) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT, env=env)


def capture_count(path: Path) -> int:
    if not path.is_file():
        return 0
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return 0
    return len(payload.get("records") or [])


def rebuild_learned_terms() -> dict:
    sys.path.insert(0, str(CAPTURE_ROOT))
    from school_capture.learned_terms import (
        build_from_capture_file,
        decay_learned_terms,
        load_learned_term_counts,
        merge_learned_terms,
        save_learned_terms,
    )

    if not DEFAULT_CAPTURE.is_file():
        return {"termCount": 0, "boostTermCount": 0, "rebuilt": False}

    rebuilt, df, n_schools = build_from_capture_file(DEFAULT_CAPTURE)
    existing = load_learned_term_counts(DEFAULT_LEARNED)
    # Mild decay on prior store so stale CMS noise fades across weeks.
    decayed = decay_learned_terms(existing, factor=0.92)
    merged = merge_learned_terms(decayed, rebuilt)
    boosts = save_learned_terms(
        merged,
        DEFAULT_LEARNED,
        min_count=2,
        df=df,
        school_count=n_schools,
    )
    return {
        "termCount": len(merged),
        "boostTermCount": len(boosts),
        "schoolCount": n_schools,
        "rebuilt": True,
        "fromCapture": len(rebuilt),
    }


def write_digest(payload: dict) -> None:
    DIGEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    DIGEST_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    lines = [
        "# Qualitative capture loop",
        "",
        f"- Ran at: `{payload.get('ranAt')}`",
        f"- LA: `{payload.get('la')}`",
        f"- Batch limit: `{payload.get('limit')}`",
        f"- Sidecar records before → after: "
        f"`{payload.get('sidecarBefore')}` → `{payload.get('sidecarAfter')}`",
        f"- Synthesize provider: `{payload.get('synthesizeProvider')}`",
        f"- Learned terms: `{payload.get('learnedTerms', {}).get('termCount', 0)}`",
        f"- Dry run: `{payload.get('dryRun')}`",
        "",
    ]
    if payload.get("notes"):
        lines.append("## Notes")
        lines.append("")
        for note in payload["notes"]:
            lines.append(f"- {note}")
        lines.append("")
    DIGEST_MD.write_text("\n".join(lines), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Qualitative capture continuous loop")
    parser.add_argument("--la", default="Hampshire")
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Recapture schools even if already in the sidecar (default: skip existing)",
    )
    parser.add_argument(
        "--synthesize-provider",
        choices=("none", "auto", "cursor", "openai"),
        default="none",
        help="Narrative provider after capture (default: none = deterministic via synthesize script)",
    )
    parser.add_argument("--synthesize-limit", type=int, default=0, help="0 = all eligible")
    parser.add_argument("--min-documented-areas", type=int, default=2)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-merge", action="store_true")
    args = parser.parse_args(argv)

    skip_existing = not args.no_skip_existing
    before = capture_count(DEFAULT_CAPTURE)
    notes: list[str] = []

    if args.dry_run:
        notes.append("Dry run — capture/synth/merge skipped; digest only.")
        term_count = 0
        if DEFAULT_LEARNED.is_file():
            term_count = len(
                json.loads(DEFAULT_LEARNED.read_text(encoding="utf-8")).get("terms")
                or {}
            )
        digest = {
            "ranAt": datetime.now(timezone.utc).isoformat(),
            "la": args.la,
            "limit": args.limit,
            "offset": args.offset,
            "skipExisting": skip_existing,
            "sidecarBefore": before,
            "sidecarAfter": before,
            "synthesizeProvider": args.synthesize_provider,
            "learnedTerms": {"termCount": term_count, "rebuilt": False},
            "dryRun": True,
            "notes": notes,
        }
        write_digest(digest)
        print(json.dumps(digest, indent=2))
        return 0

    env = os.environ.copy()
    env["PYTHONPATH"] = str(CAPTURE_ROOT) + (
        ":" + env["PYTHONPATH"] if env.get("PYTHONPATH") else ""
    )

    capture_cmd = [
        sys.executable,
        str(SCRIPTS / "enrich-qualitative.py"),
        "--index",
        str(DEFAULT_INDEX),
        "--la",
        args.la,
        "--limit",
        str(args.limit),
        "--offset",
        str(args.offset),
        "--require-website",
    ]
    if skip_existing:
        capture_cmd.append("--skip-existing")
    if args.no_merge:
        capture_cmd.append("--no-merge")
    # Capture without inline LLM; selective synth is a separate step.
    run(capture_cmd, env=env)

    after_capture = capture_count(DEFAULT_CAPTURE)
    learned = rebuild_learned_terms()
    notes.append(
        f"Captured batch (sidecar {before} → {after_capture}); "
        f"learned terms now {learned.get('termCount', 0)}."
    )

    synth_provider = args.synthesize_provider
    synth_cmd = [
        sys.executable,
        str(SCRIPTS / "synthesize-qualitative.py"),
        "--capture",
        str(DEFAULT_CAPTURE),
        "--index",
        str(DEFAULT_INDEX),
        "--provider",
        synth_provider if synth_provider != "none" else "none",
        "--only-missing",
        "--min-documented-areas",
        str(args.min_documented_areas),
    ]
    if args.synthesize_limit:
        synth_cmd.extend(["--limit", str(args.synthesize_limit)])
    if args.no_merge:
        synth_cmd.append("--no-merge")
    # When provider is none, still attach deterministic narratives for new areas.
    run(synth_cmd, env=env)

    after = capture_count(DEFAULT_CAPTURE)
    digest = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "la": args.la,
        "limit": args.limit,
        "offset": args.offset,
        "skipExisting": skip_existing,
        "sidecarBefore": before,
        "sidecarAfter": after,
        "synthesizeProvider": synth_provider,
        "learnedTerms": learned,
        "dryRun": False,
        "notes": notes,
        "progressPath": str(DEFAULT_PROGRESS.relative_to(ROOT)),
    }
    write_digest(digest)
    print(json.dumps(digest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
