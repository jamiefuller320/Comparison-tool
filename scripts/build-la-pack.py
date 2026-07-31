#!/usr/bin/env python3
"""Build an on-demand local-authority pack under public/data/packs/{slug}/.

Does not overwrite the Hampshire maintained root index. Depth slice:
schools harvest (early EES LA filter) + geocode + GIAS + KS4/KS5 + phonics,
then EY school Ofsted enrich + day-care providers + consented childminders.

Usage:
  python3 scripts/build-la-pack.py --la Surrey
  python3 scripts/build-la-pack.py --la "Brighton and Hove" --sample 20
  python3 scripts/build-la-pack.py --la Surrey --skip-depth
  python3 scripts/build-la-pack.py --la Surrey --skip-ey
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import (  # noqa: E402
    SEED_LOCAL_AUTHORITY,
    is_local_authority,
    la_slug,
    normalize_la_name,
    pack_rel_dir,
)

MANIFEST = ROOT / "public" / "data" / "packs" / "manifest.json"


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {
        "generatedAt": time.strftime("%Y-%m-%d"),
        "seedLocalAuthority": SEED_LOCAL_AUTHORITY,
        "packs": {},
    }


def save_manifest(payload: dict) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    payload["generatedAt"] = time.strftime("%Y-%m-%d")
    payload["seedLocalAuthority"] = SEED_LOCAL_AUTHORITY
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--la", required=True, help="DfE local authority label")
    parser.add_argument(
        "--sample",
        type=int,
        default=0,
        help="Optional smoke sample size for the LA harvest",
    )
    parser.add_argument(
        "--skip-geocode",
        action="store_true",
        help="Skip postcodes.io enrichment (offline tests)",
    )
    parser.add_argument(
        "--skip-depth",
        action="store_true",
        help="Skip GIAS / KS4 / phonics depth (harvest + geocode only)",
    )
    parser.add_argument(
        "--skip-ey",
        action="store_true",
        help="Skip EY providers / childminders / school Ofsted EY enrich",
    )
    args = parser.parse_args()

    la = normalize_la_name(args.la)
    if not la:
        raise SystemExit("--la is required")
    if is_local_authority(la, SEED_LOCAL_AUTHORITY):
        raise SystemExit(
            f"{SEED_LOCAL_AUTHORITY} is the maintained root set — "
            "use npm run harvest:hampshire instead of an on-demand pack."
        )

    slug = la_slug(la)
    out_rel = pack_rel_dir(la)
    out_dir = ROOT / out_rel
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest()
    packs = manifest.setdefault("packs", {})
    packs[slug] = {
        "localAuthority": la,
        "slug": slug,
        "status": "building",
        "requestedAt": packs.get(slug, {}).get("requestedAt")
        or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "note": (
            "Schools pack with GIAS + KS4/KS5 + phonics"
            + (" + EY/childminders" if not args.skip_ey else "")
            + " depth"
            + (" (schools depth skipped)." if args.skip_depth else ".")
            if not args.skip_depth or not args.skip_ey
            else "Schools index pack (depth skipped)."
        ),
        "paths": {
            "schoolsIndex": f"/data/packs/{slug}/schools-index.json",
            "directory": f"/data/packs/{slug}/schools-directory.json",
        },
    }
    save_manifest(manifest)

    try:
        harvest_cmd = [
            "python3",
            "scripts/harvest-schools.py",
            "--la",
            la,
            "--out-dir",
            out_rel,
        ]
        if args.sample and args.sample > 0:
            harvest_cmd.extend(["--sample", str(args.sample)])
        run(harvest_cmd)

        index_rel = f"{out_rel}/schools-index.json"
        if not args.skip_geocode:
            run(["python3", "scripts/enrich-geocode.py", "--index", index_rel])

        if not args.skip_depth:
            run(
                [
                    "python3",
                    "scripts/enrich-secondaries.py",
                    "--la",
                    la,
                    "--index",
                    index_rel,
                ]
            )
            run(
                [
                    "python3",
                    "scripts/enrich-independents.py",
                    "--la",
                    la,
                    "--index",
                    index_rel,
                    # Pack builds must not hang on isi.net HTML; search URLs remain.
                    "--skip-isi-html",
                ]
            )
            run(
                [
                    "python3",
                    "scripts/enrich-phonics.py",
                    "--la",
                    la,
                    "--index",
                    index_rel,
                ]
            )

        if not args.skip_ey:
            run(
                [
                    "python3",
                    "scripts/enrich-ey-schools.py",
                    "--la",
                    la,
                    "--index",
                    index_rel,
                ]
            )
            run(
                [
                    "python3",
                    "scripts/harvest-ey-providers.py",
                    "--la",
                    la,
                    "--out-dir",
                    out_rel,
                ]
            )
            run(
                [
                    "python3",
                    "scripts/harvest-childminders.py",
                    "--la",
                    la,
                    "--out-dir",
                    out_rel,
                ]
            )

        index = json.loads((ROOT / index_rel).read_text(encoding="utf-8"))
        canonical = index.get("maintainedScope") or la
        stats = index.get("stats") or {}
        canon_slug = la_slug(canonical)
        ey_path = out_dir / "ey-providers-index.json"
        cm_path = out_dir / "childminders-index.json"
        ey_count = None
        cm_count = None
        if ey_path.exists():
            ey_payload = json.loads(ey_path.read_text(encoding="utf-8"))
            ey_count = ey_payload.get("stats", {}).get("providerCount")
        if cm_path.exists():
            cm_payload = json.loads(cm_path.read_text(encoding="utf-8"))
            cm_count = cm_payload.get("stats", {}).get("providerCount")
        paths = {
            "schoolsIndex": f"/data/packs/{canon_slug}/schools-index.json",
            "directory": f"/data/packs/{canon_slug}/schools-directory.json",
        }
        if ey_path.exists():
            paths["eyProviders"] = f"/data/packs/{canon_slug}/ey-providers-index.json"
        if cm_path.exists():
            paths["childminders"] = f"/data/packs/{canon_slug}/childminders-index.json"
        packs[slug] = {
            **packs[slug],
            "localAuthority": canonical,
            "slug": canon_slug,
            "status": "ready",
            "schoolCount": stats.get("schoolCount"),
            "withRwm": stats.get("withRwm"),
            "withKs4": stats.get("withKs4"),
            "eyProviderCount": ey_count,
            "childminderCount": cm_count,
            "giasEnriched": bool(stats.get("giasEnriched")),
            "phonicsEnriched": bool(stats.get("phonicsEnriched")),
            "independentEnriched": bool(stats.get("independentEnriched")),
            "eyEnriched": bool(ey_path.exists() or stats.get("ofstedStateAsAt")),
            "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "note": packs[slug].get("note"),
            "paths": paths,
        }
        # If label canonicalisation changed the slug, move entry.
        if canon_slug != slug:
            packs[canon_slug] = packs.pop(slug)
        save_manifest(manifest)
        print(json.dumps(packs.get(canon_slug, packs.get(slug)), indent=2))
        return 0
    except Exception as exc:  # noqa: BLE001
        packs[slug]["status"] = "failed"
        packs[slug]["note"] = str(exc)[:500]
        save_manifest(manifest)
        raise


if __name__ == "__main__":
    raise SystemExit(main())
