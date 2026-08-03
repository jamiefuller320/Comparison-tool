#!/usr/bin/env python3
"""Automated pack quality loop: assess → polish weakest ready packs → digest.

Phase 1 continuous-improvement orchestrator. Selects ready region packs with
the weakest independent précis (and ISI headroom), runs capped ISI + précis
polish, then writes a before/after digest for ops.

Usage:
  python3 scripts/run-pack-quality-loop.py --dry-run
  python3 scripts/run-pack-quality-loop.py --max-packs 3 --isi-resolve-cap 50 --precis-limit 40
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import SEED_LOCAL_AUTHORITY, la_slug  # noqa: E402

DIGEST_JSON = ROOT / "public" / "data" / "packs" / "quality-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "quality-loop-latest.md"

# Skip polishing packs already at a high indie bar (leave budget for weaker LAs).
GOOD_ENOUGH_INDIE_PCT = 85.0
GOOD_ENOUGH_ISI_PCT = 85.0


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def collect_rows() -> list[dict]:
    out = subprocess.check_output(
        [sys.executable, str(SCRIPTS / "report-pack-quality.py"), "--json"],
        cwd=ROOT,
        text=True,
    )
    return json.loads(out)


def _isi_pct(row: dict) -> float:
    n = row.get("independentCount") or 0
    if not n:
        return 100.0
    return 100.0 * (row.get("independentWithIsiUrl") or 0) / n


def _isi_gap(row: dict) -> int:
    return max(
        0, (row.get("independentCount") or 0) - (row.get("independentWithIsiUrl") or 0)
    )


def _indie_missing(row: dict) -> int:
    indie = row.get("independentPrecis") or {}
    return max(0, (indie.get("n") or 0) - (indie.get("withPrecis") or 0))


def has_polish_headroom(row: dict) -> bool:
    """True when more ISI URLs or indie précis could plausibly be filled."""
    if (row.get("independentCount") or 0) <= 0:
        return False
    indie_pct = (row.get("independentPrecis") or {}).get("pct") or 0.0
    isi_pct = _isi_pct(row)
    if indie_pct >= GOOD_ENOUGH_INDIE_PCT and isi_pct >= GOOD_ENOUGH_ISI_PCT:
        return False
    return _isi_gap(row) > 0 or _indie_missing(row) > 0


def select_targets(rows: list[dict], *, max_packs: int) -> list[dict]:
    """Pick weakest ready packs (exclude Hampshire seed) with polish headroom."""
    seed_slug = la_slug(SEED_LOCAL_AUTHORITY)
    candidates = [
        r
        for r in rows
        if r.get("slug") != seed_slug
        and (r.get("independentCount") or 0) > 0
        and has_polish_headroom(r)
    ]
    candidates.sort(
        key=lambda r: (
            (r.get("independentPrecis") or {}).get("pct") or 0.0,
            -_isi_gap(r),
            r.get("precisPct") or 0.0,
            r.get("localAuthority") or "",
        )
    )
    return candidates[: max(0, max_packs)]


def snapshot_row(row: dict) -> dict:
    indie = row.get("independentPrecis") or {}
    return {
        "localAuthority": row.get("localAuthority"),
        "slug": row.get("slug"),
        "independentPrecisPct": indie.get("pct"),
        "independentPrecis": f"{indie.get('withPrecis', 0)}/{indie.get('n', 0)}",
        "isiUrls": f"{row.get('independentWithIsiUrl', 0)}/{row.get('independentCount', 0)}",
        "isiGap": _isi_gap(row),
        "schoolPrecisPct": row.get("precisPct"),
        "eyPct": (row.get("ey") or {}).get("pct"),
        "childminderPct": (row.get("childminders") or {}).get("pct"),
        "softLaunchPass": row.get("softLaunchPass"),
    }


def write_digest(payload: dict) -> None:
    DIGEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    DIGEST_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        f"# Pack quality loop — {payload.get('ranAt', '')}",
        "",
        f"- Mode: `{'dry-run' if payload.get('dryRun') else 'polish'}`",
        f"- Max packs: {payload.get('maxPacks')}",
        f"- ISI resolve cap: {payload.get('isiResolveCap')}",
        f"- Precis limit: {payload.get('precisLimit')}",
        f"- Upgrade highlights: {payload.get('upgradeHighlights')}",
        "",
        "## Targets",
        "",
    ]
    targets = payload.get("targets") or []
    if not targets:
        lines.append(
            "_No packs selected (all ready packs at good-enough indie/ISI bar)._"
        )
    else:
        lines.append(
            "| LA | Before indie% | After indie% | Before ISI | After ISI |"
        )
        lines.append("|---|---:|---:|---|---|")
        after_map = {
            a["slug"]: a for a in (payload.get("after") or []) if a.get("slug")
        }
        for t in targets:
            a = after_map.get(t["slug"]) or {}
            lines.append(
                f"| {t['localAuthority']} | {t.get('independentPrecisPct')} | "
                f"{a.get('independentPrecisPct', '—')} | {t.get('isiUrls')} | "
                f"{a.get('isiUrls', '—')} |"
            )
    lines.extend(["", "## Weakest packs (after)", ""])
    for w in payload.get("weakestAfter") or []:
        lines.append(
            f"- {w['localAuthority']}: indie {w.get('independentPrecis')} "
            f"({w.get('independentPrecisPct')}%) · ISI {w.get('isiUrls')}"
        )
    stuck = payload.get("stuck") or []
    if stuck:
        lines.extend(["", "## No indie/ISI movement", ""])
        for s in stuck:
            lines.append(f"- {s}")
    failures = payload.get("failures") or []
    if failures:
        lines.extend(["", "## Failures", ""])
        for s in failures:
            lines.append(f"- {s}")
    lines.append("")
    DIGEST_MD.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--max-packs",
        type=int,
        default=3,
        help="How many weakest ready packs to polish (default 3)",
    )
    parser.add_argument("--isi-resolve-cap", type=int, default=50)
    parser.add_argument("--precis-limit", type=int, default=40)
    parser.add_argument(
        "--upgrade-highlights",
        action="store_true",
        help="Also re-fetch rows missing strength/improvement buckets",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Assess and write digest only; do not polish",
    )
    parser.add_argument(
        "--skip-digest",
        action="store_true",
        help="Do not write quality-loop-latest.{json,md}",
    )
    args = parser.parse_args()

    started = time.time()
    before_rows = collect_rows()
    targets = select_targets(before_rows, max_packs=args.max_packs)
    before_snaps = [snapshot_row(r) for r in targets]

    print("Selected targets:", flush=True)
    if not before_snaps:
        print("  (none)", flush=True)
    for snap in before_snaps:
        print(
            f"  - {snap['localAuthority']}: indie {snap['independentPrecis']} "
            f"({snap['independentPrecisPct']}%) · ISI {snap['isiUrls']}",
            flush=True,
        )

    failures: list[str] = []
    if not args.dry_run and targets:
        cmd = [
            sys.executable,
            str(SCRIPTS / "polish-pack-quality.py"),
            "--isi-resolve-cap",
            str(args.isi_resolve_cap),
            "--precis-limit",
            str(args.precis_limit),
        ]
        for row in targets:
            cmd.extend(["--only", row["localAuthority"]])
        if args.upgrade_highlights:
            cmd.append("--upgrade-highlights")
        try:
            run(cmd)
        except subprocess.CalledProcessError as exc:
            print(f"FAIL polish batch: {exc}", flush=True)
            failures = [r["localAuthority"] for r in targets]

    after_rows = collect_rows() if not args.dry_run else before_rows
    after_by = {r["slug"]: r for r in after_rows if r.get("slug")}
    after_snaps = [
        snapshot_row(after_by[t["slug"]])
        for t in before_snaps
        if t["slug"] in after_by
    ]

    stuck: list[str] = []
    if not args.dry_run:
        before_by = {s["slug"]: s for s in before_snaps}
        for snap in after_snaps:
            prev = before_by.get(snap["slug"]) or {}
            if (
                prev.get("independentPrecisPct") == snap.get("independentPrecisPct")
                and prev.get("isiUrls") == snap.get("isiUrls")
            ):
                stuck.append(snap["localAuthority"])

    weakest_after = sorted(
        [
            snapshot_row(r)
            for r in after_rows
            if r.get("slug") != la_slug(SEED_LOCAL_AUTHORITY)
        ],
        key=lambda r: (
            r.get("independentPrecisPct") or 0.0,
            r.get("schoolPrecisPct") or 0.0,
        ),
    )[:5]

    payload = {
        "ranAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dryRun": bool(args.dry_run),
        "maxPacks": args.max_packs,
        "isiResolveCap": args.isi_resolve_cap,
        "precisLimit": args.precis_limit,
        "upgradeHighlights": bool(args.upgrade_highlights),
        "elapsedSeconds": round(time.time() - started, 1),
        "targets": before_snaps,
        "after": after_snaps,
        "stuck": stuck,
        "failures": failures,
        "weakestAfter": weakest_after,
    }

    if not args.skip_digest:
        write_digest(payload)
        print(f"Wrote {DIGEST_JSON.relative_to(ROOT)}", flush=True)
        print(f"Wrote {DIGEST_MD.relative_to(ROOT)}", flush=True)

    summary_env = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_env and DIGEST_MD.exists():
        Path(summary_env).write_text(
            DIGEST_MD.read_text(encoding="utf-8"), encoding="utf-8"
        )

    if args.dry_run:
        print("\n=== Quality report (dry-run baseline) ===", flush=True)
        run([sys.executable, str(SCRIPTS / "report-pack-quality.py")])

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
