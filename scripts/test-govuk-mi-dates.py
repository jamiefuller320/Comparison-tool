#!/usr/bin/env python3
"""Unit tests for GOV.UK MI CSV as-at date sorting."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import govuk_mi_dates as mi  # noqa: E402


class MonthNumberTests(unittest.TestCase):
    def test_full_and_abbreviated_months(self) -> None:
        self.assertEqual(mi.month_number("September"), 9)
        self.assertEqual(mi.month_number("Sep"), 9)
        self.assertEqual(mi.month_number("sept"), 9)
        self.assertEqual(mi.month_number("January"), 1)
        self.assertEqual(mi.month_number("Jan"), 1)
        self.assertEqual(mi.month_number("June"), 6)
        self.assertEqual(mi.month_number("Jun"), 6)
        self.assertEqual(mi.month_number("unknown"), 0)


class OfstedCsvSortKeyTests(unittest.TestCase):
    def test_september_beats_august_when_abbreviated(self) -> None:
        aug = (
            "https://assets.publishing.service.gov.uk/media/abc/"
            "Management_information_-_state-funded_schools_-_latest_inspections_as_at_31_August_2026.csv"
        )
        sep = (
            "https://assets.publishing.service.gov.uk/media/def/"
            "Management_information_-_state-funded_schools_-_latest_inspections_as_at_30_Sep_2026.csv"
        )
        self.assertLess(mi.ofsted_csv_sort_key(aug), mi.ofsted_csv_sort_key(sep))

    def test_january_abbreviation_sorts_after_december(self) -> None:
        dec = (
            "https://assets.publishing.service.gov.uk/media/x/"
            "Consented_addresses_for_childminders_and_domestic_childcare_as_at_31_December_2025.csv"
        )
        jan = (
            "https://assets.publishing.service.gov.uk/media/y/"
            "Consented_addresses_for_childminders_and_domestic_childcare_as_at_31_Jan_2026.csv"
        )
        self.assertLess(mi.ofsted_csv_sort_key(dec), mi.ofsted_csv_sort_key(jan))

    def test_picks_latest_from_mixed_govuk_filenames(self) -> None:
        urls = [
            "https://assets.publishing.service.gov.uk/media/a/file_as_at_30_June_2026.csv",
            "https://assets.publishing.service.gov.uk/media/b/file_as_at_31_August_2026.csv",
            "https://assets.publishing.service.gov.uk/media/c/file_as_at_30_Sep_2026.csv",
            "https://assets.publishing.service.gov.uk/media/d/file_as_at_30_Apr_2026.csv",
        ]
        chosen = max(urls, key=mi.ofsted_csv_sort_key)
        self.assertIn("30_Sep_2026", chosen)


if __name__ == "__main__":
    unittest.main()
