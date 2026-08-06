"use client";

import { useEffect, useMemo, useState } from "react";
import { loadSchoolsIndex } from "@/lib/data";
import type { SchoolRecord, SchoolsIndex } from "@/lib/types";
import {
  contentIngestAt,
  documentedWebsiteAreas,
  filterAndSortReviewSchools,
  formatIngestLabel,
  looksLikePrecisJunk,
  type ContentReviewFilter,
  type ContentReviewSort,
} from "@/lib/contentReview";
import {
  inspectionHighlights,
  inspectionReportHref,
  inspectionSourceLabel,
  schoolHasInspectionPrecis,
  shortInspectionSummary,
} from "@/lib/inspectionHighlights";
import {
  CORE_AREA_LABELS,
  coverageLevel,
  parentParagraph,
  schoolHasQualitativeCapture,
  shortQualitativeSummary,
} from "@/lib/qualitativeEvidence";

function PrecisPanel({ school }: { school: SchoolRecord }) {
  const has = schoolHasInspectionPrecis(school);
  if (!has) {
    return (
      <section className="content-review-panel">
        <h3>Inspection précis</h3>
        <p className="content-review-empty">No précis / highlights yet.</p>
      </section>
    );
  }

  const inspectorate = inspectionSourceLabel(school.inspectionPrecisSource);
  const precis = school.inspectionPrecis?.trim() || "";
  const junk = looksLikePrecisJunk(precis);
  const summary = shortInspectionSummary(school);
  const { strengths, improvements } = inspectionHighlights(school);
  const href = inspectionReportHref(school);

  return (
    <section className="content-review-panel">
      <header className="content-review-panel-head">
        <h3>Inspection précis</h3>
        <p className="content-review-meta">
          {inspectorate}
          {school.inspectionPrecisEnrichedAt
            ? ` · enriched ${formatIngestLabel(school.inspectionPrecisEnrichedAt)}`
            : ""}
          {junk ? (
            <span className="content-review-flag"> Parent View / chrome?</span>
          ) : null}
        </p>
      </header>
      {junk ? (
        <p className="content-review-warn">
          This précis looks like report end-matter rather than school narrative.
          Prefer a strength line or re-run the précis enricher.
        </p>
      ) : null}
      {precis ? (
        <blockquote className={junk ? "content-review-quote junk" : "content-review-quote"}>
          {precis}
        </blockquote>
      ) : summary ? (
        <p>{summary}</p>
      ) : null}
      {strengths.length ? (
        <div className="content-review-list-block">
          <h4>Strengths</h4>
          <ul>
            {strengths.slice(0, 5).map((q, i) => (
              <li key={`s-${i}`}>{q.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {improvements.length ? (
        <div className="content-review-list-block">
          <h4>Improvements</h4>
          <ul>
            {improvements.slice(0, 5).map((q, i) => (
              <li key={`i-${i}`}>{q.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {href && href !== "#" ? (
        <p className="content-review-links">
          <a href={href} target="_blank" rel="noreferrer">
            Open source report ↗
          </a>
          {school.inspectionReportLabel ? (
            <span> · {school.inspectionReportLabel}</span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

function WebsitePanel({ school }: { school: SchoolRecord }) {
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set());

  if (!schoolHasQualitativeCapture(school)) {
    return (
      <section className="content-review-panel">
        <h3>Website evidence</h3>
        <p className="content-review-empty">No website scan on this school yet.</p>
      </section>
    );
  }

  const capture = school.qualitativeCapture;
  const summary = shortQualitativeSummary(school);

  return (
    <section className="content-review-panel">
      <header className="content-review-panel-head">
        <h3>Website evidence</h3>
        <p className="content-review-meta">
          Scanned {capture.sourcesScanned} page
          {capture.sourcesScanned === 1 ? "" : "s"}
          {capture.assessedAt
            ? ` · assessed ${formatIngestLabel(capture.assessedAt)}`
            : ""}
          {school.qualitativeCaptureEnrichedAt
            ? ` · merged ${formatIngestLabel(school.qualitativeCaptureEnrichedAt)}`
            : ""}
        </p>
      </header>
      {summary ? <p className="content-review-lede">{summary}</p> : null}
      <div className="content-review-areas">
        {capture.areas.map((area) => {
          const cov = coverageLevel(area);
          const open = openAreas.has(area.area);
          const paragraph = parentParagraph(area);
          return (
            <article key={area.area} className="content-review-area">
              <button
                type="button"
                className="content-review-area-toggle"
                aria-expanded={open}
                onClick={() =>
                  setOpenAreas((prev) => {
                    const next = new Set(prev);
                    if (next.has(area.area)) next.delete(area.area);
                    else next.add(area.area);
                    return next;
                  })
                }
              >
                <span>{CORE_AREA_LABELS[area.area] || area.area}</span>
                <span className={`content-review-cov ${cov.className}`}>
                  {cov.label}
                </span>
              </button>
              <p className="content-review-area-para">{paragraph}</p>
              {area.synthesisMethod ? (
                <p className="content-review-meta">
                  Synthesis: {area.synthesisMethod}
                  {area.narrativeSummary ? " · narrative attached" : ""}
                </p>
              ) : null}
              {open ? (
                <ul className="content-review-signals">
                  {(area.signals || []).slice(0, 8).map((sig, i) => (
                    <li key={`${area.area}-${i}`}>
                      <a href={sig.sourceUrl} target="_blank" rel="noreferrer">
                        {sig.pageTitle || sig.sourceUrl}
                      </a>
                      <span className="content-review-signal-text">
                        {sig.text}
                      </span>
                    </li>
                  ))}
                  {!area.signals?.length ? (
                    <li className="content-review-empty">No source excerpts.</li>
                  ) : null}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SchoolDetail({ school }: { school: SchoolRecord }) {
  const ingest = contentIngestAt(school);
  return (
    <div className="content-review-detail">
      <header className="content-review-detail-head">
        <div>
          <h2>{school.name}</h2>
          <p className="content-review-meta">
            URN {school.urn}
            {school.localAuthority ? ` · ${school.localAuthority}` : ""}
            {school.ageRange ? ` · Ages ${school.ageRange}` : ""}
            {school.postcode ? ` · ${school.postcode}` : ""}
          </p>
          <p className="content-review-meta">
            Latest ingest: <strong>{formatIngestLabel(ingest)}</strong>
            {ingest && ingest.length > 10 ? ` (${ingest})` : ""}
          </p>
        </div>
        <div className="content-review-detail-actions">
          {school.schoolWebsite ? (
            <a href={school.schoolWebsite} target="_blank" rel="noreferrer">
              School website ↗
            </a>
          ) : null}
          <a
            href={`/?schools=${encodeURIComponent(school.urn)}#side-by-side`}
          >
            Open in compare
          </a>
        </div>
      </header>
      <div className="content-review-columns">
        <PrecisPanel school={school} />
        <WebsitePanel school={school} />
      </div>
    </div>
  );
}

export function ContentReviewApp() {
  const [index, setIndex] = useState<SchoolsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContentReviewFilter>("both");
  const [sort, setSort] = useState<ContentReviewSort>("ingest-desc");
  const [selectedUrn, setSelectedUrn] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSchoolsIndex(fetch, true)
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load index");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.startsWith("urn-")) setSelectedUrn(hash.slice(4));
  }, []);

  const rows = useMemo(() => {
    if (!index) return [];
    return filterAndSortReviewSchools(index.schools, { filter, sort, query });
  }, [index, filter, sort, query]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedUrn(null);
      return;
    }
    if (!selectedUrn || !rows.some((s) => s.urn === selectedUrn)) {
      setSelectedUrn(rows[0].urn);
    }
  }, [rows, selectedUrn]);

  const selected = rows.find((s) => s.urn === selectedUrn) || null;

  const selectSchool = (school: SchoolRecord) => {
    setSelectedUrn(school.urn);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#urn-${school.urn}`);
    }
  };

  if (error) {
    return <p className="content-review-error">Could not load schools: {error}</p>;
  }
  if (!index) {
    return <p className="content-review-loading">Loading schools index…</p>;
  }

  const withWebsite = index.schools.filter(schoolHasQualitativeCapture).length;
  const withPrecis = index.schools.filter(schoolHasInspectionPrecis).length;

  return (
    <div className="content-review-app">
      <div className="content-review-stats" aria-label="Coverage summary">
        <span>
          <strong>{withPrecis}</strong> with précis
        </span>
        <span>
          <strong>{withWebsite}</strong> with website scan
        </span>
        <span>
          <strong>{rows.length}</strong> in this view
        </span>
      </div>

      <div className="content-review-controls">
        <label className="content-review-field">
          <span className="visually-hidden">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, URN, LA, postcode…"
          />
        </label>
        <label className="content-review-field">
          <span>Show</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ContentReviewFilter)}
          >
            <option value="both">Précis + website</option>
            <option value="website">Website scan</option>
            <option value="precis">Inspection précis</option>
            <option value="any">Either product</option>
            <option value="junk">Flagged précis junk</option>
          </select>
        </label>
        <label className="content-review-field">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ContentReviewSort)}
          >
            <option value="ingest-desc">Ingest date (newest)</option>
            <option value="ingest-asc">Ingest date (oldest)</option>
            <option value="name">Name</option>
            <option value="website-coverage">Website coverage</option>
          </select>
        </label>
      </div>

      <div className="content-review-layout">
        <aside className="content-review-list" aria-label="Schools">
          {rows.length === 0 ? (
            <p className="content-review-empty">No schools match this filter.</p>
          ) : (
            <ul>
              {rows.map((school) => {
                const ingest = contentIngestAt(school);
                const junk = looksLikePrecisJunk(school.inspectionPrecis);
                const active = school.urn === selectedUrn;
                return (
                  <li key={school.urn}>
                    <button
                      type="button"
                      className={
                        active
                          ? "content-review-list-item active"
                          : "content-review-list-item"
                      }
                      onClick={() => selectSchool(school)}
                    >
                      <span className="content-review-list-name">
                        {school.name}
                      </span>
                      <span className="content-review-list-meta">
                        {formatIngestLabel(ingest)}
                        {schoolHasQualitativeCapture(school)
                          ? ` · web ${documentedWebsiteAreas(school)}/6`
                          : ""}
                        {schoolHasInspectionPrecis(school) ? " · précis" : ""}
                        {junk ? " · junk?" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
        <div className="content-review-main" aria-live="polite">
          {selected ? (
            <SchoolDetail key={selected.urn} school={selected} />
          ) : (
            <p className="content-review-empty">Select a school to review.</p>
          )}
        </div>
      </div>
    </div>
  );
}
