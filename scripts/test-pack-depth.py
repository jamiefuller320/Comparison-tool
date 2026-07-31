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
    assert_help_has(
        "enrich-independents.py",
        "--la",
        "--index",
        "--isi-only",
        "--skip-isi-html",
        "--isi-resolve-cap",
    )
    assert_help_has("enrich-phonics.py", "--la", "--index", "--seed-la")
    assert_help_has("enrich-ey-schools.py", "--la", "--index")
    assert_help_has("harvest-ey-providers.py", "--la", "--out-dir")
    assert_help_has("harvest-childminders.py", "--la", "--out-dir")
    assert_help_has("build-la-pack.py", "--skip-depth", "--skip-ey", "--la")
    assert_help_has(
        "build-region-packs.py",
        "--skip-ready",
        "--continue-on-error",
        "--only",
        "--limit",
    )

    # GIAS open-date helper (hyphenated module name).
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "enrich_secondaries",
        ROOT / "scripts" / "enrich-secondaries.py",
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    assert mod.parse_gias_open_date("01-01-2024") == "2024-01-01"
    assert mod.parse_gias_open_date("2023-09-01") == "2023-09-01"
    assert mod.parse_gias_open_date("") is None

    # Non-Hampshire must refuse to overwrite the maintained EY/CM root.
    for script in ("harvest-ey-providers.py", "harvest-childminders.py"):
        bad_root = subprocess.run(
            ["python3", f"scripts/{script}", "--la", "Surrey", "--out-dir", "public/data"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        combined = bad_root.stderr + bad_root.stdout
        if bad_root.returncode == 0 or "maintained root" not in combined:
            raise SystemExit(
                f"FAIL: {script} should refuse non-Hampshire root write\n{combined[:800]}"
            )

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
