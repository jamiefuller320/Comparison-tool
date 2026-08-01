"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { InspectionQuote, SchoolRecord } from "@/lib/types";
import {
  inspectionHighlights,
  inspectionReportHref,
  inspectionSourceLabel,
  schoolHasInspectionPrecis,
  shortInspectionSummary,
} from "@/lib/inspectionHighlights";
import { PrecisReadingNote } from "@/components/DecisionGuidance";

function footnoteHref(school: SchoolRecord, quote?: InspectionQuote): string {
  return quote?.sourceUrl || inspectionReportHref(school);
}

function QuoteList({
  school,
  quotes,
}: {
  school: SchoolRecord;
  quotes: InspectionQuote[];
}) {
  if (!quotes.length) return null;
  return (
    <ol className="inspection-precis-quotes">
      {quotes.map((quote, index) => {
        const n = index + 1;
        const href = footnoteHref(school, quote);
        return (
          <li key={`${school.urn}-q-${n}-${quote.text.slice(0, 24)}`}>
            <blockquote>
              <span className="inspection-quote-mark">“</span>
              {quote.text}
              <span className="inspection-quote-mark">”</span>
              <a
                className="inspection-footnote"
                href={href}
                target="_blank"
                rel="noreferrer"
                title={
                  quote.section
                    ? `${quote.section} — open source PDF`
                    : "Open source PDF"
                }
              >
                <sup>{n}</sup>
              </a>
            </blockquote>
          </li>
        );
      })}
    </ol>
  );
}

/** Short cell summary for compare tables (keeps sticky headers slim). */
export function InspectionPrecisSummary({ school }: { school: SchoolRecord }) {
  const summary = shortInspectionSummary(school);
  if (!summary) {
    return <span className="inspection-precis-empty">—</span>;
  }
  const inspectorate = inspectionSourceLabel(school.inspectionPrecisSource);
  return (
    <div className="inspection-precis-summary">
      <p className="inspection-precis-kicker">From {inspectorate}</p>
      <p className="inspection-precis-summary-body">{summary}</p>
    </div>
  );
}

/** Expanded strengths / improvements panel for one setting. */
export function InspectionPrecisDetail({ school }: { school: SchoolRecord }) {
  if (!schoolHasInspectionPrecis(school)) {
    return (
      <aside className="inspection-precis-detail empty">
        <p className="inspection-precis-empty">No report précis yet.</p>
      </aside>
    );
  }

  const inspectorate = inspectionSourceLabel(school.inspectionPrecisSource);
  const label = school.inspectionReportLabel || "Latest inspection report";
  const reportHref = inspectionReportHref(school);
  const { strengths, improvements } = inspectionHighlights(school);
  const precis = school.inspectionPrecis?.trim();

  return (
    <aside
      className="inspection-precis-detail"
      aria-label={`${inspectorate} report précis for ${school.name}`}
    >
      <p className="inspection-precis-detail-name">{school.name}</p>
      <p className="inspection-precis-kicker">
        From the latest {inspectorate} report
      </p>
      {precis ? <p className="inspection-precis-body">{precis}</p> : null}

      {strengths.length ? (
        <div className="inspection-highlight-block">
          <h4>What stands out positively</h4>
          <QuoteList school={school} quotes={strengths} />
        </div>
      ) : null}

      {improvements.length ? (
        <div className="inspection-highlight-block improve">
          <h4>Areas for improvement</h4>
          <QuoteList school={school} quotes={improvements} />
        </div>
      ) : null}

      {!strengths.length && !improvements.length ? (
        <QuoteList school={school} quotes={school.inspectionQuotes || []} />
      ) : null}

      <p className="inspection-precis-source">
        <a href={reportHref} target="_blank" rel="noreferrer">
          {label} ↗
        </a>
        <span className="inspection-precis-note">
          {" "}
          Verbatim excerpts; open the PDF to read in context.
        </span>
      </p>
    </aside>
  );
}

/**
 * Standalone card précis (visit pack / childminder directory) — not used in
 * sticky compare headers.
 */
export function InspectionPrecis({
  school,
  compact = false,
}: {
  school: SchoolRecord;
  compact?: boolean;
}) {
  if (!schoolHasInspectionPrecis(school)) return null;
  return (
    <div className={compact ? "inspection-precis-card compact" : "inspection-precis-card"}>
      <InspectionPrecisDetail school={school} />
    </div>
  );
}

/** Compare-table row: short summaries + expandable detail (like Year trend). */
export function InspectionPrecisRows({
  schools,
}: {
  schools: SchoolRecord[];
}): ReactNode {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLTableRowElement | null>(null);
  const any = schools.some(schoolHasInspectionPrecis);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open]);

  if (!any) return null;

  return (
    <>
      <tr className={open ? "metric-row-active precis-summary-row" : "precis-summary-row"}>
        <th scope="row">
          <button
            type="button"
            className={
              open ? "metric-history-trigger active" : "metric-history-trigger"
            }
            aria-expanded={open}
            aria-controls="inspection-precis-detail"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="metric-history-label">Inspection précis</span>
            <span className="metric-history-cta">
              {open ? "Hide detail" : "Show positives & improvements"}
            </span>
          </button>
          <span className="hint">
            Short summary from the latest Ofsted/ISI report — expand for
            strengths and areas to improve. Use it to prepare visit questions,
            not as a final verdict.
          </span>
        </th>
        {schools.map((school) => (
          <td key={school.urn} className="metric-cell precis-summary-cell">
            <InspectionPrecisSummary school={school} />
          </td>
        ))}
      </tr>
      {open ? (
        <tr className="history-row precis-detail-row" ref={panelRef}>
          <td colSpan={schools.length + 1}>
            <div
              className="history-panel history-panel-inline precis-detail-panel"
              id="inspection-precis-detail"
            >
              <PrecisReadingNote />
              <div className="precis-detail-grid">
                {schools.map((school) => (
                  <InspectionPrecisDetail key={school.urn} school={school} />
                ))}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
