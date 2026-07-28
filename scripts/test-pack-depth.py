#!/usr/bin/env python3
"""Offline checks for pack-depth CLI flags and path resolution."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from seed_scope import resolve_index_bundle  # noqa: E402


def assert_help_has(script: str, *needles: str) -> None:
    proc = subprocess.run(
        ["python3", str(ROOT / "scripts" / script), "--help"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    text = proc.stdout + proc.stderr
    for needle in needles:
        if needle not in text:
            raise SystemExit(f"FAIL {script} --help missing {needle!r}\n{text}")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        pack_index = Path(tmp) / "schools-index.json"
        pack_index.write_text("{}", encoding="utf-8")
        bundle = resolve_index_bundle(pack_index, ROOT)
        assert bundle["index"] == pack_index
        assert bundle["directory"].name == "schools-directory.json"
        assert bundle["summary"].name == "harvest-summary.json"
        assert bundle["is_root"] is False

    root_bundle = resolve_index_bundle("public/data/schools-index.json", ROOT)
    assert root_bundle["is_root"] is True

    assert_help_has("enrich-secondaries.py", "--la", "--index", "--seed-la")
    assert_help_has("enrich-independents.py", "--la", "--index")
    assert_help_has("enrich-phonics.py", "--la", "--index", "--seed-la")
    assert_help_has("build-la-pack.py", "--skip-depth", "--la")

    # Hampshire must be rejected for on-demand packs.
    bad = subprocess.run(
        ["python3", "scripts/build-la-pack.py", "--la", "Hampshire", "--skip-depth"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if bad.returncode == 0:
        raise SystemExit("FAIL: Hampshire pack should be rejected")
    if "maintained root" not in (bad.stderr + bad.stdout):
        raise SystemExit(f"FAIL unexpected Hampshire rejection output: {bad.stderr}")

    print("pack depth helpers + CLI flags ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
