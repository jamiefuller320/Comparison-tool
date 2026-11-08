#!/usr/bin/env python3
"""Offline checks for the pack data refresh rota."""

from __future__ import annotations

import json
import sys
import tempfile
from importlib.machinery import SourceFileLoader
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

_refresh = SourceFileLoader(
    "refresh_pack_data",
    str(SCRIPTS / "refresh-pack-data.py"),
).load_module()
ROTA_CRON = _refresh.ROTA_CRON
ROTA_PER_RUN = _refresh.ROTA_PER_RUN
merge_ks2_harvest = _refresh.merge_ks2_harvest
schools_moved_to_as_at = _refresh.schools_moved_to_as_at
select_rota_slice = _refresh.select_rota_slice


def test_rota_picks_oldest() -> None:
    targets = [
        {"slug": "brent", "dataRefreshedAt": "2026-11-02T00:00:00Z"},
        {"slug": "barnet", "dataRefreshedAt": ""},
        {"slug": "bromley", "dataRefreshedAt": "2026-10-01T00:00:00Z"},
        {"slug": "bexley", "dataRefreshedAt": "2026-10-01T00:00:00Z"},
    ]
    picked = select_rota_slice(targets, 2)
    slugs = [row["slug"] for row in picked]
    if slugs != ["barnet", "bexley"]:
        raise SystemExit(f"FAIL rota order {slugs}")
    if select_rota_slice(targets, 0):
        raise SystemExit("FAIL limit 0 should be empty")


def test_schools_moved() -> None:
    before = [
        {"slug": "surrey", "schoolCount": 10, "ofstedStateAsAt": "30 June 2026", "region": "south-east-dorset"},
        {"slug": "barnet", "schoolCount": 4, "ofstedStateAsAt": "31 August 2026", "region": "london"},
        {"slug": "wiltshire", "schoolCount": 3, "ofstedStateAsAt": "31 October 2026", "region": "extended"},
    ]
    after = {
        "surrey": "31 October 2026",
        "barnet": "31 October 2026",
        "wiltshire": "31 October 2026",
    }
    moved = schools_moved_to_as_at(before, after)
    if moved["movedSchools"] != 14:
        raise SystemExit(f"FAIL moved count {moved['movedSchools']}")
    if moved["unchangedSchools"] != 3:
        raise SystemExit(f"FAIL unchanged {moved['unchangedSchools']}")


def test_ks2_merge_keeps_inspection_fields() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        live = root / "schools-index.json"
        harvested = root / "harvested.json"
        live.write_text(
            json.dumps(
                {
                    "generatedAt": "2026-07-31",
                    "period": "2024/2025",
                    "benchmarks": {
                        "england": {"rwmExpected": 60},
                        "localAuthorities": {"Surrey": {"rwmExpected": 61}},
                        "phonics": {"period": "2024/2025", "england": {"year1Expected": 80}},
                    },
                    "schools": [
                        {
                            "urn": "1",
                            "name": "Keep Precis",
                            "rwmExpected": 50,
                            "inspectionPrecis": "A calm school.",
                            "isiLatestReportUrl": "https://isi.example/1",
                            "schoolWebsite": "https://school.example",
                        }
                    ],
                    "stats": {},
                }
            ),
            encoding="utf-8",
        )
        (root / "schools-directory.json").write_text(
            json.dumps(
                {
                    "generatedAt": "2026-07-31",
                    "schools": [{"urn": "1", "name": "Keep Precis", "rwmExpected": 50}],
                }
            ),
            encoding="utf-8",
        )
        harvested.write_text(
            json.dumps(
                {
                    "generatedAt": "2026-11-08",
                    "period": "2024/2025",
                    "benchmarks": {
                        "england": {"rwmExpected": 62},
                        "localAuthorities": {"Surrey": {"rwmExpected": 63}},
                    },
                    "schools": [
                        {"urn": "1", "name": "Keep Precis", "rwmExpected": 70},
                        {"urn": "2", "name": "New School", "rwmExpected": 40},
                    ],
                }
            ),
            encoding="utf-8",
        )
        stats = merge_ks2_harvest(live, harvested)
        if stats["updated"] != 1 or stats["added"] != 1:
            raise SystemExit(f"FAIL merge stats {stats}")
        payload = json.loads(live.read_text(encoding="utf-8"))
        kept = payload["schools"][0]
        if kept["inspectionPrecis"] != "A calm school.":
            raise SystemExit("FAIL precis dropped")
        if kept["isiLatestReportUrl"] != "https://isi.example/1":
            raise SystemExit("FAIL ISI url dropped")
        if kept["schoolWebsite"] != "https://school.example":
            raise SystemExit("FAIL website dropped")
        if kept["rwmExpected"] != 70:
            raise SystemExit("FAIL KS2 metric not updated")
        if payload["benchmarks"]["phonics"]["england"]["year1Expected"] != 80:
            raise SystemExit("FAIL phonics bench dropped")
        if payload["benchmarks"]["england"]["rwmExpected"] != 62:
            raise SystemExit("FAIL england bench not refreshed")
        if payload["generatedAt"] != "2026-11-08":
            raise SystemExit("FAIL generatedAt")


def test_gias_label() -> None:
    module = SourceFileLoader(
        "enrich_secondaries",
        str(SCRIPTS / "enrich-secondaries.py"),
    ).load_module()
    label = module.gias_as_at_label("20261105")
    if label != "5 November 2026":
        raise SystemExit(f"FAIL gias label {label}")


def test_workflow_contract() -> None:
    workflow = (ROOT / ".github" / "workflows" / "refresh-packs.yml").read_text(
        encoding="utf-8"
    )
    notify = (ROOT / ".github" / "scripts" / "notify-workflow-failure.sh").read_text(
        encoding="utf-8"
    )
    required = [
        f'cron: "{ROTA_CRON}"',
        "git pull --rebase origin main",
        "notify-workflow-failure.sh",
        "refresh-pack-data.py",
        "issues: write",
        "workflow-failure",
    ]
    for needle in required:
        if needle not in workflow and needle not in notify:
            raise SystemExit(f"FAIL workflow missing {needle!r}")
    if "workflow-failure" not in notify:
        raise SystemExit("FAIL notify script missing workflow-failure label")
    if ROTA_PER_RUN != 2:
        raise SystemExit(f"FAIL expected 2 packs per run, got {ROTA_PER_RUN}")


def main() -> int:
    test_rota_picks_oldest()
    test_schools_moved()
    test_ks2_merge_keeps_inspection_fields()
    test_gias_label()
    test_workflow_contract()
    print("refresh pack data ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
