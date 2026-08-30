#!/usr/bin/env python3
"""Dedicated qualitative *quality* loop (separate from coverage ingest).

Programme: analyse suspects → apply current heuristics + learned phrases to the
sidecar → merge into schools-index → write digest.

Full corpus re-apply is triggered when the learned-QA library changed
significantly since the last apply (active phrase set / eventCount), or when
``--force`` / the periodic max-age ceiling is hit. Minor days skip apply and
only write an analyse digest — coverage expansion stays in
run-qualitative-loop.py / qualitative-loop.yml.

Usage:
  python3 scripts/run-qualitative-quality-loop.py
  python3 scripts/run-qualitative-quality-loop.py --limit 250 --min-score 1.5
  python3 scripts/run-qualitative-quality-loop.py --force
  python3 scripts/run-qualitative-quality-loop.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tools" / "school-capture"
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(CAPTURE_ROOT))
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from school_capture.learned_qa_patterns import (  # noqa: E402
    learning_change_is_significant,
    learning_library_fingerprint,
    rebalance_learned_qa_patterns,
)
from school_capture.qa_heuristics import rank_suspects  # noqa: E402
from school_capture.sidecar import load_capture_index  # noqa: E402
from seed_scope import PACKS_ROOT_REL  # noqa: E402

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
DEFAULT_CAPTURE = ROOT / "output" / "qualitative-capture.json"
DEFAULT_LEARNED = ROOT / "output" / "learned-qa-patterns.json"
APPLY_STATE = ROOT / "output" / "learned-qa-apply-state.json"
QA_DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-qa-latest.json"
DIGEST_JSON = ROOT / "public" / "data" / "packs" / "qualitative-quality-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "qualitative-quality-loop-latest.md"
PACKS_ROOT = ROOT / PACKS_ROOT_REL
MANIFEST = PACKS_ROOT / "manifest.json"

# Full apply when learning moved enough, or when last full apply is this old.
DEFAULT_MIN_EVENT_DELTA = 15
DEFAULT_MIN_PHRASE_DELTA = 5
DEFAULT_MAX_APPLY_AGE_DAYS = 7


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def analyse_corpus(*, min_score: float) -> dict:
    """Cheap before/after analysis over the whole sidecar."""
    index = load_capture_index(DEFAULT_CAPTURE)
    records = list(index.records) if index else []
    suspects = rank_suspects(records, limit=10_000, min_score=min_score)
    by_flag: dict[str, int] = {}
    for s in suspects:
        for f in s.flags:
            by_flag[f] = by_flag.get(f, 0) + 1
    return {
        "recordCount": len(records),
        "suspectCount": len(suspects),
        "flagCounts": dict(sorted(by_flag.items(), key=lambda kv: (-kv[1], kv[0]))),
        "topSuspects": [
            {"urn": s.urn, "name": s.name, "score": round(s.score, 2), "flags": s.flags}
            for s in suspects[:12]
        ],
    }


def load_apply_state(path: Path = APPLY_STATE) -> dict:
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def save_apply_state(payload: dict, path: Path = APPLY_STATE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def days_since(iso_ts: str | None) -> float | None:
    if not iso_ts:
        return None
    try:
        raw = str(iso_ts).replace("Z", "+00:00")
        then = datetime.fromisoformat(raw)
        if then.tzinfo is None:
            then = then.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - then).total_seconds() / 86400.0
    except ValueError:
        return None


def should_run_full_apply(
    *,
    fingerprint: dict,
    state: dict,
    force: bool,
    min_event_delta: int,
    min_phrase_delta: int,
    max_age_days: int,
) -> tuple[bool, str]:
    if force:
        return True, "forced (--force)"
    significant, reason = learning_change_is_significant(
        state.get("fingerprint") if state else None,
        fingerprint,
        min_event_delta=min_event_delta,
        min_phrase_delta=min_phrase_delta,
    )
    if significant:
        return True, reason
    age = days_since(state.get("appliedAt") if state else None)
    if age is None:
        return True, "no prior apply timestamp"
    if max_age_days > 0 and age >= max_age_days:
        return True, f"periodic ceiling: last full apply {age:.1f}d ago (>= {max_age_days}d)"
    return False, reason


def indexes_to_merge() -> list[Path]:
    """Seed index + every ready pack index (qual shards are global by URN)."""
    paths: list[Path] = [DEFAULT_INDEX]
    if not MANIFEST.is_file():
        return paths
    try:
        packs = json.loads(MANIFEST.read_text(encoding="utf-8")).get("packs") or {}
    except (OSError, json.JSONDecodeError):
        return paths
    for slug, meta in packs.items():
        if not isinstance(meta, dict) or meta.get("status") != "ready":
            continue
        path = PACKS_ROOT / str(slug) / "schools-index.json"
        if path.is_file():
            paths.append(path)
    # Stable unique order; seed first.
    seen: set[Path] = set()
    out: list[Path] = []
    for path in paths:
        resolved = path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        out.append(path)
    return out


def write_digest(payload: dict) -> None:
    DIGEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    DIGEST_JSON.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    before = payload.get("before") or {}
    after = payload.get("after") or {}
    qa = payload.get("qa") or {}
    trigger = payload.get("trigger") or {}
    lines = [
        f"# Qualitative quality loop — {payload.get('ranAt')}",
        "",
        f"- Mode: `{'dry-run' if payload.get('dryRun') else payload.get('mode', 'apply')}`",
        f"- Provider: `{payload.get('provider')}`",
        f"- Limit / min-score: `{payload.get('limit')}` / `{payload.get('minScore')}`",
        f"- Records: `{before.get('recordCount', 0)}`",
        f"- Suspects before → after: `{before.get('suspectCount', 0)}` → "
        f"`{after.get('suspectCount', 0)}`",
        f"- QA reviewed / changed: `{qa.get('reviewed', 0)}` / "
        f"`{qa.get('changedSchools', 0)}`",
        f"- Findings applied: `{qa.get('findingsApplied', 0)}`",
        f"- Learned phrases added: `{qa.get('learningAdded', 0)}`",
        f"- Merged to index: `{payload.get('merged')}`",
        f"- Apply trigger: `{trigger.get('reason', 'n/a')}`",
        "",
        "## Top flag counts (before)",
        "",
    ]
    for flag, count in (before.get("flagCounts") or {}).items():
        lines.append(f"- `{flag}`: {count}")
    if not before.get("flagCounts"):
        lines.append("- (none)")
    notes = payload.get("notes") or []
    if notes:
        lines.extend(["", "## Notes", ""])
        for note in notes:
            lines.append(f"- {note}")
    lines.append("")
    DIGEST_MD.write_text("\n".join(lines), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Apply qualitative quality rules across the full sidecar"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=250,
        help="Max suspect schools to review when apply runs (default 250; "
        "raised to cover all suspects on learning-triggered full apply)",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=1.5,
        help="Minimum suspicion score (default 1.5)",
    )
    parser.add_argument(
        "--provider",
        choices=("none", "auto", "cursor", "openai"),
        default="none",
        help="QA reviewer (default none = free heuristics)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Always run full apply even when the learning library is unchanged",
    )
    parser.add_argument(
        "--min-event-delta",
        type=int,
        default=DEFAULT_MIN_EVENT_DELTA,
        help=f"eventCount growth that counts as significant (default {DEFAULT_MIN_EVENT_DELTA})",
    )
    parser.add_argument(
        "--min-phrase-delta",
        type=int,
        default=DEFAULT_MIN_PHRASE_DELTA,
        help=(
            "Active phraseCount change (with hash change) that counts as "
            f"significant (default {DEFAULT_MIN_PHRASE_DELTA})"
        ),
    )
    parser.add_argument(
        "--max-apply-age-days",
        type=int,
        default=DEFAULT_MAX_APPLY_AGE_DAYS,
        help=(
            "Force a full apply when the last one is this many days old "
            f"(0 = disable; default {DEFAULT_MAX_APPLY_AGE_DAYS})"
        ),
    )
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Update sidecar only; do not merge into schools-index",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    notes: list[str] = []
    if DEFAULT_LEARNED.is_file() and not args.dry_run:
        try:
            balanced = rebalance_learned_qa_patterns(DEFAULT_LEARNED)
            notes.append(
                "Rebalanced learned QA phrases: "
                f"active={balanced.get('phraseCount', 0)} "
                f"candidates={balanced.get('candidateCount', 0)}."
            )
        except Exception as exc:  # noqa: BLE001 — never block quality apply
            notes.append(f"Learned QA rebalance skipped: {exc}")

    fingerprint = (
        learning_library_fingerprint(DEFAULT_LEARNED)
        if DEFAULT_LEARNED.is_file()
        else {
            "phraseHash": "",
            "phraseCount": 0,
            "candidateCount": 0,
            "eventCount": 0,
            "updatedAt": None,
        }
    )
    state = load_apply_state()
    should_apply, trigger_reason = should_run_full_apply(
        fingerprint=fingerprint,
        state=state,
        force=bool(args.force),
        min_event_delta=args.min_event_delta,
        min_phrase_delta=args.min_phrase_delta,
        max_age_days=args.max_apply_age_days,
    )
    notes.append(f"Learning fingerprint: {fingerprint}")
    notes.append(f"Apply decision: {trigger_reason}")

    before = analyse_corpus(min_score=args.min_score)
    notes.append(
        f"Before: {before['suspectCount']} suspects across "
        f"{before['recordCount']} records."
    )

    if args.dry_run:
        payload = {
            "ranAt": datetime.now(timezone.utc).isoformat(),
            "dryRun": True,
            "mode": "dry-run",
            "limit": args.limit,
            "minScore": args.min_score,
            "provider": args.provider,
            "before": before,
            "after": before,
            "qa": {
                "reviewed": 0,
                "changedSchools": 0,
                "findingsApplied": 0,
                "learningAdded": 0,
            },
            "merged": False,
            "trigger": {
                "shouldApply": should_apply,
                "reason": trigger_reason,
                "fingerprint": fingerprint,
            },
            "notes": notes + ["Dry run — no sidecar mutations."],
        }
        write_digest(payload)
        print(json.dumps(payload, indent=2))
        return 0

    if not should_apply:
        payload = {
            "ranAt": datetime.now(timezone.utc).isoformat(),
            "dryRun": False,
            "mode": "skip",
            "limit": args.limit,
            "minScore": args.min_score,
            "provider": args.provider,
            "before": before,
            "after": before,
            "qa": {
                "reviewed": 0,
                "changedSchools": 0,
                "findingsApplied": 0,
                "learningAdded": 0,
            },
            "merged": False,
            "trigger": {
                "shouldApply": False,
                "reason": trigger_reason,
                "fingerprint": fingerprint,
                "prior": state.get("fingerprint"),
                "priorAppliedAt": state.get("appliedAt"),
            },
            "notes": notes
            + [
                "Skipped full apply — learning library unchanged "
                "(and within periodic max age). Analyse-only digest."
            ],
        }
        write_digest(payload)
        print(json.dumps(payload, indent=2))
        return 0

    # Learning-triggered / forced / periodic: cover every ranked suspect.
    apply_limit = max(args.limit, int(before.get("suspectCount") or 0), 1)
    if apply_limit > args.limit:
        notes.append(
            f"Raised review limit {args.limit} → {apply_limit} "
            "to cover all suspects for full learning apply."
        )

    qa_cmd = [
        sys.executable,
        str(ROOT / "scripts" / "qa-qualitative.py"),
        "--capture",
        str(DEFAULT_CAPTURE),
        "--learned",
        str(DEFAULT_LEARNED),
        "--digest",
        str(QA_DIGEST_JSON),
        "--limit",
        str(apply_limit),
        "--min-score",
        str(args.min_score),
        "--provider",
        args.provider,
    ]
    run(qa_cmd)

    qa_stats = {
        "reviewed": 0,
        "changedSchools": 0,
        "findingsApplied": 0,
        "learningAdded": 0,
        "provider": args.provider,
    }
    if QA_DIGEST_JSON.is_file():
        try:
            qa_payload = json.loads(QA_DIGEST_JSON.read_text(encoding="utf-8"))
            qa_stats = {
                "reviewed": int(qa_payload.get("reviewed") or 0),
                "changedSchools": int(qa_payload.get("changedSchools") or 0),
                "findingsApplied": int(qa_payload.get("findingsApplied") or 0),
                "learningAdded": int(qa_payload.get("learningAdded") or 0),
                "provider": qa_payload.get("provider") or args.provider,
            }
            notes.extend(qa_payload.get("notes") or [])
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            notes.append("Could not parse qualitative-qa-latest.json after QA.")

    # Fingerprint may move if QA learned new phrases this run.
    fingerprint_after = (
        learning_library_fingerprint(DEFAULT_LEARNED)
        if DEFAULT_LEARNED.is_file()
        else fingerprint
    )

    merged = False
    merge_paths = indexes_to_merge()
    if not args.no_merge and int(qa_stats.get("changedSchools") or 0) > 0:
        for index_path in merge_paths:
            merge_cmd = [
                sys.executable,
                str(CAPTURE_ROOT / "scripts" / "merge-qualitative.py"),
                "--index",
                str(index_path),
                "--capture",
                str(DEFAULT_CAPTURE),
            ]
            run(merge_cmd)
        merged = True
        notes.append(
            f"Merged cleaned sidecar into {len(merge_paths)} schools-index file(s)."
        )
    elif int(qa_stats.get("changedSchools") or 0) == 0:
        notes.append("No schools changed — merge skipped.")
    else:
        notes.append("Merge skipped (--no-merge).")

    after = analyse_corpus(min_score=args.min_score)
    notes.append(
        f"After: {after['suspectCount']} suspects across {after['recordCount']} records."
    )

    save_apply_state(
        {
            "appliedAt": datetime.now(timezone.utc).isoformat(),
            "fingerprint": fingerprint_after,
            "triggerReason": trigger_reason,
            "reviewed": qa_stats.get("reviewed"),
            "changedSchools": qa_stats.get("changedSchools"),
            "findingsApplied": qa_stats.get("findingsApplied"),
        }
    )
    notes.append("Updated output/learned-qa-apply-state.json")

    payload = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "dryRun": False,
        "mode": "apply",
        "limit": apply_limit,
        "minScore": args.min_score,
        "provider": args.provider,
        "before": before,
        "after": after,
        "qa": qa_stats,
        "merged": merged,
        "trigger": {
            "shouldApply": True,
            "reason": trigger_reason,
            "fingerprintBefore": fingerprint,
            "fingerprintAfter": fingerprint_after,
        },
        "notes": notes,
    }
    write_digest(payload)
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
