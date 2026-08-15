#!/usr/bin/env python3
"""Unit tests for KS2 history soft-fail / recovery behaviour."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import importlib.util

_spec = importlib.util.spec_from_file_location(
    "extract_ks2_history",
    ROOT / "scripts" / "extract-ks2-history.py",
)
assert _spec and _spec.loader
ks2 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ks2)


MINI_CSV = """RECTYPE,URN,PTRWM_EXP,TELIG
1,116338,70,30
1,999001,55,28
4,,65,650000
"""


class SoftFailTests(unittest.TestCase):
    def test_recover_failed_year_from_existing(self) -> None:
        existing_periods = ["2015/2016", "2024/2025"]
        existing_england = {
            key: [10 if key == "rwmExpected" else None, 61 if key == "rwmExpected" else None]
            for key in ks2.METRIC_COLS
        }
        existing_schools = {
            "116338": {
                key: [70 if key == "rwmExpected" else None, 72 if key == "rwmExpected" else None]
                for key in ks2.METRIC_COLS
            }
        }
        existing = (existing_periods, existing_england, existing_schools)

        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "ks2-2024-2025.bin"
            csv_path.write_text(MINI_CSV, encoding="utf-8")

            def fake_download(year: str) -> Path:
                if year == "2015-2016":
                    raise ks2.DownloadError("HTTP Error 403: Forbidden")
                if year == "2024-2025":
                    return csv_path
                raise ks2.DownloadError(f"unexpected year {year}")

            periods, england, schools, report = ks2.extract_years(
                ["2015-2016", "2024-2025"],
                existing=existing,
                download_fn=fake_download,
            )

        self.assertEqual(periods, ["2015/2016", "2024/2025"])
        self.assertEqual(report["recovered"], ["2015-2016"])
        self.assertEqual(report["downloaded"], ["2024-2025"])
        self.assertEqual(report["skipped"], [])
        self.assertEqual(england["rwmExpected"], [10, 65])
        self.assertEqual(schools["116338"]["rwmExpected"], [70, 70])

    def test_skip_when_no_existing_and_not_strict_empty(self) -> None:
        def always_fail(year: str) -> Path:
            raise ks2.DownloadError(f"403 for {year}")

        periods, _england, schools, report = ks2.extract_years(
            ["2015-2016"],
            existing=None,
            download_fn=always_fail,
        )
        self.assertEqual(periods, [])
        self.assertEqual(schools, {})
        self.assertEqual(report["skipped"], ["2015-2016"])

    def test_main_keeps_existing_when_empty(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "ks2-history"
            out.mkdir()
            meta = {
                "periods": ["2024/2025"],
                "england": {key: [61] for key in ks2.METRIC_COLS},
                "schoolCount": 1,
            }
            (out / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
            (out / "u38.json").write_text(
                json.dumps(
                    {
                        "116338": {
                            key: [72 if key == "rwmExpected" else None]
                            for key in ks2.METRIC_COLS
                        }
                    }
                ),
                encoding="utf-8",
            )

            with mock.patch.object(ks2, "OUT_DIR", out), mock.patch.object(
                ks2,
                "extract_years",
                return_value=(
                    [],
                    {key: [] for key in ks2.METRIC_COLS},
                    {},
                    {
                        "downloaded": [],
                        "recovered": [],
                        "skipped": ["2015-2016"],
                    },
                ),
            ):
                code = ks2.main(["--years", "2015-2016"])

            self.assertEqual(code, 0)
            self.assertTrue((out / "meta.json").exists())
            self.assertEqual(
                json.loads((out / "meta.json").read_text(encoding="utf-8"))["periods"],
                ["2024/2025"],
            )


if __name__ == "__main__":
    unittest.main()
