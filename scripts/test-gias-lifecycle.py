#!/usr/bin/env python3
"""Offline checks for the GIAS lifecycle sync."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from gias_address import strip_gias_address, strip_gias_token  # noqa: E402
from gias_lifecycle import (  # noqa: E402
    GiasEstablishment,
    apply_coverage_stats,
    apply_gias_lifecycle,
    choose_successor,
    parse_establishment,
    phases_for_establishment,
    SuccessorOpt,
)


def establishment(**overrides) -> GiasEstablishment:
    base = dict(
        urn="100",
        name="Example School",
        status="Open",
        la="Hampshire",
        open_date="2026-09-01",
        close_date=None,
        close_reason=None,
        open_reason="Academy converter",
        type_name="Academy converter",
        phase_name="Primary",
        low_age="4",
        high_age="11",
        town="Winchester",
        postcode="SO23 9AB",
        address="High Street, Winchester, SO23 9AB",
        website=None,
        telephone=None,
        religion=None,
    )
    base.update(overrides)
    return GiasEstablishment(**base)


def index_with(*schools: dict) -> dict:
    return {
        "period": "2024/2025",
        "schools": [dict(school) for school in schools],
        "stats": {"schoolCount": len(schools), "infantOrNurseryCount": 0},
    }


def test_address_placeholders() -> None:
    assert strip_gias_address("Belle Vue Road, z, z, Aldershot") == (
        "Belle Vue Road, Aldershot"
    )
    assert strip_gias_address("Ringwood Road, Totton, z, Southampton, SO40 8EB") == (
        "Ringwood Road, Totton, Southampton, SO40 8EB"
    )
    assert strip_gias_address("z") is None
    assert strip_gias_address("High Street, N/A, Aldershot") == "High Street, Aldershot"
    assert strip_gias_address("High Street, Not applicable, Aldershot") == (
        "High Street, Aldershot"
    )
    assert strip_gias_token("z") is None
    assert strip_gias_token("SO23 9AB") == "SO23 9AB"
    # A real street that merely contains the letter must stay.
    assert strip_gias_address("Zetland Road, Winchester") == "Zetland Road, Winchester"


def test_phase_scope() -> None:
    phases, age = phases_for_establishment(
        low_age="",
        high_age="19",
        type_name="Free schools special",
        phase_name="Not applicable",
    )
    assert "ks2" in phases and "ks4" in phases
    assert age == "5 to 19"
    skipped, _ = phases_for_establishment(
        low_age="16",
        high_age="25",
        type_name="Special post 16 institution",
        phase_name="Not applicable",
    )
    assert skipped == []
    post16, _ = phases_for_establishment(
        low_age="15",
        high_age="25",
        type_name="Special post 16 institution",
        phase_name="16 plus",
    )
    assert post16 == []


def test_choose_successor_prefers_open() -> None:
    chosen = choose_successor(
        [
            SuccessorOpt(urn="200", name="Closed successor", date="2024-01-01"),
            SuccessorOpt(urn="300", name="Open successor", date="2020-01-01"),
        ],
        open_urns={"300"},
    )
    assert chosen is not None and chosen.urn == "300"
    tied = choose_successor(
        [
            SuccessorOpt(urn="400", name="Later", date="2025-09-01"),
            SuccessorOpt(urn="500", name="Earlier", date="2024-09-01"),
        ],
        open_urns={"400", "500"},
    )
    assert tied is not None and tied.urn == "400"


def test_lifecycle_marks_redirects_and_adds() -> None:
    indexes = {
        "hampshire": index_with(
            {
                "urn": "115881",
                "name": "Droxford Junior School",
                "localAuthority": "Hampshire",
                "address": "Belle Vue Road, z, z, Aldershot",
                "town": "Aldershot",
                "contactCapture": {
                    "contacts": [{"address": "The Avenue, z, Gosport, PO12 2JS"}]
                },
            },
            {
                "urn": "200000",
                "name": "No Successor School",
                "localAuthority": "Hampshire",
                "address": "High Street, Winchester",
            },
            {
                "urn": "300000",
                "name": "Already Closed",
                "localAuthority": "Hampshire",
                "closed": True,
            },
            {
                "urn": "999002",
                "name": "Staying Open",
                "localAuthority": "Hampshire",
                "address": "High Street, Winchester",
            },
        ),
        "surrey": index_with(
            {
                "urn": "400000",
                "name": "Surrey Closed",
                "localAuthority": "Surrey",
                "address": "Road, z, Guildford",
            }
        ),
    }
    rows = [
        establishment(
            urn="115881",
            name="Droxford Junior School",
            status="Closed",
            close_date="2025-10-31",
            close_reason="Academy Converter",
        ),
        establishment(
            urn="152067",
            name="Droxford Junior School",
            status="Open",
            open_date="2025-11-01",
        ),
        establishment(
            urn="200000",
            name="No Successor School",
            status="Closed",
            close_date="2026-01-01",
            close_reason="Closure",
        ),
        establishment(
            urn="300000",
            name="Already Closed",
            status="Closed",
            close_date="2020-01-01",
        ),
        establishment(
            urn="400000",
            name="Surrey Closed",
            status="Closed",
            la="Surrey",
            close_date="2026-03-01",
        ),
        establishment(
            urn="152041",
            name="The Orchard Way Academy",
            status="Open",
            la="Buckinghamshire",
            open_date="2026-09-01",
        ),
        establishment(
            urn="152152",
            name="Pinn River School",
            status="Open",
            la="Hillingdon",
            type_name="Free schools special",
            phase_name="Not applicable",
            low_age="",
            high_age="19",
            open_date="2026-01-01",
        ),
        establishment(
            urn="148555",
            name="Harris Clapham Sixth Form",
            status="Open",
            la="Hampshire",
            type_name="Free schools 16 to 19",
            phase_name="16 plus",
            low_age="16",
            high_age="19",
        ),
        establishment(
            urn="999001",
            name="Proposed School",
            status="Proposed to open",
            la="Hampshire",
        ),
        establishment(
            urn="999002",
            name="Staying Open",
            status="Open, but proposed to close",
            la="Hampshire",
        ),
        establishment(
            urn="999003",
            name="Somerset New",
            status="Open",
            la="Somerset",
        ),
    ]
    # Buckinghamshire and Hillingdon are not in this fixture's indexes, so
    # those openings are not added. Hampshire gains the listable open school
    # that is not post-16 and not already present: none of the Hampshire
    # openings above qualify except we add one explicit new primary.
    rows.append(
        establishment(
            urn="152999",
            name="Brand New Primary",
            status="Open",
            la="Hampshire",
            open_date="2026-09-01",
            low_age="4",
            high_age="11",
        )
    )
    links = [
        {
            "URN": "115881",
            "LinkURN": "152067",
            "LinkName": "Droxford Junior School",
            "LinkType": "Successor",
            "LinkEstablishedDate": "30-09-2025",
        },
        {
            "URN": "152067",
            "LinkURN": "115881",
            "LinkName": "Droxford Junior School",
            "LinkType": "Predecessor",
            "LinkEstablishedDate": "01-10-2025",
        },
    ]
    # Put the successor in the Hampshire index so the redirect is on-site.
    indexes["hampshire"]["schools"].append(
        {
            "urn": "152067",
            "name": "Droxford Junior School",
            "localAuthority": "Hampshire",
            "address": "High Street, z, Droxford",
        }
    )
    coverage = {
        "version": 1,
        "generatedAt": "2026-10-30T13:53:36Z",
        "pageBudget": {"maxSchoolPages": 5000, "maxTownPages": 160},
        "policy": {"seedAlwaysIncluded": True, "townMinSchools": 8},
        "includedAreaSlugs": ["hampshire"],
        "stats": {"schoolPages": 4, "addedThisRun": []},
    }
    result = apply_gias_lifecycle(
        indexes,
        rows,
        links,
        la_by_slug={"hampshire": "Hampshire", "surrey": "Surrey"},
        included_area_slugs=coverage["includedAreaSlugs"],
        seed_slug="hampshire",
        max_school_pages=5000,
        town_min_schools=8,
    )
    closed = {s["urn"]: s for s in indexes["hampshire"]["schools"]}
    assert closed["115881"]["closed"] is True
    assert closed["115881"]["successorUrn"] == "152067"
    assert closed["115881"]["closeDate"] == "2025-10-31"
    assert closed["115881"]["address"] == "Belle Vue Road, Aldershot"
    assert closed["115881"]["contactCapture"]["contacts"][0]["address"] == (
        "The Avenue, Gosport, PO12 2JS"
    )
    assert closed["200000"]["closed"] is True
    assert "successorUrn" not in closed["200000"]
    assert closed["152067"]["address"] == "High Street, Droxford"
    assert any(s["urn"] == "152999" for s in indexes["hampshire"]["schools"])
    assert all(s["urn"] != "148555" for s in indexes["hampshire"]["schools"])
    assert all(s["urn"] != "999001" for s in indexes["hampshire"]["schools"])
    assert all(s["urn"] != "999003" for s in indexes["hampshire"]["schools"])
    # Proposed-to-close stays listable, and is added because it was missing.
    assert any(s["urn"] == "999002" and not s.get("closed") for s in indexes["hampshire"]["schools"])
    assert result.closed_marked == 3  # 115881, 200000, surrey 400000; 300000 already closed
    assert result.sitemap_landings_removed == 2  # hampshire only
    assert result.redirects == 1
    assert result.redirects_on_site == 1
    assert result.redirect_rows[0]["urn"] == "115881"
    assert result.redirect_rows[0]["successorOnSite"] is True
    assert result.new_schools == 1  # 152999; 999002 was already listed
    assert result.address_fixes == 3  # 115881, 152067, surrey
    assert result.contact_address_fixes == 1
    assert result.max_school_pages == 5000
    assert result.seo_pages_before == 4
    assert result.seo_pages_after == 3
    assert result.slots_freed == 1

    updated = apply_coverage_stats(coverage, result)
    assert updated["pageBudget"] == coverage["pageBudget"]
    assert updated["includedAreaSlugs"] == ["hampshire"]
    assert updated["generatedAt"] == coverage["generatedAt"]
    assert updated["stats"]["schoolPages"] == result.seo_pages_after
    assert updated["stats"]["addedThisRun"] == []
    assert updated["stats"]["giasSlotsFreed"] == result.slots_freed
    # Open census excludes the closed rows.
    assert indexes["hampshire"]["stats"]["schoolCount"] == sum(
        1 for s in indexes["hampshire"]["schools"] if not s.get("closed")
    )


def test_same_name_fallback() -> None:
    indexes = {
        "hampshire": index_with(
            {
                "urn": "1",
                "name": "River School",
                "localAuthority": "Hampshire",
            }
        )
    }
    rows = [
        establishment(urn="1", name="River School", status="Closed", close_date="2026-08-31"),
        establishment(urn="2", name="River School", status="Open", open_date="2026-09-01"),
    ]
    result = apply_gias_lifecycle(
        indexes,
        rows,
        [],
        la_by_slug={"hampshire": "Hampshire"},
        included_area_slugs=["hampshire"],
        seed_slug="hampshire",
    )
    school = indexes["hampshire"]["schools"][0]
    assert school["successorUrn"] == "2"
    assert result.redirects == 1
    # Ambiguous same-name pair does not guess.
    indexes = {
        "hampshire": index_with(
            {"urn": "1", "name": "River School", "localAuthority": "Hampshire"}
        )
    }
    rows = [
        establishment(urn="1", name="River School", status="Closed", close_date="2026-08-31"),
        establishment(urn="2", name="River School", status="Open", open_date="2026-09-01"),
        establishment(urn="3", name="River School", status="Open", open_date="2026-09-01"),
    ]
    result = apply_gias_lifecycle(
        indexes,
        rows,
        [],
        la_by_slug={"hampshire": "Hampshire"},
        included_area_slugs=["hampshire"],
        seed_slug="hampshire",
    )
    assert "successorUrn" not in indexes["hampshire"]["schools"][0]
    assert result.redirects == 0


def test_parse_row_and_help() -> None:
    est = parse_establishment(
        {
            "URN": "116482",
            "EstablishmentName": "Abbotswood Junior School",
            "EstablishmentStatus (name)": "Open",
            "LA (name)": "Hampshire",
            "Street": "Ringwood Road",
            "Locality": "Totton",
            "Address3": "z",
            "Town": "Southampton",
            "County (name)": "z",
            "Postcode": "SO40 8EB",
            "OpenDate": "01-09-2024",
            "CloseDate": "",
            "StatutoryLowAge": "7",
            "StatutoryHighAge": "11",
            "TypeOfEstablishment (name)": "Foundation school",
            "PhaseOfEducation (name)": "Primary",
        }
    )
    assert est is not None
    assert est.address == "Ringwood Road, Totton, Southampton, SO40 8EB"
    assert est.open_date == "2024-09-01"
    proc = subprocess.run(
        ["python3", str(SCRIPTS / "sync-gias-lifecycle.py"), "--help"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    text = proc.stdout
    for needle in ("--dry-run", "--skip-geocode", "--skip-aeo"):
        if needle not in text:
            raise SystemExit(f"help missing {needle}")


def test_contact_loader_strips_z() -> None:
    capture = ROOT / "tools" / "school-capture"
    if str(capture) not in sys.path:
        sys.path.insert(0, str(capture))
    from school_capture.gias_edubase import _postal_address  # noqa: E402

    address, town, postcode = _postal_address(
        {
            "Street": "Belle Vue Road",
            "Locality": "z",
            "Address3": "z",
            "Town": "Aldershot",
            "County (name)": "z",
            "Postcode": "GU11 1AA",
        }
    )
    assert address == "Belle Vue Road, Aldershot"
    assert town == "Aldershot"
    assert postcode == "GU11 1AA"


def test_cap_constant_untouched() -> None:
    report = Path(SCRIPTS / "report-seo-coverage.py").read_text(encoding="utf-8")
    assert "DEFAULT_MAX_SCHOOL_PAGES = 5000" in report
    seo = (ROOT / "src" / "lib" / "seoSchools.ts").read_text(encoding="utf-8")
    assert "SEO_DEFAULT_MAX_SCHOOL_PAGES = 5000" in seo
    workflow = ROOT / ".github" / "workflows" / "deploy-pages.yml"
    # This sync must not own the Pages deploy workflow.
    assert workflow.exists()


def main() -> int:
    test_address_placeholders()
    test_phase_scope()
    test_choose_successor_prefers_open()
    test_lifecycle_marks_redirects_and_adds()
    test_same_name_fallback()
    test_parse_row_and_help()
    test_contact_loader_strips_z()
    test_cap_constant_untouched()
    print("PASS test-gias-lifecycle")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
