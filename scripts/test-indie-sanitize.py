#!/usr/bin/env python3
"""Unit checks for independent KS4 nil/zero sanitization."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "enrich_independents",
    ROOT / "scripts" / "enrich-independents.py",
)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)
sanitize = mod.sanitize_ks4_metrics


def main() -> None:
    # Mill Hill-style: combined eng/math 0% but real Att8 / passes / maths pillar.
    mill_hill = {
        "att8Average": 46.0,
        "engMath94Percent": 0.0,
        "engMath95Percent": 0.0,
        "engMathEnteringPercent": 0.0,
        "anyPassPercent": 100.0,
        "ebaccEnteringPercent": 0.0,
        "ebacc94Percent": 0.0,
        "ebaccAps": 4.07,
        "ebaccEng94Percent": 0.0,
        "ebaccMat94Percent": 74.2,
        "ebaccEngEnteringPercent": 0.0,
        "ebaccMatEnteringPercent": 74.7,
        "ks4Pupils": 90.0,
    }
    out, cleared = sanitize(mill_hill)
    assert out["engMath94Percent"] is None, out
    assert out["engMath95Percent"] is None, out
    assert out["ebacc94Percent"] is None, out
    assert out["ebaccMat94Percent"] == 74.2
    assert out.get("engMathMeasureUnavailable") is True
    assert "engMath94Percent" in cleared

    # Both pillars present → combined fallback.
    both = {
        "att8Average": 50.0,
        "engMath94Percent": 0.0,
        "engMath95Percent": 0.0,
        "engMathEnteringPercent": 0.0,
        "anyPassPercent": 98.0,
        "ebaccEnteringPercent": 10.0,
        "ebacc94Percent": 8.0,
        "ebaccEng94Percent": 88.0,
        "ebaccMat94Percent": 74.0,
        "ebaccEngEnteringPercent": 90.0,
        "ebaccMatEnteringPercent": 80.0,
        "ks4Pupils": 100.0,
    }
    out2, _ = sanitize(both)
    assert out2["engMath94Percent"] == 74.0
    assert out2.get("engMath94IsPillarFallback") is True

    # Genuine low basics should survive when pupils entered the measure.
    genuine = {
        "att8Average": 8.5,
        "engMath94Percent": 5.6,
        "engMath95Percent": 0.0,
        "engMathEnteringPercent": 100.0,
        "anyPassPercent": 72.2,
        "ebaccEnteringPercent": 0.0,
        "ebacc94Percent": 0.0,
        "ks4Pupils": 18.0,
    }
    out3, _ = sanitize(genuine)
    assert out3["engMath94Percent"] == 5.6
    # 5+ can legitimately be 0 when 4+ is low but entries exist — keep unless nil entry.
    assert out3["engMath95Percent"] == 0.0 or out3["engMath95Percent"] is None
    # Actually current logic clears eng95 when eng95==0 and engmath_nil.
    # engmath_nil is False here (enter=100, eng94!=0), so 0 stays.
    assert out3["engMath95Percent"] == 0.0
    assert out3["ebacc94Percent"] is None

    sanitize_ks5 = mod.sanitize_ks5_metrics
    ks5_nil = {
        "ks5ApsPerEntry": 0.0,
        "ks5Best3Aps": 0.0,
        "ks5Students": 40.0,
        "ks5AlevelStudents": 38.0,
        "ks5ValueAdded": 0.1,
    }
    out5, cleared5 = sanitize_ks5(ks5_nil)
    assert out5["ks5ApsPerEntry"] is None
    assert out5["ks5Best3Aps"] is None
    assert out5["ks5Students"] == 40.0
    assert "ks5ApsPerEntry" in cleared5

    ks5_ok = {
        "ks5ApsPerEntry": 50.4,
        "ks5Best3Aps": 50.6,
        "ks5Students": 167.0,
        "ks5AlevelStudents": 166.0,
        "ks5ValueAdded": 0.18,
    }
    out6, cleared6 = sanitize_ks5(ks5_ok)
    assert out6["ks5ApsPerEntry"] == 50.4
    assert cleared6 == []

    isi_url = mod.isi_reports_search_url(
        postcode="EC2Y 8BB",
        name="City of London School",
        urn="100003",
    )
    assert "i=school" in isi_url
    assert "City" in isi_url or "City%20" in isi_url or "City+of" in isi_url
    assert isi_url.startswith("https://www.isi.net/reports/?")

    # KS4 total-filter map must match the EES field ids used in harvest_ks4.
    assert mod.KS4_TOTAL_FILTERS["pPmSo"] == "5Kydi"
    assert mod.KS4_TOTAL_FILTERS["LZ6Wj"] == "9b64v"

    fixture = """
    <ul>
      <li><a class="--docreader" href="https://reports.isi.net/DownloadReport.aspx?t=c&amp;r=EQI7250_20230321.pdf&amp;s=7250"></a></li>
      <li><a class="--docreader" href="https://reports.isi.net/DownloadReport.aspx?t=c&r=ROU7250_20260303.pdf&s=7250"></a></li>
      <li><a class="--docreader" href="https://reports.isi.net/DownloadReport.aspx?t=c&r=NRIMC7250_20260618.pdf&s=7250"></a></li>
    </ul>
    """
    latest = mod.parse_isi_latest_report(fixture)
    assert latest is not None
    assert latest["isiLatestReportDate"] == "2026-06-18"
    assert "NRIMC7250_20260618" in latest["isiLatestReportUrl"]
    assert latest["isiLatestReportTitle"] == "Interim monitoring visit"

    # Exact "Priory School" slug must beat "Brooke Priory School".
    brooke = "https://www.isi.net/institutions/school/brooke-priory-school-6292"
    exact = "https://www.isi.net/institutions/school/priory-school-9479"
    assert mod._score_isi_profile_url(exact, "Priory School") > mod._score_isi_profile_url(
        brooke, "Priory School"
    )

    print("indie sanitize ok")


if __name__ == "__main__":
    main()
