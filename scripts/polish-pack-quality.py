#!/usr/bin/env python3
"""Polish qualitative depth on existing ready packs (no rebuild).

Focus: ISI citation resolve → school précis (ISI-first) → highlight buckets.
Default targets are packs with the weakest independent précis.

Usage:
  python3 scripts/polish-pack-quality.py
  python3 scripts/polish-pack-quality.py --only Surrey --isi-resolve-cap 80 --precis-limit 60
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import la_slug  # noqa: E402

# Wave-5 targets (next headroom after wave 4). Kent still has ISI gaps — prefer capped runs.
# BCP/Southampton/Wokingham/Brighton residuals are mostly interim-only or no full report PDF.
DEFAULT_TARGETS = [
    "East Sussex",
    "Milton Keynes",
    "Oxfordshire",
    "Reading",
    "Kent",
]

MANIFEST = ROOT / "public" / "data" / "packs" / "manifest.json"


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"packs": {}}


def polish_la(
    la: str,
    *,
    isi_cap: int,
    precis_limit: int,
    upgrade_highlights: bool,
    skip_isi: bool,
    skip_precis: bool,
) -> None:
    slug = la_slug(la)
    index = f"public/data/packs/{slug}/schools-index.json"
    if not (ROOT / index).exists():
        raise SystemExit(f"Missing {index}")

    print(f"\n=== Polish {la} ({slug}) ===", flush=True)

    if not skip_isi:
        run(
            [
                "python3",
                "scripts/enrich-independents.py",
                "--isi-only",
                "--la",
                la,
                "--index",
                index,
                "--isi-resolve-cap",
                str(isi_cap),
            ]
        )

    if not skip_precis:
        cmd = [
            "python3",
            "scripts/enrich-inspection-precis.py",
            "--la",
            la,
            "--index",
            index,
            "--limit",
            str(precis_limit),
            "--sleep",
            "0.08",
        ]
        if upgrade_highlights:
            cmd.append("--upgrade-highlights")
        run(cmd)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        help="LA name to polish (repeatable). Default: weakest independent packs.",
    )
    parser.add_argument("--isi-resolve-cap", type=int, default=50)
    parser.add_argument("--precis-limit", type=int, default=40)
    parser.add_argument(
        "--upgrade-highlights",
        action="store_true",
        help="Also re-fetch rows missing strength/improvement buckets",
    )
    parser.add_argument("--skip-isi", action="store_true")
    parser.add_argument("--skip-precis", action="store_true")
    parser.add_argument("--continue-on-error", action="store_true", default=True)
    args = parser.parse_args()

    targets = args.only or DEFAULT_TARGETS
    manifest = load_manifest()
    packs = manifest.get("packs") or {}

    for la in targets:
        slug = la_slug(la)
        entry = packs.get(slug) or {}
        if entry.get("status") != "ready":
            print(f"SKIP {la}: pack not ready ({entry.get('status')})", flush=True)
            continue
        try:
            polish_la(
                la,
                isi_cap=args.isi_resolve_cap,
                precis_limit=args.precis_limit,
                upgrade_highlights=args.upgrade_highlights,
                skip_isi=args.skip_isi,
                skip_precis=args.skip_precis,
            )
        except subprocess.CalledProcessError as exc:
            print(f"FAIL {la}: {exc}", flush=True)
            if not args.continue_on_error:
                return 1

    print("\n=== Quality report ===", flush=True)
    run(["python3", "scripts/report-pack-quality.py"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
