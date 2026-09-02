#!/usr/bin/env python3
"""Scheduled qualitative capture loop for School Compass.

Batch-resumable website capture → learned-term prune → selective synthesis →
citation learning → heuristic QA (optional agent) → merge into schools-index →
write digest.

Policy: coverage first, quality at minimum cost.
  - Default provider is none (free deterministic narratives).
  - Auto scope: GIAS website enrich, then pick the LA (Hampshire seed or a
    ready pack) with the most remaining website-bearing schools.
  - Parallel streams: Hampshire seed + preferred pack LAs (Dorset / East Sussex
    by default). When a stream's website pool is exhausted, that slot advances
    to the ready pack with the largest remaining website pool (not already
    claimed by another stream).
  - Skip-existing is the default (pass --no-skip-existing to recapture).
  - Stale re-screens use ETag / Last-Modified / content-hash and reuse
    unchanged pages (default: 28-day TTL, daily refresh budget).
  - Empty match is a successful no-op (allow-empty) so CI stays green when
    a pool is temporarily exhausted.
  - Daily QA defaults to heuristics only (`--qa-provider none`).

Usage:
  python3 scripts/run-qualitative-loop.py --dry-run
  python3 scripts/run-qualitative-loop.py --limit 60 --scope auto
  python3 scripts/run-qualitative-loop.py --parallel-las "Dorset|East Sussex" \\
    --include-seed --limit 60
  # Paid polish (richest schools first; higher evidence gate):
  CURSOR_API_KEY=… python3 scripts/run-qualitative-loop.py --limit 0 \\
    --synthesize-provider cursor --synthesize-limit 5
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import (  # noqa: E402
    DEFAULT_PARALLEL_QUALITATIVE_LAS,
    PACKS_ROOT_REL,
    SEED_LOCAL_AUTHORITY,
    la_slug,
    normalize_la_name,
)

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
DEFAULT_CAPTURE = ROOT / "output" / "qualitative-capture.json"
DEFAULT_SHARDS = ROOT / "public" / "data" / "qualitative"
DEFAULT_LEARNED = ROOT / "output" / "learned-url-terms.json"
DEFAULT_QA_LEARNED = ROOT / "output" / "learned-qa-patterns.json"
DEFAULT_PROGRESS = ROOT / "output" / "qualitative-progress.json"
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "qualitative-loop-latest.md"
QA_DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-qa-latest.json"
PACKS_ROOT = ROOT / PACKS_ROOT_REL
MANIFEST = PACKS_ROOT / "manifest.json"
PARTIAL_DIR = ROOT / "output" / "qualitative-partials"

# Raised from 40 → 60 per stream to accelerate region website coverage.
DEFAULT_CAPTURE_LIMIT = 60


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
        targets.append((str(la), path))
    return targets


def resolve_la_index(la_arg: str) -> tuple[str, Path]:
    """Map an LA label to (canonical la, index path)."""
    if normalize_la_name(la_arg) == normalize_la_name(SEED_LOCAL_AUTHORITY):
        return SEED_LOCAL_AUTHORITY, DEFAULT_INDEX
    slug = la_slug(la_arg)
    pack_index = PACKS_ROOT / slug / "schools-index.json"
    if pack_index.is_file():
        return la_arg, pack_index
    return la_arg, DEFAULT_INDEX


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
        la, index_path = resolve_la_index(la_arg)
        remaining = remaining_with_website(index_path, la=la, known=known)
        return la, index_path, remaining

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


def parse_parallel_las(raw: str) -> list[str]:
    text = (raw or "").strip()
    if not text:
        return []
    sep = "|" if "|" in text else ","
    out: list[str] = []
    seen: set[str] = set()
    for part in text.split(sep):
        la = normalize_la_name(part)
        if not la:
            continue
        key = la.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(la)
    return out


def _la_key(la: str) -> str:
    return normalize_la_name(la).lower()


def select_parallel_stream_targets(
    preferred: list[str],
    *,
    known: set[str],
    advance: bool = True,
    resolve_index=None,
    remaining_fn=None,
    all_targets: list[tuple[str, Path]] | None = None,
) -> tuple[list[tuple[str, Path, int]], list[str]]:
    """Resolve parallel stream slots, advancing exhausted preferred LAs.

    Each preferred LA keeps its slot while it still has website work. When a
    slot is exhausted and ``advance`` is true, replace it with the ready pack
    (or seed) that has the largest remaining website pool and is not already
    claimed by another stream. Exhausted preferred LAs are retained only when
    nothing else remains (stale-refresh / allow-empty fallback).

    Returns ``(stream_targets, notes)``.
    """
    resolve = resolve_index or resolve_la_index
    remaining = remaining_fn or (
        lambda path, la, known_urns: remaining_with_website(
            path, la=la, known=known_urns
        )
    )
    notes: list[str] = []
    ordered = [normalize_la_name(la) for la in preferred if normalize_la_name(la)]
    if not ordered:
        return [], notes

    claimed: set[str] = set()
    streams: list[tuple[str, Path, int]] = []

    catalog = all_targets if all_targets is not None else list_targets()
    scored = []
    for la, path in catalog:
        n = remaining(path, la, known)
        scored.append((n, la, path))
    scored.sort(
        key=lambda t: (
            -t[0],
            normalize_la_name(t[1]) != normalize_la_name(SEED_LOCAL_AUTHORITY),
            t[1],
        )
    )

    def _pick_next() -> tuple[str, Path, int] | None:
        for n, la, path in scored:
            if n <= 0:
                continue
            if _la_key(la) in claimed:
                continue
            return la, path, n
        return None

    for preferred_la in ordered:
        la, index_path = resolve(preferred_la)
        rem = remaining(index_path, la, known)
        if rem > 0 or not advance:
            streams.append((la, index_path, rem))
            claimed.add(_la_key(la))
            continue

        replacement = _pick_next()
        if replacement is None:
            streams.append((la, index_path, rem))
            claimed.add(_la_key(la))
            notes.append(
                f"Stream preferred={preferred_la} exhausted "
                f"(remaining=0); no replacement LA with website work."
            )
            continue

        next_la, next_path, next_rem = replacement
        streams.append((next_la, next_path, next_rem))
        claimed.add(_la_key(next_la))
        notes.append(
            f"Stream preferred={preferred_la} exhausted (remaining=0); "
            f"advanced to {next_la} (remaining={next_rem})."
        )

    return streams, notes


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


def merge_capture_partials(partial_paths: list[Path], dest: Path) -> int:
    """Union records from partial sidecars into dest (URN-keyed)."""
    sys.path.insert(0, str(CAPTURE_ROOT))
    from school_capture.sidecar import load_capture_index, upsert_records

    by_urn: dict[str, Any] = {}
    # Seed from current dest so we never drop prior LAs.
    existing = load_capture_index(dest)
    if existing:
        for record in existing.records:
            by_urn[record.urn] = record
    for path in partial_paths:
        index = load_capture_index(path)
        if not index:
            continue
        for record in index.records:
            prior = by_urn.get(record.urn)
            if prior is None:
                by_urn[record.urn] = record
                continue
            # Prefer the newer assessment when both exist.
            prior_at = getattr(prior, "assessedAt", None) or ""
            new_at = getattr(record, "assessedAt", None) or ""
            if new_at >= prior_at:
                by_urn[record.urn] = record
    records = list(by_urn.values())
    if not records and not dest.is_file():
        return 0
    upsert_records(dest, records, stats={"mergedPartials": len(partial_paths)})
    return len(records)


def capture_one_stream(
    *,
    la: str,
    index_path: Path,
    limit: int,
    offset: int,
    skip_existing: bool,
    refresh_stale_days: int,
    refresh_limit: int,
    no_merge: bool,
    env: dict[str, str],
    partial_output: Path,
    progress_path: Path,
) -> dict[str, Any]:
    """Run one LA capture into a partial sidecar (seeded from the main file)."""
    PARTIAL_DIR.mkdir(parents=True, exist_ok=True)
    if DEFAULT_CAPTURE.is_file():
        shutil.copy2(DEFAULT_CAPTURE, partial_output)
    elif partial_output.is_file():
        partial_output.unlink()

    remaining = remaining_with_website(
        index_path, la=la, known=processed_urns() | _urns_in_capture(partial_output)
    )

    capture_cmd = [
        sys.executable,
        str(SCRIPTS / "enrich-qualitative.py"),
        "--index",
        str(index_path),
        "--la",
        la,
        "--limit",
        str(limit),
        "--offset",
        str(offset),
        "--output",
        str(partial_output),
        "--progress",
        str(progress_path),
        "--require-website",
        "--allow-empty",
        "--no-learned-terms",
    ]
    if skip_existing:
        capture_cmd.append("--skip-existing")
        if refresh_stale_days > 0 and refresh_limit > 0:
            capture_cmd.extend(
                [
                    "--refresh-stale-days",
                    str(refresh_stale_days),
                    "--refresh-limit",
                    str(refresh_limit),
                ]
            )
    if no_merge:
        capture_cmd.append("--no-merge")

    before = capture_count(partial_output)
    try:
        run(capture_cmd, env=env)
        status = "ok"
        error = None
    except subprocess.CalledProcessError as exc:
        status = "failed"
        error = str(exc)
    after = capture_count(partial_output)
    return {
        "la": la,
        "index": str(index_path.relative_to(ROOT)),
        "remainingWithWebsite": remaining,
        "partial": str(partial_output.relative_to(ROOT)),
        "progress": str(progress_path.relative_to(ROOT)),
        "before": before,
        "after": after,
        "added": max(0, after - before),
        "status": status,
        "error": error,
    }


def _urns_in_capture(path: Path) -> set[str]:
    if not path.is_file():
        return set()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return {str(r.get("urn")) for r in (payload.get("records") or []) if r.get("urn")}


def write_digest(payload: dict) -> None:
    DIGEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    DIGEST_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    streams = payload.get("streams") or []
    la_label = payload.get("la")
    if streams:
        la_label = ", ".join(str(s.get("la")) for s in streams)
    lines = [
        "# Qualitative capture loop",
        "",
        f"- Ran at: `{payload.get('ranAt')}`",
        f"- Scope: `{payload.get('scope')}`",
        f"- LA: `{la_label}`",
        f"- Index: `{payload.get('index')}`",
        f"- Remaining with website (pre-capture): `{payload.get('remainingWithWebsite')}`",
        f"- Batch limit (per stream): `{payload.get('limit')}`",
        f"- Sidecar records before → after: "
        f"`{payload.get('sidecarBefore')}` → `{payload.get('sidecarAfter')}`",
        f"- Parallel streams: `{len(streams)}`",
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
    if streams:
        lines.append("## Streams")
        lines.append("")
        for stream in streams:
            lines.append(
                f"- `{stream.get('la')}`: status={stream.get('status')} "
                f"added={stream.get('added')} "
                f"remaining={stream.get('remainingWithWebsite')} "
                f"index=`{stream.get('index')}`"
            )
        lines.append("")
    if payload.get("notes"):
        lines.append("## Notes")
        lines.append("")
        for note in payload["notes"]:
            lines.append(f"- {note}")
        lines.append("")
    DIGEST_MD.write_text("\n".join(lines), encoding="utf-8")


def merge_indexes(index_paths: list[Path], *, env: dict[str, str]) -> None:
    """Re-merge the shared sidecar into each affected schools index."""
    seen: set[Path] = set()
    for index_path in index_paths:
        resolved = index_path.resolve()
        if resolved in seen or not index_path.is_file():
            continue
        seen.add(resolved)
        run(
            [
                sys.executable,
                str(CAPTURE_ROOT / "scripts" / "merge-qualitative.py"),
                "--index",
                str(index_path),
                "--capture",
                str(DEFAULT_CAPTURE),
            ],
            env=env,
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Qualitative capture continuous loop")
    parser.add_argument(
        "--scope",
        choices=("auto", "seed", "la", "parallel"),
        default="auto",
        help="auto = Hampshire then widest ready pack; seed = Hampshire only; "
        "la = honour --la; parallel = seed + --parallel-las streams",
    )
    parser.add_argument("--la", default=SEED_LOCAL_AUTHORITY)
    parser.add_argument(
        "--parallel-las",
        default="",
        help=(
            "Pipe-separated pack LAs to capture in parallel with the seed "
            f'(e.g. "Dorset|East Sussex"). Empty with --scope parallel uses '
            f"{'|'.join(DEFAULT_PARALLEL_QUALITATIVE_LAS)}."
        ),
    )
    parser.add_argument(
        "--include-seed",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="When using parallel streams, also capture the Hampshire seed (default: true)",
    )
    parser.add_argument(
        "--advance-streams",
        action=argparse.BooleanOptionalAction,
        default=True,
        help=(
            "When a preferred parallel-stream LA has no remaining website work, "
            "advance that slot to the ready pack with the largest remaining pool "
            "(default: true)"
        ),
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_CAPTURE_LIMIT,
        help=f"Max new schools to capture per stream (default {DEFAULT_CAPTURE_LIMIT})",
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
        help="Max stale schools to change-detect re-screen per stream (default 15)",
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
    notes: list[str] = []
    sys.path.insert(0, str(CAPTURE_ROOT))
    from school_capture.sidecar import ensure_capture_sidecar

    hydrate = ensure_capture_sidecar(DEFAULT_CAPTURE, DEFAULT_SHARDS)
    if hydrate.get("hydrated"):
        notes.append(
            "Hydrated working sidecar from "
            f"{hydrate.get('shardCount', 0)} published URN shards "
            f"(prior={hydrate.get('priorSchoolCount', 0)} → "
            f"{hydrate.get('schoolCount', 0)})."
        )
    elif hydrate.get("reason") == "no-shards" and not DEFAULT_CAPTURE.is_file():
        notes.append("No published shards or working sidecar yet — starting empty.")

    before = capture_count(DEFAULT_CAPTURE)

    parallel_las = parse_parallel_las(args.parallel_las)
    if args.scope == "parallel" and not parallel_las:
        parallel_las = list(DEFAULT_PARALLEL_QUALITATIVE_LAS)
    # Honour --parallel-las even when scope was left at auto (workflow convenience).
    use_parallel = args.scope == "parallel" or bool(parallel_las)

    known = processed_urns()
    stream_targets: list[tuple[str, Path, int]] = []
    if use_parallel:
        ordered: list[str] = []
        if args.include_seed:
            ordered.append(SEED_LOCAL_AUTHORITY)
        for la in parallel_las:
            if normalize_la_name(la) == normalize_la_name(SEED_LOCAL_AUTHORITY):
                continue
            ordered.append(la)
        stream_targets, advance_notes = select_parallel_stream_targets(
            ordered,
            known=known,
            advance=bool(args.advance_streams),
        )
        notes.extend(advance_notes)
    else:
        la, index_path, remaining = pick_target(
            scope=args.scope, la_arg=args.la, known=known
        )
        stream_targets.append((la, index_path, remaining))

    if args.dry_run:
        notes.append("Dry run — capture/synth/merge skipped; digest only.")
        term_count = 0
        if DEFAULT_LEARNED.is_file():
            term_count = len(
                json.loads(DEFAULT_LEARNED.read_text(encoding="utf-8")).get("terms")
                or {}
            )
        streams = [
            {
                "la": la,
                "index": str(index_path.relative_to(ROOT)),
                "remainingWithWebsite": remaining,
                "status": "dry-run",
                "added": 0,
            }
            for la, index_path, remaining in stream_targets
        ]
        primary = stream_targets[0] if stream_targets else (
            SEED_LOCAL_AUTHORITY,
            DEFAULT_INDEX,
            0,
        )
        digest = {
            "ranAt": datetime.now(timezone.utc).isoformat(),
            "scope": "parallel" if use_parallel else args.scope,
            "la": primary[0],
            "index": str(primary[1].relative_to(ROOT)),
            "remainingWithWebsite": primary[2],
            "limit": args.limit,
            "offset": args.offset,
            "skipExisting": skip_existing,
            "refreshStaleDays": args.refresh_stale_days,
            "refreshLimit": args.refresh_limit,
            "advanceStreams": bool(args.advance_streams) if use_parallel else False,
            "sidecarBefore": before,
            "sidecarAfter": before,
            "streams": streams,
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

    # Re-resolve streams after website enrich (new websites may unlock pools,
    # and advance decisions should use the freshest remaining counts).
    known = processed_urns()
    if use_parallel:
        ordered = []
        if args.include_seed:
            ordered.append(SEED_LOCAL_AUTHORITY)
        for la in parallel_las:
            if normalize_la_name(la) == normalize_la_name(SEED_LOCAL_AUTHORITY):
                continue
            ordered.append(la)
        stream_targets, advance_notes = select_parallel_stream_targets(
            ordered,
            known=known,
            advance=bool(args.advance_streams),
        )
        for note in advance_notes:
            if note not in notes:
                notes.append(note)
    else:
        refreshed: list[tuple[str, Path, int]] = []
        for la, index_path, _ in stream_targets:
            remaining = remaining_with_website(index_path, la=la, known=known)
            refreshed.append((la, index_path, remaining))
        stream_targets = refreshed

    for la, index_path, remaining in stream_targets:
        notes.append(
            f"Stream LA={la} index={index_path.relative_to(ROOT)} "
            f"remainingWithWebsite={remaining}."
        )

    stream_results: list[dict[str, Any]] = []
    partial_paths: list[Path] = []

    def _run_stream(item: tuple[str, Path, int]) -> dict[str, Any]:
        la, index_path, _remaining = item
        slug = la_slug(la)
        partial = PARTIAL_DIR / f"{slug}.json"
        progress = ROOT / "output" / f"qualitative-progress-{slug}.json"
        return capture_one_stream(
            la=la,
            index_path=index_path,
            limit=args.limit,
            offset=args.offset,
            skip_existing=skip_existing,
            refresh_stale_days=args.refresh_stale_days,
            refresh_limit=args.refresh_limit,
            no_merge=True,  # merge once after all streams land
            env=env,
            partial_output=partial,
            progress_path=progress,
        )

    if len(stream_targets) == 1:
        result = _run_stream(stream_targets[0])
        stream_results.append(result)
        partial_paths.append(ROOT / result["partial"])
    else:
        notes.append(
            f"Running {len(stream_targets)} capture streams in parallel "
            f"(limit {args.limit} each)."
        )
        with ThreadPoolExecutor(max_workers=len(stream_targets)) as pool:
            futures = {
                pool.submit(_run_stream, item): item[0] for item in stream_targets
            }
            for fut in as_completed(futures):
                result = fut.result()
                stream_results.append(result)
                partial_paths.append(ROOT / result["partial"])
                if result.get("status") == "failed":
                    notes.append(
                        f"Stream {result.get('la')} failed: {result.get('error')}"
                    )

    # Stable digest order: seed first, then alpha.
    stream_results.sort(
        key=lambda s: (
            normalize_la_name(s.get("la")) != normalize_la_name(SEED_LOCAL_AUTHORITY),
            str(s.get("la") or ""),
        )
    )

    merged_count = merge_capture_partials(partial_paths, DEFAULT_CAPTURE)
    after_capture = capture_count(DEFAULT_CAPTURE)
    notes.append(
        f"Merged {len(partial_paths)} partial sidecar(s) → "
        f"{after_capture} records (union size {merged_count})."
    )

    # Refresh shared progress from the merged sidecar.
    if DEFAULT_CAPTURE.is_file():
        try:
            payload = json.loads(DEFAULT_CAPTURE.read_text(encoding="utf-8"))
            urns = sorted(
                str(r.get("urn"))
                for r in (payload.get("records") or [])
                if r.get("urn")
            )
            DEFAULT_PROGRESS.write_text(
                json.dumps(
                    {
                        "la": ", ".join(s["la"] for s in stream_results),
                        "las": [s["la"] for s in stream_results],
                        "updatedAt": datetime.now(timezone.utc).date().isoformat(),
                        "sidecarRecords": len(urns),
                        "lastBatchSize": sum(int(s.get("added") or 0) for s in stream_results),
                        "failures": sum(
                            1 for s in stream_results if s.get("status") == "failed"
                        ),
                        "processedUrns": urns,
                        "processedCount": len(urns),
                        "streams": stream_results,
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
        except (OSError, json.JSONDecodeError, TypeError):
            pass

    learned = rebuild_learned_terms()
    notes.append(
        f"Captured batch (sidecar {before} → {after_capture}); "
        f"learned terms now {learned.get('termCount', 0)}."
    )
    if after_capture == before and all(
        int(s.get("remainingWithWebsite") or 0) == 0 for s in stream_results
    ):
        notes.append(
            "No new captures — website pools exhausted for selected streams "
            "(allow-empty no-op); still running synth/QA/refresh budget."
        )

    # Merge into each affected index before synth so boards see new evidence.
    if not args.no_merge:
        merge_indexes([index for _la, index, _n in stream_targets], env=env)
        notes.append(
            f"Merged sidecar into {len(stream_targets)} schools-index file(s)."
        )

    synth_provider = args.synthesize_provider
    # Synthesize against the seed index path for schema; records are URN-global.
    primary_index = stream_targets[0][1] if stream_targets else DEFAULT_INDEX
    synth_cmd = [
        sys.executable,
        str(SCRIPTS / "synthesize-qualitative.py"),
        "--capture",
        str(DEFAULT_CAPTURE),
        "--index",
        str(primary_index),
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
    run(synth_cmd, env=env)

    after = capture_count(DEFAULT_CAPTURE)
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
        if (
            not args.no_merge
            and int(qa_stats.get("changedSchools") or 0) > 0
            and DEFAULT_CAPTURE.is_file()
        ):
            merge_indexes([index for _la, index, _n in stream_targets], env=env)
            notes.append("Re-merged affected schools-index files after QA fixes.")
    else:
        notes.append("QA skipped (--qa-limit 0).")

    after = capture_count(DEFAULT_CAPTURE)
    primary = stream_targets[0] if stream_targets else (
        SEED_LOCAL_AUTHORITY,
        DEFAULT_INDEX,
        0,
    )
    digest = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "scope": "parallel" if use_parallel else args.scope,
        "la": primary[0],
        "index": str(primary[1].relative_to(ROOT)),
        "remainingWithWebsite": primary[2],
        "limit": args.limit,
        "offset": args.offset,
        "skipExisting": skip_existing,
        "refreshStaleDays": args.refresh_stale_days,
        "refreshLimit": args.refresh_limit,
        "advanceStreams": bool(args.advance_streams) if use_parallel else False,
        "sidecarBefore": before,
        "sidecarAfter": after,
        "streams": stream_results,
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

    # Fail the job if every parallel stream failed.
    if stream_results and all(s.get("status") == "failed" for s in stream_results):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
