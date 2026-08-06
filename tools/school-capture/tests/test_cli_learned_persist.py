"""CLI must rebuild learned terms from the sidecar, never save boosts as counts."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

from school_capture.cli import build_engine, main
from school_capture.models import (
    QualitativeCaptureIndex,
    QualitativeCaptureRecord,
    today_iso,
)


def test_build_engine_keeps_boosts_and_counts_separate(tmp_path: Path):
    learned = tmp_path / "learned.json"
    learned.write_text(
        json.dumps(
            {
                "terms": {"curriculum": 100, "send": 40},
                "df": {"curriculum": 8, "send": 5},
                "schoolCount": 10,
            }
        ),
        encoding="utf-8",
    )

    class Args:
        no_learned_terms = False
        learned_terms = learned
        no_hub_spoke = True
        no_documents = True
        no_news = True
        no_social = True

    engine = build_engine(Args())
    website = engine.adapters[0]
    # Adapter scores with boosts (≤ MAX_BOOST); engine mutates raw counts.
    assert website._learned_terms["curriculum"] <= 12
    assert engine.learned_terms["curriculum"] == 100


def test_main_rebuilds_lexicon_from_sidecar_not_engine_mutations(tmp_path: Path):
    fixture = tmp_path / "schools.json"
    fixture.write_text(
        json.dumps(
            {
                "schools": [
                    {
                        "urn": "100001",
                        "name": "Alpha Primary",
                        "website": "https://alpha.example/",
                        "localAuthority": "Hampshire",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    out = tmp_path / "capture.json"
    learned = tmp_path / "learned.json"
    # Poisoned prior: boosts mistakenly stored as counts (the old bug).
    learned.write_text(
        json.dumps(
            {
                "terms": {"curriculum": 12, "bogus-boost": 12},
                "df": {"curriculum": 12, "bogus-boost": 12},
                "schoolCount": 12,
            }
        ),
        encoding="utf-8",
    )

    sidecar = {
        "schoolCount": 2,
        "records": [
            {
                "urn": "100001",
                "name": "Alpha Primary",
                "areas": [
                    {
                        "area": "curriculum",
                        "signals": [
                            {
                                "sourceUrl": "https://alpha.example/curriculum",
                                "sourceType": "school-website",
                                "pageTitle": "Curriculum",
                                "text": "Our curriculum",
                            }
                        ],
                    }
                ],
            },
            {
                "urn": "100002",
                "name": "Beta Primary",
                "areas": [
                    {
                        "area": "curriculum",
                        "signals": [
                            {
                                "sourceUrl": "https://beta.example/curriculum",
                                "sourceType": "school-website",
                                "pageTitle": "Curriculum",
                                "text": "Curriculum overview",
                            }
                        ],
                    }
                ],
            },
        ],
    }
    out.write_text(json.dumps(sidecar), encoding="utf-8")

    record = QualitativeCaptureRecord(
        urn="100001",
        name="Alpha Primary",
        assessedAt=today_iso(),
        areas=[],
    )

    def _upsert(path, records, stats=None):
        # Keep the multi-school sidecar authoritative for the rebuild step.
        path.write_text(json.dumps(sidecar), encoding="utf-8")
        return QualitativeCaptureIndex.from_dict(sidecar)

    with patch("school_capture.cli.CaptureEngine.capture_school", return_value=record):
        with patch("school_capture.cli.upsert_records", side_effect=_upsert):
            rc = main(
                [
                    "--fixture",
                    str(fixture),
                    "--output",
                    str(out),
                    "--learned-terms",
                    str(learned),
                    "--no-news",
                    "--no-social",
                    "--no-documents",
                ]
            )
    assert rc == 0
    payload = json.loads(learned.read_text(encoding="utf-8"))
    # Rebuilt from sidecar pages — not the poisoned boost=12 store.
    assert payload["schoolCount"] == 2
    assert payload["terms"].get("curriculum", 0) >= 2
    assert "bogus-boost" not in payload["terms"]
