#!/usr/bin/env python3
"""Mocked Search Analytics tests for the weekly Search Console digest job."""

from __future__ import annotations

import base64
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import parse_qsl

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import search_console as sc  # noqa: E402


def load_loop():
    path = SCRIPTS / "run-seo-coverage-loop.py"
    spec = importlib.util.spec_from_file_location("seo_coverage_loop_sc", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def school(
    urn: str,
    *,
    area: str,
    label: str,
    town: str,
    town_slug: str,
    school_type: str,
    region: str,
    precis: bool,
    website: bool,
) -> dict:
    return {
        "area": area,
        "areaLabel": label,
        "town": town,
        "townSlug": town_slug,
        "schoolType": school_type,
        "region": region,
        "hasPrecis": precis,
        "hasWebsiteEvidence": website,
    }


def catalog() -> dict:
    return {
        "schools": {
            "111": school(
                "111",
                area="hampshire",
                label="Hampshire",
                town="Winchester",
                town_slug="winchester",
                school_type="primary",
                region="south-east",
                precis=False,
                website=False,
            ),
            "222": school(
                "222",
                area="lambeth",
                label="Lambeth",
                town="London",
                town_slug="london",
                school_type="primary",
                region="london",
                precis=True,
                website=True,
            ),
            "333": school(
                "333",
                area="hampshire",
                label="Hampshire",
                town="Winchester",
                town_slug="winchester",
                school_type="secondary",
                region="south-east",
                precis=False,
                website=False,
            ),
            "444": school(
                "444",
                area="dorset",
                label="Dorset",
                town="Weymouth",
                town_slug="weymouth",
                school_type="primary",
                region="south-east",
                precis=True,
                website=False,
            ),
        },
        "areas": {
            "hampshire": {"label": "Hampshire", "region": "south-east"},
            "lambeth": {"label": "Lambeth", "region": "london"},
            "dorset": {"label": "Dorset", "region": "south-east"},
        },
        "coverage": {
            "includedAreaSlugs": ["hampshire", "lambeth", "dorset"],
            "maxSchoolPages": 5000,
            "schoolPages": 4948,
        },
        "wiltshire": {
            "slug": "wiltshire",
            "packPresent": True,
            "inCoverage": False,
            "seoOn": False,
            "schoolCount": 274,
            "withPrecis": 56,
            "precisPct": 20.4,
            "recommendation": "keep-off",
            "reasons": ["Pack précis is 20.4% (56/274)."],
        },
        "shardsDir": Path("/tmp/search-console-no-shards"),
    }


def api_rows() -> list[dict]:
    return [
        {
            "keys": ["https://schoolcompass.uk/schools/111"],
            "clicks": 1,
            "impressions": 100,
            "ctr": 0.01,
            "position": 10,
        },
        {
            "keys": ["https://www.schoolcompass.uk/schools/111/?utm=1"],
            "clicks": 0,
            "impressions": 50,
            "ctr": 0,
            "position": 4,
        },
        {
            "keys": ["https://schoolcompass.uk/schools/222/"],
            "clicks": 2,
            "impressions": 80,
            "ctr": 0.025,
            "position": 2,
        },
        {
            "keys": ["http://schoolcompass.uk/schools/333/"],
            "clicks": 0,
            "impressions": 60,
            "ctr": 0,
            "position": 12,
        },
        {
            "keys": ["https://schoolcompass.uk/schools/444/"],
            "clicks": 0,
            "impressions": 200,
            "ctr": 0,
            "position": 15,
        },
        {
            "keys": ["https://schoolcompass.uk/areas/hampshire/towns/winchester/"],
            "clicks": 4,
            "impressions": 40,
            "ctr": 0.1,
            "position": 5,
        },
        {
            "keys": ["https://schoolcompass.uk/areas/hampshire/"],
            "clicks": 1,
            "impressions": 20,
            "ctr": 0.05,
            "position": 6,
        },
        {
            "keys": ["https://schoolcompass.uk/areas/hampshire/primary/"],
            "clicks": 2,
            "impressions": 30,
            "ctr": 0.066,
            "position": 7,
        },
        {
            "keys": ["https://example.com/schools/111/"],
            "clicks": 9,
            "impressions": 5,
            "ctr": 1,
            "position": 1,
        },
    ]


def query_rows() -> list[dict]:
    return [
        {
            "keys": ["school compass"],
            "clicks": 10,
            "impressions": 200,
            "position": 1.5,
        },
        {
            "keys": ["ofsted greenwich primary"],
            "clicks": 2,
            "impressions": 500,
            "position": 8.0,
        },
        {
            "keys": ["compare schools winchester"],
            "clicks": 1,
            "impressions": 120,
            "position": 12.0,
        },
    ]


def page_query_rows() -> list[dict]:
    return [
        {
            "keys": ["https://schoolcompass.uk/schools/111/", "ofsted greenwich primary"],
            "clicks": 1,
            "impressions": 80,
            "position": 9.0,
        },
        {
            "keys": ["https://schoolcompass.uk/schools/222/", "lambeth primary schools"],
            "clicks": 1,
            "impressions": 60,
            "position": 7.0,
        },
    ]


def test_window_and_paths() -> None:
    assert sc.baseline_window() == (date(2026, 9, 7), date(2026, 10, 6))
    assert sc.query_brand_class("School Compass login") == "branded"
    assert sc.query_brand_class("schoolcompass.uk") == "branded"
    assert sc.query_brand_class("ofsted report") == "nonBranded"
    start, end = sc.default_window(date(2026, 11, 8))
    assert (start, end) == (date(2026, 10, 7), date(2026, 11, 5)), (start, end)
    later_start, later_end = sc.default_window(date(2027, 2, 1))
    assert later_end == date(2027, 1, 29)
    assert later_start == later_end - timedelta(days=27)
    assert sc.slugify_town("Bishop's Waltham") == "bishop-s-waltham"
    assert sc.slugify_town("Tower Hamlets") == "tower-hamlets"
    assert sc.canonical_url("https://www.schoolcompass.uk/schools/111")[1] == "/schools/111/"
    host, path = sc.canonical_url("https://example.com/schools/111/")
    assert host is None and "example.com" in path
    assert sc.school_type_key({"phase": "junior", "schoolTypeLabel": "Foundation school"}) == "primary"
    assert sc.school_type_key({"phase": "secondary", "schoolTypeLabel": "Community special school"}) == "special"


def test_mocked_api_segments_and_eviction() -> None:
    report = sc.build_report(
        api_rows(),
        catalog(),
        start=date(2026, 10, 7),
        end=date(2026, 11, 5),
        property_url=sc.DEFAULT_SITE_URL,
        fetched_at="2026-11-08T06:30:00Z",
        evidence_fn=lambda urn: False,
    )
    assert report["status"] == "ok"
    assert report["property"] == "sc-domain:schoolcompass.uk"
    assert report["coversMetaDeploy"] is True
    assert report["apiRows"] == 9
    by_path = {row["path"]: row for row in report["pages"]}
    merged = by_path["/schools/111/"]
    assert merged["impressions"] == 150, merged
    assert merged["clicks"] == 1
    # (10*100 + 4*50) / 150 = 8
    assert merged["position"] == 8.0, merged
    assert merged["area"] == "hampshire"
    assert merged["town"] == "Winchester"
    assert merged["schoolType"] == "primary"
    assert merged["region"] == "south-east"
    assert by_path["/areas/hampshire/towns/winchester/"]["pageKind"] == "town"
    assert by_path["/areas/hampshire/"]["pageKind"] == "area"
    assert by_path["/areas/hampshire/primary/"]["pageKind"] == "stage:primary"
    other = next(row for row in report["pages"] if row["pageKind"] == "other")
    assert other["impressions"] == 5

    areas = {row["key"]: row for row in report["segments"]["area"]}
    # Hampshire school pages: 111 (150) + 333 (60). 444 is Dorset. Hubs are not included.
    assert areas["hampshire"]["impressions"] == 210, areas
    assert areas["hampshire"]["clicks"] == 1
    assert areas["lambeth"]["impressions"] == 80
    assert areas["dorset"]["impressions"] == 200
    towns = {row["key"]: row for row in report["segments"]["town"]}
    assert towns["hampshire/winchester"]["impressions"] == 210, towns
    assert "hampshire/winchester" in towns
    types = {row["key"]: row for row in report["segments"]["schoolType"]}
    # primary: 111 (150) + 222 (80) + 444 (200) = 430 clicks 3
    assert types["primary"]["impressions"] == 430, types
    assert types["primary"]["clicks"] == 3
    assert types["secondary"]["impressions"] == 60
    kinds = {row["key"]: row for row in report["segments"]["pageKind"]}
    assert kinds["town"]["impressions"] == 40
    assert kinds["area"]["impressions"] == 20
    assert kinds["stage:primary"]["impressions"] == 30
    assert kinds["school"]["impressions"] == 150 + 80 + 60 + 200

    decisions = report["decisions"]
    assert decisions["cap"]["raiseCap"] is False
    assert decisions["cap"]["schoolPages"] == 4948
    assert decisions["cap"]["remaining"] == 52
    assert decisions["wiltshire"]["seoOn"] is False
    assert decisions["wiltshire"]["precisPct"] == 20.4
    assert decisions["wiltshire"]["recommendation"] == "keep-off"
    flagged = {row["path"] for row in decisions["evictionReview"]}
    # 333 and 444 are below the South East school CTR, position > 3, thin.
    # 111 is above that segment CTR. 222 is position 2. The town hub is kept.
    assert flagged == {"/schools/333/", "/schools/444/"}, flagged
    assert "/areas/hampshire/towns/winchester/" not in flagged
    assert "/schools/222/" not in flagged
    assert all(row["action"] == "review" for row in decisions["evictionReview"])
    assert by_path["/schools/333/"]["evictionReview"] is True
    assert "evictionReview" not in by_path["/schools/111/"]
    london = decisions["londonSchool"]
    south_east = decisions["southEastSchool"]
    assert london["impressions"] == 80 and london["clicks"] == 2
    assert south_east["impressions"] == 150 + 60 + 200
    assert south_east["clicks"] == 1

    markdown = sc.render_markdown(report)
    assert "### By area (school pages)" in markdown
    assert "### By town (school pages)" in markdown
    assert "### By school type (school pages)" in markdown
    assert "Hampshire" in markdown and "Winchester" in markdown and "Primary" in markdown
    assert "Wiltshire SEO: **off**" in markdown
    assert "Raise cap: **no**" in markdown
    assert "/schools/333/" in markdown


def test_query_segments_and_baseline_comparison() -> None:
    cat = catalog()
    current = sc.build_report(
        api_rows(),
        cat,
        start=date(2026, 10, 7),
        end=date(2026, 11, 5),
        property_url=sc.DEFAULT_SITE_URL,
        fetched_at="2026-11-08T06:30:00Z",
        evidence_fn=lambda urn: False,
    )
    current["queries"] = sc.build_query_tables(
        query_rows(), page_query_rows(), cat
    )
    baseline = sc.build_report(
        [
            {
                "keys": ["https://schoolcompass.uk/schools/111/"],
                "clicks": 0,
                "impressions": 40,
                "position": 15,
            }
        ],
        cat,
        start=date(2026, 9, 7),
        end=date(2026, 10, 6),
        property_url=sc.DEFAULT_SITE_URL,
        fetched_at="2026-09-08T06:30:00Z",
        evidence_fn=lambda urn: False,
    )
    baseline["queries"] = sc.build_query_tables(
        [
            {
                "keys": ["school compass"],
                "clicks": 5,
                "impressions": 50,
                "position": 2,
            },
            {
                "keys": ["random query"],
                "clicks": 0,
                "impressions": 30,
                "position": 20,
            },
        ],
        [],
        cat,
    )
    current["comparison"] = sc.build_comparison(
        current,
        baseline,
        current["queries"],
        baseline["queries"],
        baseline_start=date(2026, 9, 7),
        baseline_end=date(2026, 10, 6),
    )
    q = current["queries"]
    assert len(q["topOverall"]) == 3
    assert q["topOverall"][0]["query"] == "ofsted greenwich primary"
    branded = q["bySegment"]["branded"]
    non_branded = q["bySegment"]["nonBranded"]
    assert branded["impressions"] == 200
    assert non_branded["impressions"] == 620
    london = q["bySegment"]["regionSchool:london"]
    assert london["impressions"] == 60
    assert len(london["topQueries"]) == 1
    cmp_tot = current["comparison"]["totals"]
    assert cmp_tot["current"]["impressions"] > cmp_tot["baseline"]["impressions"]
    assert current["comparison"]["baselineStartDate"] == "2026-09-07"
    md = sc.render_markdown(current)
    assert "### Top queries (current window)" in md
    assert "### Baseline comparison" in md
    assert "nonBranded" in md or "Non-branded" in md


def test_pagination_and_signed_jwt() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        key_path = Path(tmp) / "key.pem"
        pub_path = Path(tmp) / "pub.pem"
        sig_path = Path(tmp) / "sig.bin"
        subprocess.run(
            ["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048", "-out", str(key_path)],
            capture_output=True,
            check=True,
        )
        subprocess.run(
            ["openssl", "pkey", "-in", str(key_path), "-pubout", "-out", str(pub_path)],
            capture_output=True,
            check=True,
        )
        key = key_path.read_text(encoding="utf-8")
        _assert_signed_query(key, pub_path, sig_path)


def _assert_signed_query(key: str, pub_path: Path, sig_path: Path) -> None:
    account = {
        "client_email": "search-console@school-compass.iam.gserviceaccount.com",
        "private_key": key,
        "token_uri": "https://oauth2.googleapis.com/token",
    }
    seen: list[dict] = []

    def http(url: str, body, headers: dict) -> dict:
        if url.endswith("/token"):
            assert headers["Content-Type"] == "application/x-www-form-urlencoded"
            parsed = dict(parse_qsl(body.decode()))
            assertion = parsed["assertion"]
            header_b64, claims_b64, sig_b64 = assertion.split(".")
            claims = json.loads(_b64decode(claims_b64))
            assert claims["iss"] == account["client_email"]
            assert claims["scope"] == sc.SCOPE
            assert claims["aud"] == account["token_uri"]
            signing_input = f"{header_b64}.{claims_b64}".encode()
            sig_path.write_bytes(_b64decode(sig_b64))
            verified = subprocess.run(
                [
                    "openssl",
                    "dgst",
                    "-sha256",
                    "-verify",
                    str(pub_path),
                    "-signature",
                    str(sig_path),
                ],
                input=signing_input,
                capture_output=True,
                check=False,
            )
            assert verified.returncode == 0, verified.stderr.decode()
            assert "PRIVATE" not in url
            return {"access_token": "ya29.mock-token"}
        seen.append(body if isinstance(body, dict) else json.loads(body))
        assert headers["Authorization"] == "Bearer ya29.mock-token"
        start_row = seen[-1]["startRow"]
        assert seen[-1]["dimensions"] == ["page"]
        assert seen[-1]["aggregationType"] == "byPage"
        assert "sc-domain%3Aschoolcompass.uk" in url
        if start_row == 0:
            return {
                "rows": [
                    {
                        "keys": ["https://schoolcompass.uk/schools/111/"],
                        "clicks": 1,
                        "impressions": 10,
                        "position": 4,
                    },
                    {
                        "keys": ["https://schoolcompass.uk/schools/222/"],
                        "clicks": 0,
                        "impressions": 10,
                        "position": 9,
                    },
                ]
            }
        return {
            "rows": [
                {
                    "keys": ["https://schoolcompass.uk/areas/lambeth/"],
                    "clicks": 3,
                    "impressions": 12,
                    "position": 6,
                }
            ]
        }

    token = sc.fetch_access_token(account, http=http, now=1_700_000_000)
    assert token == "ya29.mock-token"
    rows = sc.query_pages(
        token,
        site=sc.DEFAULT_SITE_URL,
        start=date(2026, 10, 7),
        end=date(2026, 11, 5),
        http=http,
        row_limit=2,
    )
    assert len(rows) == 3, rows
    assert len(seen) == 2
    assert seen[1]["startRow"] == 2


def _b64decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def test_skip_and_invalid_secret_do_not_leak_or_write() -> None:
    script = SCRIPTS / "search_console.py"
    with tempfile.TemporaryDirectory() as tmp:
        latest = Path(tmp) / "latest.json"
        env = os.environ.copy()
        env.pop(sc.SECRET_ENV, None)
        env["SEARCH_CONSOLE_LATEST"] = str(latest)
        env["SEO_DIGEST_JSON"] = str(Path(tmp) / "digest.json")
        env["SEO_DIGEST_MD"] = str(Path(tmp) / "digest.md")
        skipped = subprocess.run(
            [sys.executable, str(script)],
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        assert skipped.returncode == 0, skipped.stderr
        assert "NOTICE:" in skipped.stdout
        assert "GSC_SERVICE_ACCOUNT_JSON" in skipped.stdout
        assert not latest.exists()
        assert not Path(env["SEO_DIGEST_JSON"]).exists()

        env[sc.SECRET_ENV] = "SUPER-SECRET-KEY-MATERIAL"
        failed = subprocess.run(
            [sys.executable, str(script)],
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        assert failed.returncode == 1, failed.stdout
        combined = failed.stdout + failed.stderr
        assert "SUPER-SECRET-KEY-MATERIAL" not in combined
        assert "not valid JSON" in failed.stderr
        assert not latest.exists()


def test_fixture_merges_into_existing_digest() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        fixture = root / "rows.json"
        fixture.write_text(
            json.dumps(
                {
                    "pages": api_rows(),
                    "queries": query_rows(),
                    "pageQueries": page_query_rows(),
                    "baseline": {
                        "pages": api_rows()[:2],
                        "queries": query_rows()[:1],
                    },
                }
            ),
            encoding="utf-8",
        )
        digest_json = root / "seo-coverage-loop-latest.json"
        digest_md = root / "seo-coverage-loop-latest.md"
        digest_json.write_text(
            json.dumps({"generatedAt": "2026-10-30T13:53:36Z", "added": []}) + "\n",
            encoding="utf-8",
        )
        digest_md.write_text("# SEO coverage loop\n\n- Added areas: **0**\n", encoding="utf-8")
        os.environ["SEARCH_CONSOLE_LATEST"] = str(root / "search-console-latest.json")
        os.environ["SEO_DIGEST_JSON"] = str(digest_json)
        os.environ["SEO_DIGEST_MD"] = str(digest_md)
        try:
            report = sc.run_fetch(fixture=fixture, catalog=catalog())
        finally:
            os.environ.pop("SEARCH_CONSOLE_LATEST", None)
            os.environ.pop("SEO_DIGEST_JSON", None)
            os.environ.pop("SEO_DIGEST_MD", None)
        assert report is not None
        saved = json.loads(digest_json.read_text(encoding="utf-8"))
        assert saved["generatedAt"] == "2026-10-30T13:53:36Z"
        assert saved["added"] == []
        assert saved["searchConsole"]["segments"]["schoolType"]
        assert saved["searchConsole"]["pages"]
        text = digest_md.read_text(encoding="utf-8")
        assert text.startswith("# SEO coverage loop")
        assert "### By school type (school pages)" in text
        sc.merge_into_digest(report, digest_json=digest_json, digest_md=digest_md)
        again = digest_md.read_text(encoding="utf-8")
        assert again.count("## Search Console") == 1
        latest = json.loads((root / "search-console-latest.json").read_text(encoding="utf-8"))
        assert latest["pageCount"] == report["pageCount"]
        assert report.get("queries", {}).get("topOverall")
        assert report.get("comparison", {}).get("totals")


def test_catalog_and_coverage_loop_keep_the_read() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        data = root / "public" / "data"
        data.mkdir(parents=True)
        (data / "seo-coverage.json").write_text(
            json.dumps(
                {
                    "includedAreaSlugs": ["hampshire"],
                    "pageBudget": {"maxSchoolPages": 5000, "maxTownPages": 160},
                    "stats": {"schoolPages": 2},
                }
            ),
            encoding="utf-8",
        )
        (data / "schools-index.json").write_text(
            json.dumps(
                {
                    "schools": [
                        {
                            "urn": "1",
                            "localAuthority": "Hampshire",
                            "town": "Winchester",
                            "phase": "junior",
                            "schoolTypeLabel": "Community school",
                            "inspectionPrecis": "A short précis.",
                        },
                        {
                            "urn": "2",
                            "localAuthority": "Hampshire",
                            "town": "",
                            "phase": "secondary",
                            "schoolTypeLabel": "Academy converter",
                            "closed": True,
                        },
                    ]
                }
            ),
            encoding="utf-8",
        )
        pack = data / "packs" / "wiltshire"
        pack.mkdir(parents=True)
        (pack / "schools-index.json").write_text(
            json.dumps(
                {
                    "schools": [
                        {"urn": "9", "localAuthority": "Wiltshire", "town": "Salisbury", "inspectionPrecis": "Yes"},
                        {"urn": "8", "localAuthority": "Wiltshire", "town": "Trowbridge", "inspectionPrecis": ""},
                    ]
                }
            ),
            encoding="utf-8",
        )
        loaded = sc.load_catalog(root)
        assert loaded["schools"]["1"]["schoolType"] == "primary"
        assert loaded["schools"]["1"]["town"] == "Winchester"
        assert loaded["schools"]["1"]["hasPrecis"] is True
        assert "2" not in loaded["schools"]
        assert loaded["areas"]["hampshire"]["region"] == "south-east"
        assert loaded["wiltshire"]["precisPct"] == 50.0
        assert loaded["wiltshire"]["inCoverage"] is False
        assert loaded["wiltshire"]["recommendation"] == "keep-off"
        assert loaded["coverage"]["schoolPages"] == 2

        latest = root / "search-console-latest.json"
        report = sc.build_report(
            [
                {
                    "keys": ["https://schoolcompass.uk/schools/1/"],
                    "clicks": 1,
                    "impressions": 80,
                    "position": 9,
                }
            ],
            loaded,
            start=date(2026, 10, 7),
            end=date(2026, 11, 5),
            property_url=sc.DEFAULT_SITE_URL,
            fetched_at="2026-11-08T06:30:00Z",
            evidence_fn=lambda urn: False,
        )
        latest.write_text(json.dumps(report), encoding="utf-8")
        os.environ["SEARCH_CONSOLE_LATEST"] = str(latest)
        loop = load_loop()
        loop.DIGEST_JSON = root / "digest.json"
        loop.DIGEST_MD = root / "digest.md"
        before = {
            "totals": {
                "schoolPages": 2,
                "townPages": 1,
                "townHubs": 1,
            }
        }
        after = {
            "totals": {
                "schoolPages": 2,
                "townPages": 1,
                "townHubs": 1,
                "schoolBudgetRemaining": 4998,
                "townBudgetRemaining": 159,
                "schoolBudgetUsedPct": 0.0,
            },
            "pageBudget": {"maxSchoolPages": 5000, "maxTownPages": 160},
            "policy": {"townMinSchools": 8},
            "included": [],
            "candidates": [],
            "includedAreaSlugs": ["hampshire"],
        }
        try:
            loop.write_digest(
                before=before,
                after=after,
                added=[],
                dry_run=True,
                interest_by_slug={},
            )
        finally:
            os.environ.pop("SEARCH_CONSOLE_LATEST", None)
        digest = json.loads(loop.DIGEST_JSON.read_text(encoding="utf-8"))
        assert digest["searchConsole"]["status"] == "ok"
        assert digest["searchConsole"]["segments"]["area"][0]["key"] == "hampshire"
        markdown = loop.DIGEST_MD.read_text(encoding="utf-8")
        assert "# SEO coverage loop" in markdown
        assert "## Search Console" in markdown
        assert "Hampshire" in markdown


def test_workflow_secret_is_env_only() -> None:
    text = (ROOT / ".github" / "workflows" / "search-console.yml").read_text(encoding="utf-8")
    assert "GSC_SERVICE_ACCOUNT_JSON: ${{ secrets.GSC_SERVICE_ACCOUNT_JSON }}" in text
    assert "cron:" in text and "* * 4" in text
    run_blocks = text.split("run:", 1)[1]
    assert "secrets." not in run_blocks
    assert "GSC_SERVICE_ACCOUNT_JSON" not in run_blocks


def test_publishable_evidence_gate() -> None:
    narrative = "A" * 90
    signal = "B" * 60
    assert sc.publishable_website_evidence(
        {
            "areas": [
                {
                    "score": 80,
                    "confidence": 0.8,
                    "narrativeSummary": narrative,
                    "signals": [{"text": signal}],
                }
            ]
        }
    )
    assert not sc.publishable_website_evidence(
        {
            "areas": [
                {
                    "score": 10,
                    "confidence": 0.2,
                    "narrativeSummary": narrative,
                    "signals": [{"text": signal}],
                }
            ]
        }
    )
    assert not sc.publishable_website_evidence(
        {
            "areas": [
                {
                    "score": 80,
                    "confidence": 0.9,
                    "narrativeSummary": "We did not find much about curriculum on the pages scanned for this school today.",
                    "signals": [{"text": signal}],
                }
            ]
        }
    )


def main() -> int:
    tests = [
        test_window_and_paths,
        test_mocked_api_segments_and_eviction,
        test_query_segments_and_baseline_comparison,
        test_pagination_and_signed_jwt,
        test_skip_and_invalid_secret_do_not_leak_or_write,
        test_fixture_merges_into_existing_digest,
        test_catalog_and_coverage_loop_keep_the_read,
        test_workflow_secret_is_env_only,
        test_publishable_evidence_gate,
    ]
    for test in tests:
        test()
        print(f"ok {test.__name__}")
    print("PASS test-search-console")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
