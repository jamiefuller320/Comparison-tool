#!/usr/bin/env python3
"""Scheduled qualitative capture loop for School Compass.

Batch-resumable website capture → learned-term prune → selective synthesis →
citation learning → heuristic QA (optional agent) → merge into schools-index →
write digest.

Policy: coverage first, quality at minimum cost.
  - Default provider is none (free deterministic narratives).
  - Auto scope: GIAS website enrich, then pick the LA (Hampshire seed or a
    ready pack) with the most remaining website-bearing schools.
  - Skip-existing is the default (pass --no-skip-existing to recapture).
  - Stale re-screens use ETag / Last-Modified / content-hash and reuse
    unchanged pages (default: 28-day TTL, daily refresh budget).
  - Empty match is a successful no-op (allow-empty) so CI stays green when
    a pool is temporarily exhausted.
  - Daily QA defaults to heuristics only (`--qa-provider none`).

Usage:
  python3 scripts/run-qualitative-loop.py --dry-run
  python3 scripts/run-qualitative-loop.py --limit 40 --scope auto
  # Paid polish (richest schools first; higher evidence gate):
  CURSOR_API_KEY=… python3 scripts/run-qualitative-loop.py --limit 0 \\
    --synthesize-provider cursor --synthesize-limit 5
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
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import (  # noqa: E402
    PACKS_ROOT_REL,
    SEED_LOCAL_AUTHORITY,
    la_slug,
    normalize_la_name,
)

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
DEFAULT_CAPTURE = ROOT / "output" / "qualitative-capture.json"
DEFAULT_LEARNED = ROOT / "output" / "learned-url-terms.json"
DEFAULT_QA_LEARNED = ROOT / "output" / "learned-qa-patterns.json"
DEFAULT_PROGRESS = ROOT / "output" / "qualitative-progress.json"
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.md"
QA_DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-qa-latest.json"
PACKS_ROOT = ROOT / PACKS_ROOT_REL
MANIFEST = PACKS_ROOT / "manifest.json"


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


def processed_urns() -> set[str]:
    if not DEFAULT_PROGRESS.is_file():
        return set()
    try:
        payload = json.loads(DEFAULT_PROGRESS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return {str(u) for u in (payload.get("processedUrns") or []) if u}


def remaining_with_website(index_path: Path, *, la: str, known: set[str]) -> int:
    if not index_path.is_file():
        return 0
    try:
        schools = json.loads(index_path.read_text(encoding="utf-8")).get("schools") or []
    except (OSError, json.JSONDecodeError):
        return 0
    la_norm = normalize_la_name(la)
    n = 0
    for row in schools:
        if row.get("closed"):
            continue
        if la_norm and normalize_la_name(row.get("localAuthority")) != la_norm:
            continue
        urn = str(row.get("urn") or "").strip()
        if not urn or urn in known:
            continue
        if not (row.get("schoolWebsite") or "").strip():
            continue
        n += 1
    return n


def list_targets() -> list[tuple[str, Path]]:
    """Hampshire seed root + every ready region pack index."""
    targets: list[tuple[str, Path]] = [(SEED_LOCAL_AUTHORITY, DEFAULT_INDEX)]
    if not MANIFEST.is_file():
        return targets
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return targets
    packs = manifest.get("packs") or {}
    for slug, meta in packs.items():
        if not isinstance(meta, dict) or meta.get("status") != "ready":
            continue
        path = PACKS_ROOT / str(slug) / "schools-index.json"
        if not path.is_file():
            continue
        la = meta.get("localAuthority") or meta.get("la") or str(slug)
        # Prefer canonical label from the index when present.
        try:
            schools = json.loads(path.read_text(encoding="utf-8")).get("schools") or []
            if schools:
                la = schools[0].get("localAuthority") or la
        except (OSError, json.JSONDecodeError, IndexError, TypeError):
            pass
        # Never double-count Hampshire as a pack.
        if normalize_la_name(la) == normalize_la_name(SEED_LOCAL_AUTHORITY):
            continue
        if la_slug(la) != str(slug) and path.parent.name != la_slug(la):
            # Still allow; pack dir is source of truth.
            pass
        targets.append((str(la), path))
    return targets


def pick_target(
    *,
    scope: str,
    la_arg: str,
    known: set[str],
) -> tuple[str, Path, int]:
    """Choose (la, index_path, remaining_website_count)."""
    if scope == "seed":
        remaining = remaining_with_website(
            DEFAULT_INDEX, la=SEED_LOCAL_AUTHORITY, known=known
        )
        return SEED_LOCAL_AUTHORITY, DEFAULT_INDEX, remaining

    if scope == "la":
        # Explicit --la: seed index unless a matching ready pack exists.
        if normalize_la_name(la_arg) == normalize_la_name(SEED_LOCAL_AUTHORITY):
            remaining = remaining_with_website(
                DEFAULT_INDEX, la=SEED_LOCAL_AUTHORITY, known=known
            )
            return SEED_LOCAL_AUTHORITY, DEFAULT_INDEX, remaining
        slug = la_slug(la_arg)
        pack_index = PACKS_ROOT / slug / "schools-index.json"
        if pack_index.is_file():
            remaining = remaining_with_website(pack_index, la=la_arg, known=known)
            return la_arg, pack_index, remaining
        remaining = remaining_with_website(DEFAULT_INDEX, la=la_arg, known=known)
        return la_arg, DEFAULT_INDEX, remaining

    # scope == auto (or region): prefer Hampshire while it has website work,
    # otherwise the ready pack with the largest remaining website pool.
    scored: list[tuple[int, str, Path]] = []
    for la, path in list_targets():
        n = remaining_with_website(path, la=la, known=known)
        scored.append((n, la, path))
    scored.sort(key=lambda t: (-t[0], t[1] != SEED_LOCAL_AUTHORITY, t[1]))
    # Prefer seed when it still has work.
    for n, la, path in scored:
        if la == SEED_LOCAL_AUTHORITY and n > 0:
            return la, path, n
    best = scored[0] if scored else (0, SEED_LOCAL_AUTHORITY, DEFAULT_INDEX)
    return best[1], best[2], best[0]


def enrich_websites() -> None:
    """Fill schoolWebsite from GIAS for seed + ready packs before capture."""
    run(
        [
            sys.executable,
            str(SCRIPTS / "enrich-school-websites.py"),
            "--index",
            str(DEFAULT_INDEX),
            "--all-packs",
        ]
    )


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
        f"- Scope: `{payload.get('scope')}`",
        f"- LA: `{payload.get('la')}`",
        f"- Index: `{payload.get('index')}`",
        f"- Remaining with website (pre-capture): `{payload.get('remainingWithWebsite')}`",
        f"- Batch limit: `{payload.get('limit')}`",
        f"- Sidecar records before → after: "
        f"`{payload.get('sidecarBefore')}` → `{payload.get('sidecarAfter')}`",
        f"- Synthesize provider: `{payload.get('synthesizeProvider')}`",
        f"- QA provider: `{payload.get('qaProvider')}`",
        f"- QA reviewed / changed: "
        f"`{payload.get('qa', {}).get('reviewed', 0)}` / "
        f"`{payload.get('qa', {}).get('changedSchools', 0)}`",
        f"- Learned terms: `{payload.get('learnedTerms', {}).get('termCount', 0)}`",
        f"- Learned QA phrases: `{payload.get('qa', {}).get('learningAdded', 0)}`",
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
    parser.add_argument(
        "--scope",
        choices=("auto", "seed", "la"),
        default="auto",
        help="auto = Hampshire then widest ready pack; seed = Hampshire only; "
        "la = honour --la",
    )
    parser.add_argument("--la", default=SEED_LOCAL_AUTHORITY)
    parser.add_argument(
        "--limit",
        type=int,
        default=40,
        help="Max new schools to capture (free crawl; default 40)",
    )
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Recapture schools even if already in the sidecar (default: skip existing)",
    )
    parser.add_argument(
        "--refresh-stale-days",
        type=int,
        default=28,
        help="Re-screen existing captures older than N days (0 = off; default 28)",
    )
    parser.add_argument(
        "--refresh-limit",
        type=int,
        default=15,
        help="Max stale schools to change-detect re-screen per run (default 15)",
    )
    parser.add_argument(
        "--synthesize-provider",
        choices=("none", "auto", "cursor", "openai"),
        default="none",
        help="Narrative provider after capture (default: none = free deterministic)",
    )
    parser.add_argument(
        "--synthesize-limit",
        type=int,
        default=0,
        help="0 = all eligible (use a small number with cursor/auto)",
    )
    parser.add_argument(
        "--min-documented-areas",
        type=int,
        default=-1,
        help="Evidence gate override (-1 = provider default: 2 for none, 4 for paid)",
    )
    parser.add_argument(
        "--qa-limit",
        type=int,
        default=16,
        help="Max suspect schools for post-synth QA (0 = skip QA; default 16)",
    )
    parser.add_argument(
        "--qa-provider",
        choices=("none", "auto", "cursor", "openai"),
        default="none",
        help="QA agent provider (default: none = free heuristics only)",
    )
    parser.add_argument(
        "--qa-min-score",
        type=float,
        default=2.0,
        help="Minimum suspicion score for QA review",
    )
    parser.add_argument(
        "--skip-website-enrich",
        action="store_true",
        help="Skip GIAS website enrich (faster dry debugging)",
    )
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
        known = processed_urns()
        la, index_path, remaining = pick_target(
            scope=args.scope, la_arg=args.la, known=known
        )
        digest = {
            "ranAt": datetime.now(timezone.utc).isoformat(),
            "scope": args.scope,
            "la": la,
            "index": str(index_path.relative_to(ROOT)),
            "remainingWithWebsite": remaining,
            "limit": args.limit,
            "offset": args.offset,
            "skipExisting": skip_existing,
            "refreshStaleDays": args.refresh_stale_days,
            "refreshLimit": args.refresh_limit,
            "sidecarBefore": before,
            "sidecarAfter": before,
            "synthesizeProvider": args.synthesize_provider,
            "qaProvider": args.qa_provider,
            "qaLimit": args.qa_limit,
            "qa": {"reviewed": 0, "changedSchools": 0, "learningAdded": 0},
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

    if not args.skip_website_enrich:
        notes.append("Enriched schoolWebsite from GIAS (seed + ready packs).")
        enrich_websites()

    known = processed_urns()
    la, index_path, remaining = pick_target(
        scope=args.scope, la_arg=args.la, known=known
    )
    notes.append(
        f"Selected LA={la} index={index_path.relative_to(ROOT)} "
        f"remainingWithWebsite={remaining}."
    )

    capture_cmd = [
        sys.executable,
        str(SCRIPTS / "enrich-qualitative.py"),
        "--index",
        str(index_path),
        "--la",
        la,
        "--limit",
        str(args.limit),
        "--offset",
        str(args.offset),
        "--require-website",
        "--allow-empty",
    ]
    if skip_existing:
        capture_cmd.append("--skip-existing")
        if args.refresh_stale_days > 0 and args.refresh_limit > 0:
            capture_cmd.extend(
                [
                    "--refresh-stale-days",
                    str(args.refresh_stale_days),
                    "--refresh-limit",
                    str(args.refresh_limit),
                ]
            )
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
    if after_capture == before and remaining == 0:
        notes.append(
            "No new captures — website pool exhausted for selected LA "
            "(allow-empty no-op); still running synth/QA/refresh budget."
        )

    synth_provider = args.synthesize_provider
    synth_cmd = [
        sys.executable,
        str(SCRIPTS / "synthesize-qualitative.py"),
        "--capture",
        str(DEFAULT_CAPTURE),
        "--index",
        str(index_path),
        "--provider",
        synth_provider if synth_provider != "none" else "none",
        "--only-missing",
    ]
    if args.min_documented_areas >= 0:
        synth_cmd.extend(
            ["--min-documented-areas", str(args.min_documented_areas)]
        )
    if args.synthesize_limit:
        synth_cmd.extend(["--limit", str(args.synthesize_limit)])
    if args.no_merge:
        synth_cmd.append("--no-merge")
    # When provider is none, still attach deterministic narratives for new areas.
    # synthesize-qualitative also merges citation-validated URL terms into the lexicon.
    run(synth_cmd, env=env)

    after = capture_count(DEFAULT_CAPTURE)
    # Re-read lexicon after citation learning for an accurate digest.
    term_count = learned.get("termCount", 0)
    if DEFAULT_LEARNED.is_file():
        try:
            term_count = len(
                json.loads(DEFAULT_LEARNED.read_text(encoding="utf-8")).get("terms")
                or {}
            )
        except (OSError, json.JSONDecodeError):
            pass
    learned = {**learned, "termCount": term_count, "citationLearning": True}
    notes.append(
        f"Selective synth provider={synth_provider}; "
        f"learned terms after citation merge={term_count}."
    )

    qa_stats: dict = {
        "reviewed": 0,
        "changedSchools": 0,
        "findingsApplied": 0,
        "learningAdded": 0,
        "provider": args.qa_provider,
    }
    if args.qa_limit > 0:
        qa_cmd = [
            sys.executable,
            str(SCRIPTS / "qa-qualitative.py"),
            "--capture",
            str(DEFAULT_CAPTURE),
            "--limit",
            str(args.qa_limit),
            "--min-score",
            str(args.qa_min_score),
            "--provider",
            args.qa_provider,
            "--learned",
            str(DEFAULT_QA_LEARNED),
        ]
        run(qa_cmd, env=env)
        if QA_DIGEST_JSON.is_file():
            try:
                qa_payload = json.loads(QA_DIGEST_JSON.read_text(encoding="utf-8"))
                qa_stats = {
                    "reviewed": int(qa_payload.get("reviewed") or 0),
                    "changedSchools": int(qa_payload.get("changedSchools") or 0),
                    "findingsApplied": int(qa_payload.get("findingsApplied") or 0),
                    "learningAdded": int(qa_payload.get("learningAdded") or 0),
                    "provider": qa_payload.get("provider") or args.qa_provider,
                }
            except (OSError, json.JSONDecodeError, TypeError, ValueError):
                pass
        notes.append(
            f"QA provider={qa_stats.get('provider')}: "
            f"reviewed {qa_stats.get('reviewed', 0)}, "
            f"changed {qa_stats.get('changedSchools', 0)}, "
            f"learned phrases +{qa_stats.get('learningAdded', 0)}."
        )
        # Re-merge so stripped junk does not linger on the public index.
        if (
            not args.no_merge
            and int(qa_stats.get("changedSchools") or 0) > 0
            and DEFAULT_CAPTURE.is_file()
        ):
            merge_cmd = [
                sys.executable,
                str(CAPTURE_ROOT / "scripts" / "merge-qualitative.py"),
                "--index",
                str(index_path),
                "--capture",
                str(DEFAULT_CAPTURE),
            ]
            run(merge_cmd, env=env)
            notes.append(
                f"Re-merged {index_path.relative_to(ROOT)} after QA fixes."
            )
    else:
        notes.append("QA skipped (--qa-limit 0).")

    after = capture_count(DEFAULT_CAPTURE)
    digest = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "scope": args.scope,
        "la": la,
        "index": str(index_path.relative_to(ROOT)),
        "remainingWithWebsite": remaining,
        "limit": args.limit,
        "offset": args.offset,
        "skipExisting": skip_existing,
        "refreshStaleDays": args.refresh_stale_days,
        "refreshLimit": args.refresh_limit,
        "sidecarBefore": before,
        "sidecarAfter": after,
        "synthesizeProvider": synth_provider,
        "qaProvider": args.qa_provider,
        "qaLimit": args.qa_limit,
        "qa": qa_stats,
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
