#!/usr/bin/env python3
"""Offline tests for the qualitative source spot-check loop."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(ROOT / "tools" / "school-capture"))

from qualitative_spotcheck import (  # noqa: E402
    assess_school,
    run_spotcheck,
    select_sample,
)


FIXTURE_SHARD_CHROME = {
    "urn": "900001",
    "name": "Chrome Primary",
    "assessedAt": "2026-09-01",
    "areas": [
        {
            "area": "curriculum",
            "score": 80,
            "confidence": 0.9,
            "summary": "Strong publicly visible evidence for curriculum (3 specific items). "
            "Listed provision includes Dinner Menu, Newsletters, Pay Online.",
            "themes": ["curriculum"],
            "offerings": ["Dinner Menu", "Newsletters", "Pay Online"],
            "signals": [],
            "narrativeSummary": "Strong publicly visible evidence listing Dinner Menu.",
            "synthesisMethod": "deterministic",
        },
        {
            "area": "send",
            "score": 40,
            "confidence": 0.5,
            "summary": "Limited SEND evidence.",
            "themes": [],
            "offerings": ["Ascending", "CLASSROOM, INCLUDING SCHOOL TRIPS?"],
            "signals": [],
            "narrativeSummary": "Fragments from a PDF form.",
            "synthesisMethod": "deterministic",
        },
    ],
}

FIXTURE_SHARD_CLEAN = {
    "urn": "900002",
    "name": "Clean Primary",
    "assessedAt": "2026-09-01",
    "areas": [
        {
            "area": "enrichment",
            "score": 70,
            "confidence": 0.8,
            "summary": "Moderate publicly visible evidence for enrichment.",
            "themes": ["sport", "music"],
            "offerings": ["Football", "Choir"],
            "signals": [],
            "narrativeSummary": "Clubs include football and choir.",
            "synthesisMethod": "deterministic",
        },
        {
            "area": "ethos",
            "score": 60,
            "confidence": 0.7,
            "summary": "Values of kindness and resilience.",
            "themes": ["kindness", "resilience"],
            "offerings": ["Kindness", "Resilience"],
            "signals": [],
            "narrativeSummary": "Our values emphasise kindness and resilience.",
            "synthesisMethod": "deterministic",
        },
    ],
}

SOURCE_CLEAN = """
Welcome to Clean Primary. Our values are kindness and resilience.
After-school clubs include Football and Choir every week.
"""

SOURCE_ETHOS_RICH = """
Our mission: Let all you do be done with love. We are a Rights Respecting School.
Catholic ethos woven through worship and parish partnership.
"""


def _write_fixture_tree(tmp: Path) -> tuple[Path, Path, Path]:
    shards = tmp / "qualitative"
    packs = tmp / "packs" / "fixture-la"
    packs.mkdir(parents=True)
    shards.mkdir(parents=True)
    (shards / "900001.json").write_text(
        json.dumps(FIXTURE_SHARD_CHROME), encoding="utf-8"
    )
    (shards / "900002.json").write_text(
        json.dumps(FIXTURE_SHARD_CLEAN), encoding="utf-8"
    )
    index = {
        "schools": [
            {
                "urn": "900001",
                "name": "Chrome Primary",
                "localAuthority": "Hampshire",
                "schoolWebsite": "https://chrome.example.test/",
            },
            {
                "urn": "900002",
                "name": "Clean Primary",
                "localAuthority": "Lambeth",
                "schoolWebsite": "https://clean.example.test/",
            },
        ]
    }
    root_index = tmp / "schools-index.json"
    root_index.write_text(json.dumps(index), encoding="utf-8")
    (packs / "schools-index.json").write_text(json.dumps({"schools": []}), encoding="utf-8")
    return shards, root_index, tmp / "packs"


def test_chrome_and_pdf_fail() -> None:
    with tempfile.TemporaryDirectory() as raw:
        tmp = Path(raw)
        shards, root_index, packs = _write_fixture_tree(tmp)
        website_index = {
            "900001": {
                "name": "Chrome Primary",
                "website": "https://chrome.example.test/",
                "la": "Hampshire",
                "laSlug": "hampshire",
            }
        }
        result = assess_school(
            "900001",
            website_index=website_index,
            shards_dir=shards,
            offline_source_text=SOURCE_ETHOS_RICH,
        )
        assert result.verdict == "fail", result.to_dict()
        codes = {f.code for f in result.flags}
        assert "chrome_in_offerings" in codes
        assert "pdf_fragment_junk" in codes
        assert result.chromeOfferings
        # Ethos language on site should surface possible underclaim warn.
        assert "possible_underclaim" in codes


def test_clean_pass() -> None:
    with tempfile.TemporaryDirectory() as raw:
        tmp = Path(raw)
        shards, _, _ = _write_fixture_tree(tmp)
        website_index = {
            "900002": {
                "name": "Clean Primary",
                "website": "https://clean.example.test/",
                "la": "Lambeth",
                "laSlug": "lambeth",
            }
        }
        result = assess_school(
            "900002",
            website_index=website_index,
            shards_dir=shards,
            offline_source_text=SOURCE_CLEAN,
        )
        assert result.verdict == "pass", result.to_dict()


def test_select_sample_respects_only_urns() -> None:
    with tempfile.TemporaryDirectory() as raw:
        tmp = Path(raw)
        shards, root_index, packs = _write_fixture_tree(tmp)
        from qualitative_spotcheck import load_website_index

        idx = load_website_index(root_index=root_index, packs_root=packs)
        sample = select_sample(
            website_index=idx,
            shards_dir=shards,
            sample_size=7,
            only_urns=["900002", "999999"],
        )
        assert sample == ["900002"]


def test_run_spotcheck_offline_writes_digest() -> None:
    with tempfile.TemporaryDirectory() as raw:
        tmp = Path(raw)
        shards, root_index, packs = _write_fixture_tree(tmp)
        digest_json = tmp / "spot.json"
        digest_md = tmp / "spot.md"
        candidates = tmp / "candidates.jsonl"
        payload = run_spotcheck(
            sample_size=2,
            seed=1,
            only_urns=["900001", "900002"],
            dry_run=False,
            offline_sources={
                "900001": SOURCE_ETHOS_RICH,
                "900002": SOURCE_CLEAN,
            },
            shards_dir=shards,
            root_index=root_index,
            packs_root=packs,
            digest_json=digest_json,
            digest_md=digest_md,
            candidates_path=candidates,
        )
        assert payload["failCount"] >= 1
        assert digest_json.is_file()
        assert digest_md.is_file()
        assert candidates.is_file()
        lines = [ln for ln in candidates.read_text(encoding="utf-8").splitlines() if ln]
        assert lines, "expected chrome candidates from failing school"
        row = json.loads(lines[0])
        assert row.get("junkClass") == "spotcheck_chrome"


def test_cli_dry_run() -> None:
    import subprocess

    out = subprocess.check_output(
        [
            sys.executable,
            str(ROOT / "scripts" / "run-qualitative-spotcheck-loop.py"),
            "--dry-run",
            "--sample-size",
            "3",
            "--seed",
            "42",
        ],
        cwd=ROOT,
        text=True,
    )
    payload = json.loads(out)
    assert payload["dryRun"] is True
    assert payload["sampleSize"] <= 3
    digest = ROOT / "public" / "data" / "packs" / "qualitative-spotcheck-latest.json"
    assert digest.is_file()
    print("OK qualitative-spotcheck-loop dry-run")


def main() -> int:
    test_chrome_and_pdf_fail()
    test_clean_pass()
    test_select_sample_respects_only_urns()
    test_run_spotcheck_offline_writes_digest()
    test_cli_dry_run()
    print("OK qualitative-spotcheck-loop tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
