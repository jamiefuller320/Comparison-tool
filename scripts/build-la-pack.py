#!/usr/bin/env python3
"""Build an on-demand local-authority school pack under public/data/packs/{slug}/.

Does not overwrite the Hampshire maintained root index. First slice:
schools harvest (early EES LA filter) + geocode + manifest update.

Usage:
  python3 scripts/build-la-pack.py --la Surrey
  python3 scripts/build-la-pack.py --la "Brighton and Hove" --sample 20
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
        "note": "Schools index pack (EY / history depth are follow-on steps).",
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

        index = json.loads((ROOT / index_rel).read_text(encoding="utf-8"))
        canonical = index.get("maintainedScope") or la
        packs[slug] = {
            **packs[slug],
            "localAuthority": canonical,
            "slug": la_slug(canonical),
            "status": "ready",
            "schoolCount": index.get("stats", {}).get("schoolCount"),
            "withRwm": index.get("stats", {}).get("withRwm"),
            "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "paths": {
                "schoolsIndex": f"/data/packs/{la_slug(canonical)}/schools-index.json",
                "directory": f"/data/packs/{la_slug(canonical)}/schools-directory.json",
            },
        }
        # If label canonicalisation changed the slug, move entry.
        if la_slug(canonical) != slug:
            packs[la_slug(canonical)] = packs.pop(slug)
        save_manifest(manifest)
        print(json.dumps(packs.get(la_slug(canonical), packs.get(slug)), indent=2))
        return 0
    except Exception as exc:  # noqa: BLE001
        packs[slug]["status"] = "failed"
        packs[slug]["note"] = str(exc)[:500]
        save_manifest(manifest)
        raise


if __name__ == "__main__":
    raise SystemExit(main())
