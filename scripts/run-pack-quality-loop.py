#!/usr/bin/env python3
"""Automated pack quality loop: assess → polish thin landings → digest.

Continuous-improvement orchestrator. Spends the précis budget
(`--precis-limit`, per selected pack) on sitemap schools that still have no
inspection précis, worst open-school coverage first, and only then on
Wiltshire. A target with no précis or ISI movement for two consecutive runs
rotates behind packs that have not stalled. Interest scores are still recorded
on the digest; they do not change this order. The SEO school-page cap is not
touched.

With the defaults (`--max-packs` 6, `--precis-limit` 60) a run attempts up to
360 précis fetches.

Usage:
  python3 scripts/run-pack-quality-loop.py --dry-run
  python3 scripts/run-pack-quality-loop.py --max-packs 6 --isi-resolve-cap 80 --precis-limit 60
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

from pack_interest import (  # noqa: E402
    combine_interest_scores,
    interest_pct_boost,
)
from pack_quality_gsc import (  # noqa: E402
    annotate_pack_rows_for_gsc,
    load_gsc_precis_targeting,
    priority_urns_for_area,
)
from seed_scope import SEED_LOCAL_AUTHORITY, la_slug  # noqa: E402

DIGEST_JSON = ROOT / "public" / "data" / "packs" / "quality-loop-latest.json"
DIGEST_MD = ROOT / "public" / "data" / "packs" / "quality-loop-latest.md"

# Skip polishing packs already at a high indie bar (leave budget for weaker LAs).
GOOD_ENOUGH_INDIE_PCT = 85.0
GOOD_ENOUGH_ISI_PCT = 85.0

# Précis budget order: sitemap landings missing a précis, then this pack.
WILTSHIRE_SLUG = "wiltshire"
# Rotate a target after this many consecutive runs with no précis/ISI movement.
STALL_BEFORE_ROTATE = 2
SEO_COVERAGE_PATH = ROOT / "public" / "data" / "seo-coverage.json"


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


def open_precis_stats(schools: list[dict]) -> dict:
    """Open-school précis coverage. Closed rows are not sitemap landings."""
    open_rows = [s for s in schools if not s.get("closed")]
    n = len(open_rows)
    with_p = sum(
        1 for s in open_rows if str(s.get("inspectionPrecis") or "").strip()
    )
    missing = n - with_p
    return {
        "openSchoolCount": n,
        "openWithPrecis": with_p,
        "openMissingPrecis": missing,
        "openPrecisPct": round(100.0 * with_p / n, 1) if n else 0.0,
    }


def pack_index_path(slug: str) -> Path:
    return ROOT / "public" / "data" / "packs" / slug / "schools-index.json"


def precis_stats_for_slug(slug: str) -> dict:
    path = pack_index_path(slug)
    if not path.exists():
        return open_precis_stats([])
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return open_precis_stats([])
    return open_precis_stats(payload.get("schools") or [])


def load_sitemap_slugs(path: Path | None = None) -> set[str]:
    """Area slugs currently published as school landings. Does not read the cap."""
    path = path or SEO_COVERAGE_PATH
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return {str(slug) for slug in (data.get("includedAreaSlugs") or []) if slug}


def annotate_precis_rows(
    rows: list[dict],
    *,
    sitemap_slugs: set[str],
    stats_by_slug: dict[str, dict],
) -> list[dict]:
    seed = la_slug(SEED_LOCAL_AUTHORITY)
    annotated: list[dict] = []
    for row in rows:
        slug = str(row.get("slug") or "")
        merged = dict(row)
        stats = stats_by_slug.get(slug)
        if stats:
            merged.update(stats)
        merged["sitemapPrecis"] = bool(slug and slug in sitemap_slugs and slug != seed)
        annotated.append(merged)
    return annotated


def precis_priority_tier(row: dict) -> int | None:
    """0 = sitemap school missing a précis, 1 = Wiltshire, None = not a target."""
    if int(row.get("openMissingPrecis") or 0) <= 0:
        return None
    if row.get("sitemapPrecis"):
        return 0
    if str(row.get("slug") or "") == WILTSHIRE_SLUG:
        return 1
    return None


def select_precis_targets(
    rows: list[dict],
    *,
    max_packs: int,
    stall_runs: dict[str, int] | None = None,
    gsc_active: bool = False,
) -> list[dict]:
    """Précis budget: GSC pos 4–20 gaps, worst sitemap gaps, then Wiltshire.

    Hampshire (the seed) is excluded. Packs outside the sitemap are excluded
    except Wiltshire. When Search Console data is active, sitemap packs with
    school landings in positions 4–20 without a précis sort ahead of the
    open-% ordering. A pack with no movement for STALL_BEFORE_ROTATE
    consecutive runs sorts behind packs that have not stalled; stalled packs
    then rotate among themselves by stall count.
    """
    seed = la_slug(SEED_LOCAL_AUTHORITY)
    stalls = stall_runs or {}
    candidates = [
        row
        for row in rows
        if row.get("slug") != seed and precis_priority_tier(row) is not None
    ]

    def sort_key(row: dict) -> tuple:
        slug = str(row.get("slug") or "")
        stall = int(stalls.get(slug) or 0)
        rotated = stall >= STALL_BEFORE_ROTATE
        tier = precis_priority_tier(row)
        gsc_count = int(row.get("gscPrecisOpportunity") or 0)
        gsc_impr = int(row.get("gscPrecisImpressions") or 0)
        gsc_boost = (
            gsc_active
            and tier == 0
            and gsc_count > 0
        )
        return (
            1 if rotated else 0,
            stall if rotated else 0,
            0 if gsc_boost else 1,
            -gsc_impr if gsc_boost else 0,
            -gsc_count if gsc_boost else 0,
            9 if tier is None else tier,
            float(row.get("openPrecisPct") or 0.0),
            -int(row.get("openMissingPrecis") or 0),
            row.get("localAuthority") or "",
        )

    candidates.sort(key=sort_key)
    return candidates[: max(0, max_packs)]


def select_targets(
    rows: list[dict],
    *,
    max_packs: int,
    interest_by_slug: dict[str, float] | None = None,
    stall_runs: dict[str, int] | None = None,
    gsc_active: bool = False,
) -> list[dict]:
    """Select précis targets. Interest is accepted and does not change order."""
    del interest_by_slug
    return select_precis_targets(
        rows,
        max_packs=max_packs,
        stall_runs=stall_runs,
        gsc_active=gsc_active,
    )


def load_stall_runs(path: Path | None = None) -> dict[str, int]:
    path = path or DIGEST_JSON
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    raw = data.get("stallRuns") or {}
    if not isinstance(raw, dict):
        return {}
    out: dict[str, int] = {}
    for key, value in raw.items():
        try:
            n = int(value)
        except (TypeError, ValueError):
            continue
        if n > 0:
            out[str(key)] = n
    return out


def update_stall_runs(
    previous: dict[str, int] | None,
    *,
    targeted_slugs: list[str],
    stuck_slugs: list[str],
) -> dict[str, int]:
    """Increment a targeted pack that did not move; clear one that did.

    Packs that were not targeted keep their count, so a rotated pack stays
    at the back until it is tried again and actually moves.
    """
    updated: dict[str, int] = {}
    for slug, n in (previous or {}).items():
        try:
            count = int(n)
        except (TypeError, ValueError):
            continue
        if count > 0:
            updated[str(slug)] = count
    stuck = set(stuck_slugs)
    for slug in targeted_slugs:
        if slug in stuck:
            updated[slug] = updated.get(slug, 0) + 1
        else:
            updated.pop(slug, None)
    return updated


def precis_metrics_unchanged(before: dict, after: dict) -> bool:
    """True when this run added neither school précis nor ISI coverage."""
    return (
        before.get("openMissingPrecis") == after.get("openMissingPrecis")
        and before.get("isiUrls") == after.get("isiUrls")
        and before.get("independentPrecis") == after.get("independentPrecis")
    )


def snapshot_row(
    row: dict, *, interest_by_slug: dict[str, float] | None = None
) -> dict:
    indie = row.get("independentPrecis") or {}
    slug = row.get("slug")
    interest = (interest_by_slug or {}).get(str(slug) if slug else "", 0.0)
    snap = {
        "localAuthority": row.get("localAuthority"),
        "slug": slug,
        "independentPrecisPct": indie.get("pct"),
        "independentPrecis": f"{indie.get('withPrecis', 0)}/{indie.get('n', 0)}",
        "isiUrls": f"{row.get('independentWithIsiUrl', 0)}/{row.get('independentCount', 0)}",
        "isiGap": _isi_gap(row),
        "schoolPrecisPct": row.get("precisPct"),
        "eyPct": (row.get("ey") or {}).get("pct"),
        "childminderPct": (row.get("childminders") or {}).get("pct"),
        "softLaunchPass": row.get("softLaunchPass"),
    }
    if interest_by_slug is not None:
        snap["interestScore"] = round(interest, 3)
        snap["interestBoostPct"] = round(interest_pct_boost(interest), 1)
    if row.get("openMissingPrecis") is not None:
        snap["openMissingPrecis"] = row.get("openMissingPrecis")
        snap["openPrecisPct"] = row.get("openPrecisPct")
        snap["openPrecis"] = (
            f"{row.get('openWithPrecis', 0)}/{row.get('openSchoolCount', 0)}"
        )
    tier = precis_priority_tier(row)
    if tier is not None:
        snap["precisTier"] = tier
    if row.get("gscPrecisOpportunity") is not None:
        snap["gscPrecisOpportunity"] = row.get("gscPrecisOpportunity")
        snap["gscPrecisImpressions"] = row.get("gscPrecisImpressions")
    return snap


def write_digest(payload: dict) -> None:
    DIGEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    DIGEST_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        f"# Pack quality loop — {payload.get('ranAt', '')}",
        "",
        f"- Mode: `{'dry-run' if payload.get('dryRun') else 'polish'}`",
        f"- Max packs: {payload.get('maxPacks')}",
        f"- ISI resolve cap: {payload.get('isiResolveCap')}",
        f"- Precis limit: {payload.get('precisLimit')} per pack",
        "- Precis order: "
        + (
            "GSC positions 4–20 without a précis (sitemap packs), then "
            if payload.get("gscPrecisTargeting")
            else ""
        )
        + "sitemap schools missing a précis (lowest open % first), then Wiltshire",
        f"- Rotate after {payload.get('stallBeforeRotate', STALL_BEFORE_ROTATE)} runs with no movement",
        f"- Upgrade highlights: {payload.get('upgradeHighlights')}",
        "- Interest scores: "
        + (
            "recorded on this digest (they do not change target order)"
            if payload.get("interestWeighting")
            else "off"
        ),
        "",
        "## Targets",
        "",
    ]
    targets = payload.get("targets") or []
    if not targets:
        lines.append(
            "_No packs selected (no sitemap schools missing a précis, and Wiltshire has none missing)._"
        )
    else:
        lines.append(
            "| LA | Tier | Missing | Stall | Before indie% | After indie% | Before ISI | After ISI |"
        )
        lines.append("|---|---|---:|---:|---:|---:|---|---|")
        after_map = {
            a["slug"]: a for a in (payload.get("after") or []) if a.get("slug")
        }
        tier_label = {0: "sitemap", 1: "wiltshire"}
        for t in targets:
            a = after_map.get(t["slug"]) or {}
            lines.append(
                f"| {t['localAuthority']} | "
                f"{tier_label.get(t.get('precisTier'), '—')} | "
                f"{t.get('openMissingPrecis', '—')} | {t.get('stallRuns', 0)} | "
                f"{t.get('independentPrecisPct')} | "
                f"{a.get('independentPrecisPct', '—')} | {t.get('isiUrls')} | "
                f"{a.get('isiUrls', '—')} |"
            )
    top_interest = payload.get("topInterest") or []
    if top_interest:
        lines.extend(["", "## Top interest signals", ""])
        for item in top_interest:
            lines.append(
                f"- `{item.get('slug')}`: score {item.get('score')} "
                f"(boost {item.get('boostPct')}%)"
            )
    lines.extend(["", "## Weakest packs (after)", ""])
    for w in payload.get("weakestAfter") or []:
        lines.append(
            f"- {w['localAuthority']}: indie {w.get('independentPrecis')} "
            f"({w.get('independentPrecisPct')}%) · ISI {w.get('isiUrls')}"
        )
    stuck = payload.get("stuck") or []
    if stuck:
        lines.extend(["", "## No précis/ISI movement", ""])
        for s in stuck:
            lines.append(f"- {s}")
    rotated = payload.get("rotated") or []
    if rotated:
        lines.extend(
            ["", "## Rotated (no movement for 2 runs)", ""]
        )
        for name in rotated:
            lines.append(f"- {name}")
    stall = payload.get("stallRuns") or {}
    if stall:
        lines.extend(["", "## Consecutive runs with no movement", ""])
        for slug, count in sorted(stall.items(), key=lambda kv: (-kv[1], kv[0])):
            lines.append(f"- `{slug}`: {count}")
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
        default=6,
        help="How many précis-gap packs to polish (default 6)",
    )
    parser.add_argument("--isi-resolve-cap", type=int, default=80)
    parser.add_argument("--precis-limit", type=int, default=60)
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
    parser.add_argument(
        "--no-interest",
        action="store_true",
        help="Do not score parent interest (it is digest-only and does not change target order)",
    )
    parser.add_argument(
        "--feedback-repo",
        help="Optional intake repo for product-feedback issues (gh)",
    )
    args = parser.parse_args()

    started = time.time()
    before_rows = collect_rows()
    interest_by_slug: dict[str, float] = {}
    if not args.no_interest:
        interest_by_slug = combine_interest_scores(
            feedback_repo=args.feedback_repo
            or os.environ.get("CHALLENGE_INTAKE_REPO")
        )
    seed_slug = la_slug(SEED_LOCAL_AUTHORITY)
    sitemap_slugs = load_sitemap_slugs()
    stats_by_slug = {
        str(row.get("slug")): precis_stats_for_slug(str(row.get("slug")))
        for row in before_rows
        if row.get("slug") and row.get("slug") != seed_slug
    }
    before_rows = annotate_precis_rows(
        before_rows,
        sitemap_slugs=sitemap_slugs,
        stats_by_slug=stats_by_slug,
    )
    gsc_targeting = load_gsc_precis_targeting()
    before_rows = annotate_pack_rows_for_gsc(before_rows, gsc_targeting)
    stall_before = load_stall_runs()
    targets = select_precis_targets(
        before_rows,
        max_packs=args.max_packs,
        stall_runs=stall_before,
        gsc_active=gsc_targeting.active,
    )
    before_snaps = [
        snapshot_row(r, interest_by_slug=interest_by_slug) for r in targets
    ]

    print("Selected targets:", flush=True)
    if not before_snaps:
        print("  (none)", flush=True)
    for snap in before_snaps:
        interest_bit = ""
        if snap.get("interestScore"):
            interest_bit = (
                f" · interest {snap['interestScore']} "
                f"(boost {snap.get('interestBoostPct')}%)"
            )
        print(
            f"  - {snap['localAuthority']}: open précis {snap.get('openPrecis')} "
            f"({snap.get('openPrecisPct')}%, missing {snap.get('openMissingPrecis')}) "
            f"· indie {snap['independentPrecis']} "
            f"({snap['independentPrecisPct']}%) · ISI {snap['isiUrls']}"
            f"{interest_bit}",
            flush=True,
        )

    failures: list[str] = []
    gsc_priority_json = ""
    if gsc_targeting.active:
        by_slug = {
            str(row.get("slug") or ""): priority_urns_for_area(
                gsc_targeting, str(row.get("slug") or "")
            )
            for row in targets
        }
        gsc_priority_json = json.dumps(by_slug)
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
        if gsc_priority_json:
            cmd.extend(["--gsc-priority-by-slug", gsc_priority_json])
        try:
            run(cmd)
        except subprocess.CalledProcessError as exc:
            print(f"FAIL polish batch: {exc}", flush=True)
            failures = [r["localAuthority"] for r in targets]

    after_rows = collect_rows() if not args.dry_run else before_rows
    if not args.dry_run:
        after_stats = {
            str(row.get("slug")): precis_stats_for_slug(str(row.get("slug")))
            for row in after_rows
            if row.get("slug") and row.get("slug") != seed_slug
        }
        after_rows = annotate_precis_rows(
            after_rows,
            sitemap_slugs=sitemap_slugs,
            stats_by_slug=after_stats,
        )
        after_rows = annotate_pack_rows_for_gsc(after_rows, gsc_targeting)
    after_by = {r["slug"]: r for r in after_rows if r.get("slug")}
    after_snaps = [
        snapshot_row(after_by[t["slug"]], interest_by_slug=interest_by_slug)
        for t in before_snaps
        if t["slug"] in after_by
    ]

    stuck: list[str] = []
    stuck_slugs: list[str] = []
    if not args.dry_run and not failures:
        before_by = {s["slug"]: s for s in before_snaps}
        for snap in after_snaps:
            prev = before_by.get(snap["slug"]) or {}
            if precis_metrics_unchanged(prev, snap):
                stuck.append(snap["localAuthority"])
                if snap.get("slug"):
                    stuck_slugs.append(snap["slug"])
    if args.dry_run or failures:
        stall_runs = stall_before
    else:
        stall_runs = update_stall_runs(
            stall_before,
            targeted_slugs=[s["slug"] for s in before_snaps if s.get("slug")],
            stuck_slugs=stuck_slugs,
        )
    for snap in before_snaps:
        slug = snap.get("slug")
        if slug:
            snap["stallRuns"] = int(stall_runs.get(slug) or 0)

    selected_slugs = {r.get("slug") for r in targets}
    rotated = [
        r.get("localAuthority")
        for r in select_precis_targets(
            before_rows,
            max_packs=args.max_packs,
            stall_runs={},
            gsc_active=gsc_targeting.active,
        )
        if r.get("slug") not in selected_slugs
    ]

    weakest_after = sorted(
        [
            snapshot_row(r, interest_by_slug=interest_by_slug)
            for r in after_rows
            if r.get("slug") != la_slug(SEED_LOCAL_AUTHORITY)
        ],
        key=lambda r: (
            r.get("independentPrecisPct") or 0.0,
            r.get("schoolPrecisPct") or 0.0,
        ),
    )[:5]

    top_interest = [
        {
            "slug": slug,
            "score": score,
            "boostPct": round(interest_pct_boost(score), 1),
        }
        for slug, score in sorted(
            interest_by_slug.items(), key=lambda kv: (-kv[1], kv[0])
        )[:8]
    ]

    payload = {
        "ranAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dryRun": bool(args.dry_run),
        "maxPacks": args.max_packs,
        "isiResolveCap": args.isi_resolve_cap,
        "precisLimit": args.precis_limit,
        "precisTargeting": (
            "gsc-4-20-missing-then-sitemap-then-wiltshire"
            if gsc_targeting.active
            else "sitemap-missing-then-wiltshire"
        ),
        "gscPrecisTargeting": gsc_targeting.active,
        "gscPrecisOpportunitySchools": gsc_targeting.school_count,
        "stallBeforeRotate": STALL_BEFORE_ROTATE,
        "upgradeHighlights": bool(args.upgrade_highlights),
        "interestWeighting": not args.no_interest,
        "elapsedSeconds": round(time.time() - started, 1),
        "interestBySlug": interest_by_slug,
        "topInterest": top_interest,
        "targets": before_snaps,
        "after": after_snaps,
        "stuck": stuck,
        "stallRuns": stall_runs,
        "rotated": rotated,
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
