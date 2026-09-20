#!/usr/bin/env python3
"""Unit tests for qualitative ingest phase detection."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from qualitative_ingest_policy import (  # noqa: E402
    INGEST_POLICY_PRESETS,
    assess_qualitative_ingest_phase,
    resolve_effective_phase,
)
from seed_scope import (  # noqa: E402
    progressive_national_pack_targets,
)


def main() -> int:
    assessment = assess_qualitative_ingest_phase(known=set())
    assert assessment["phase"] in ("se_tail", "london", "maintenance"), assessment
    # With current repo data the SE tail is not fully exhausted.
    assert assessment["remainingNonLondonWebsites"] > 0 or (
        assessment["remainingLondonWebsites"] > 0
        or assessment["pendingLondonPacks"] > 0
    )
    assert resolve_effective_phase("auto", assessment) == assessment["phase"]
    assert resolve_effective_phase("maintenance", assessment) == "maintenance"
    for phase in ("se_tail", "london", "maintenance"):
        assert phase in INGEST_POLICY_PRESETS
        assert INGEST_POLICY_PRESETS[phase]["limit"] > 0
    ring = progressive_national_pack_targets()
    assert "Wiltshire" in ring and ring[0] == "Wiltshire"
    print(f"OK ingest phase={assessment['phase']} assessment={assessment}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
