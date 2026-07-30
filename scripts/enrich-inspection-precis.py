#!/usr/bin/env python3
"""Enrich school / EY / childminder indexes with Ofsted/ISI report précis.

Deterministic verbatim excerpts only — no LLM paraphrasing. Each précis and
quote footnotes back to the source PDF URL.

Usage:
  pip install -r requirements-data.txt
  python3 scripts/enrich-inspection-precis.py
  python3 scripts/enrich-inspection-precis.py --limit 80
  python3 scripts/enrich-inspection-precis.py --ey --limit 40
  python3 scripts/enrich-inspection-precis.py --childminders --limit 40
  python3 scripts/enrich-inspection-precis.py --la "Isle of Wight" \\
    --index public/data/packs/isle-of-wight/schools-index.json --limit 60
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from inspection_precis_lib import (  # noqa: E402
    UA,
    clear_precis_fields,
    extract_isi_precis,
    extract_ofsted_precis,
    normalize_ofsted_provider_url,
    parse_ofsted_provider_latest_report,
)
from seed_scope import (  # noqa: E402
    filter_schools_to_la,
    normalize_la_name,
    resolve_index_bundle,
)

DEFAULT_INDEX = ROOT / "public" / "data" / "schools-index.json"
DEFAULT_EY = ROOT / "public" / "data" / "ey-providers-index.json"
DEFAULT_CM = ROOT / "public" / "data" / "childminders-index.json"


def get_bytes(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def pdf_text_from_bytes(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(
            "Missing pypdf. Install with: pip install -r requirements-data.txt"
        ) from exc
    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages[:12]:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def enrich_ofsted_record(record: dict, *, today: str) -> bool:
    """Attach précis fields from the latest Ofsted PDF. Returns True on success."""
    provider_url = normalize_ofsted_provider_url(record)
    if not provider_url:
        return False
    try:
        html = get_bytes(provider_url).decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return False
    latest = parse_ofsted_provider_latest_report(html)
    if not latest:
        return False
    file_url = latest["inspectionReportFileUrl"]
    try:
        pdf = get_bytes(file_url)
        text = pdf_text_from_bytes(pdf)
    except Exception:  # noqa: BLE001
        return False
    extracted = extract_ofsted_precis(text, file_url)
    if not extracted:
        return False
    clear_precis_fields(record)
    record.update(extracted)
    record["inspectionReportFileUrl"] = file_url
    record["inspectionReportLabel"] = latest["inspectionReportLabel"]
    record["inspectionPrecisEnrichedAt"] = today
    # Prefer the stable provider page as the clickable report home.
    if not record.get("ofstedReportUrl"):
        record["ofstedReportUrl"] = provider_url
    return True


def enrich_isi_record(record: dict, *, today: str) -> bool:
    file_url = (record.get("isiLatestReportUrl") or "").strip()
    if not file_url:
        return False
    try:
        pdf = get_bytes(file_url)
        text = pdf_text_from_bytes(pdf)
    except Exception:  # noqa: BLE001
        return False
    extracted = extract_isi_precis(text, file_url)
    if not extracted:
        return False
    clear_precis_fields(record)
    record.update(extracted)
    record["inspectionReportFileUrl"] = file_url
    label = record.get("isiLatestReportTitle") or "ISI inspection report"
    if record.get("isiLatestReportDate"):
        label = f"{label} · {record['isiLatestReportDate']}"
    record["inspectionReportLabel"] = label
    record["inspectionPrecisEnrichedAt"] = today
    return True


def should_try_isi(record: dict) -> bool:
    name = (record.get("inspectorateName") or record.get("ofstedInspectorate") or "").upper()
    return "ISI" in name or bool(record.get("isiLatestReportUrl"))


def enrich_records(
    records: list[dict],
    *,
    limit: int,
    sleep_s: float,
    prefer_isi: bool,
) -> tuple[int, int, int]:
    """Returns (attempted, ofsted_ok, isi_ok)."""
    today = time.strftime("%Y-%m-%d")
    attempted = 0
    ofsted_ok = 0
    isi_ok = 0
    for record in records:
        if limit > 0 and attempted >= limit:
            break
        # Skip records that already have a fresh précis for the same source file
        # unless fields are empty — always try when missing.
        if record.get("inspectionPrecis") and record.get("inspectionQuotes"):
            continue
        attempted += 1
        ok = False
        if prefer_isi and should_try_isi(record):
            ok = enrich_isi_record(record, today=today)
            if ok:
                isi_ok += 1
        if not ok and (record.get("ofstedReportUrl") or record.get("ofstedUrn") or record.get("urn")):
            # Do not hit Ofsted for pure ISI schools without an Ofsted URL.
            if should_try_isi(record) and not record.get("ofstedReportUrl"):
                if not ok:
                    ok = enrich_isi_record(record, today=today)
                    if ok:
                        isi_ok += 1
            else:
                ok = enrich_ofsted_record(record, today=today)
                if ok:
                    ofsted_ok += 1
                elif should_try_isi(record):
                    ok = enrich_isi_record(record, today=today)
                    if ok:
                        isi_ok += 1
        if sleep_s > 0:
            time.sleep(sleep_s)
        if attempted % 10 == 0:
            print(
                f"  … {attempted} attempted ({ofsted_ok} Ofsted, {isi_ok} ISI)",
                flush=True,
            )
    return attempted, ofsted_ok, isi_ok


def prioritize_records(records: list[dict]) -> list[dict]:
    """Prefer ISI (scarce) then schools missing précis that have report URLs."""
    isi = []
    ofsted = []
    other = []
    for r in records:
        if r.get("inspectionPrecis"):
            continue
        if should_try_isi(r) and r.get("isiLatestReportUrl"):
            isi.append(r)
        elif r.get("ofstedReportUrl") or r.get("ofstedUrn"):
            ofsted.append(r)
        else:
            other.append(r)
    return isi + ofsted + other


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", default=str(DEFAULT_INDEX.relative_to(ROOT)))
    parser.add_argument("--ey", action="store_true", help="Enrich ey-providers-index.json")
    parser.add_argument(
        "--childminders",
        action="store_true",
        help="Enrich childminders-index.json",
    )
    parser.add_argument("--ey-index", default="")
    parser.add_argument("--cm-index", default="")
    parser.add_argument("--la", default="", help="Optional LA filter for schools list")
    parser.add_argument(
        "--limit",
        type=int,
        default=120,
        help="Max records to fetch this run (0 = no cap; default 120)",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.15,
        help="Pause between providers (seconds)",
    )
    args = parser.parse_args()

    today = time.strftime("%Y-%m-%d")
    target_la = normalize_la_name(args.la) if args.la else ""

    if args.ey or args.childminders:
        if args.ey:
            ey_path = Path(args.ey_index) if args.ey_index else DEFAULT_EY
            if not ey_path.is_absolute():
                ey_path = ROOT / ey_path
            if not ey_path.exists():
                raise SystemExit(f"Missing {ey_path}")
            payload = load_json(ey_path)
            providers = payload.get("providers") or []
            if target_la:
                providers = filter_schools_to_la(providers, target_la)
            ordered = prioritize_records(providers)
            print(f"EY providers to consider: {len(ordered)}; limit={args.limit}", flush=True)
            attempted, ofsted_ok, isi_ok = enrich_records(
                ordered, limit=args.limit, sleep_s=args.sleep, prefer_isi=False
            )
            # Write back onto original list by URN
            by_urn = {str(p.get("urn")): p for p in ordered}
            for p in payload.get("providers") or []:
                fresh = by_urn.get(str(p.get("urn")))
                if not fresh:
                    continue
                for key in (
                    "inspectionPrecis",
                    "inspectionQuotes",
                    "inspectionReportFileUrl",
                    "inspectionReportLabel",
                    "inspectionPrecisSource",
                    "inspectionPrecisEnrichedAt",
                    "ofstedReportUrl",
                ):
                    if key in fresh:
                        p[key] = fresh[key]
            stats = payload.setdefault("stats", {})
            stats["withInspectionPrecis"] = sum(
                1 for p in (payload.get("providers") or []) if p.get("inspectionPrecis")
            )
            stats["inspectionPrecisEnrichedAt"] = today
            save_json(ey_path, payload)
            print(
                f"Done EY. attempted {attempted}; Ofsted {ofsted_ok}; "
                f"with précis {stats['withInspectionPrecis']}",
                flush=True,
            )

        if args.childminders:
            cm_path = Path(args.cm_index) if args.cm_index else DEFAULT_CM
            if not cm_path.is_absolute():
                cm_path = ROOT / cm_path
            if not cm_path.exists():
                raise SystemExit(f"Missing {cm_path}")
            payload = load_json(cm_path)
            providers = payload.get("providers") or []
            if target_la:
                providers = filter_schools_to_la(providers, target_la)
            ordered = prioritize_records(providers)
            print(
                f"Childminders to consider: {len(ordered)}; limit={args.limit}",
                flush=True,
            )
            attempted, ofsted_ok, isi_ok = enrich_records(
                ordered, limit=args.limit, sleep_s=args.sleep, prefer_isi=False
            )
            by_urn = {str(p.get("urn")): p for p in ordered}
            for p in payload.get("providers") or []:
                fresh = by_urn.get(str(p.get("urn")))
                if not fresh:
                    continue
                for key in (
                    "inspectionPrecis",
                    "inspectionQuotes",
                    "inspectionReportFileUrl",
                    "inspectionReportLabel",
                    "inspectionPrecisSource",
                    "inspectionPrecisEnrichedAt",
                    "ofstedReportUrl",
                ):
                    if key in fresh:
                        p[key] = fresh[key]
            stats = payload.setdefault("stats", {})
            stats["withInspectionPrecis"] = sum(
                1 for p in (payload.get("providers") or []) if p.get("inspectionPrecis")
            )
            stats["inspectionPrecisEnrichedAt"] = today
            save_json(cm_path, payload)
            print(
                f"Done childminders. attempted {attempted}; Ofsted {ofsted_ok}; "
                f"with précis {stats['withInspectionPrecis']}",
                flush=True,
            )
        return

    paths = resolve_index_bundle(args.index, ROOT)
    index_path = paths["index"]
    if not index_path.exists():
        raise SystemExit(f"Missing {index_path}")
    payload = load_json(index_path)
    schools = payload.get("schools") or []
    if target_la:
        schools = filter_schools_to_la(schools, target_la)
        # Keep full payload schools; enrich matching URNs in place.
    ordered = prioritize_records(schools if target_la else payload.get("schools") or [])
    # When LA filtered, ordered is the filtered list but we must mutate payload schools.
    print(
        f"Schools missing précis: {len(ordered)}; limit={args.limit}"
        + (f"; scope={target_la}" if target_la else ""),
        flush=True,
    )
    attempted, ofsted_ok, isi_ok = enrich_records(
        ordered, limit=args.limit, sleep_s=args.sleep, prefer_isi=True
    )
    by_urn = {str(s.get("urn")): s for s in ordered}
    for school in payload.get("schools") or []:
        fresh = by_urn.get(str(school.get("urn")))
        if not fresh:
            continue
        for key in (
            "inspectionPrecis",
            "inspectionQuotes",
            "inspectionReportFileUrl",
            "inspectionReportLabel",
            "inspectionPrecisSource",
            "inspectionPrecisEnrichedAt",
            "ofstedReportUrl",
        ):
            if key in fresh:
                school[key] = fresh[key]

    stats = payload.setdefault("stats", {})
    stats["withInspectionPrecis"] = sum(
        1 for s in (payload.get("schools") or []) if s.get("inspectionPrecis")
    )
    stats["inspectionPrecisEnrichedAt"] = today
    source = payload.setdefault("source", {})
    note = source.get("note") or ""
    extra = (
        " Inspection précis fields are verbatim excerpts from the latest Ofsted "
        "or ISI report PDF, with footnote links to the source file."
    )
    if "Inspection précis fields" not in note:
        source["note"] = (note.rstrip() + extra).strip()

    save_json(index_path, payload)

    directory_path = paths["directory"]
    if directory_path.exists():
        directory = load_json(directory_path)
        full_by = {str(s.get("urn")): s for s in payload.get("schools") or []}
        for row in directory.get("schools") or []:
            full = full_by.get(str(row.get("urn") or ""))
            if not full or not full.get("inspectionPrecis"):
                continue
            row["inspectionPrecis"] = full["inspectionPrecis"]
            if full.get("inspectionReportFileUrl"):
                row["inspectionReportFileUrl"] = full["inspectionReportFileUrl"]
            if full.get("inspectionPrecisSource"):
                row["inspectionPrecisSource"] = full["inspectionPrecisSource"]
        save_json(directory_path, directory)

    summary_path = paths["summary"]
    summary = {
        "withInspectionPrecis": stats["withInspectionPrecis"],
        "inspectionPrecisEnrichedAt": today,
    }
    if summary_path.exists():
        try:
            existing = load_json(summary_path)
            existing.update(summary)
            summary = existing
        except json.JSONDecodeError:
            pass
        summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    print(
        f"Done schools. attempted {attempted}; Ofsted {ofsted_ok}; ISI {isi_ok}; "
        f"with précis {stats['withInspectionPrecis']}",
        flush=True,
    )


if __name__ == "__main__":
    main()
