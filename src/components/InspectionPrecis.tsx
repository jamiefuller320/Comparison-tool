"use client";

import type { InspectionQuote, SchoolRecord } from "@/lib/types";

function sourceLabel(source?: string | null): string {
  if (source === "isi") return "ISI";
  return "Ofsted";
}

function footnoteHref(school: SchoolRecord, quote?: InspectionQuote): string {
  return (
    quote?.sourceUrl ||
    school.inspectionReportFileUrl ||
    school.isiLatestReportUrl ||
    school.ofstedReportUrl ||
    school.isiProfileUrl ||
    school.isiReportsUrl ||
    "#"
  );
}

/** Compact parent-facing précis with footnote links back to the report PDF. */
export function InspectionPrecis({
  school,
  compact = false,
}: {
  school: SchoolRecord;
  compact?: boolean;
}) {
  const precis = school.inspectionPrecis?.trim();
  const quotes = (school.inspectionQuotes || []).filter((q) => q?.text?.trim());
  if (!precis && quotes.length === 0) return null;

  const label = school.inspectionReportLabel || "Latest inspection report";
  const inspectorate = sourceLabel(school.inspectionPrecisSource);
  const reportHref = footnoteHref(school);

  return (
    <aside
      className={compact ? "inspection-precis compact" : "inspection-precis"}
      aria-label={`${inspectorate} report précis`}
    >
      <p className="inspection-precis-kicker">
        From the latest {inspectorate} report
      </p>
      {precis ? <p className="inspection-precis-body">{precis}</p> : null}
      {quotes.length > 0 ? (
        <ol className="inspection-precis-quotes">
          {quotes.map((quote, index) => {
            const n = index + 1;
            const href = footnoteHref(school, quote);
            return (
              <li key={`${school.urn}-q-${n}`}>
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
      ) : null}
      <p className="inspection-precis-source">
        <a href={reportHref} target="_blank" rel="noreferrer">
          {label} ↗
        </a>
        {quotes.length > 0 ? (
          <span className="inspection-precis-note">
            {" "}
            Quotes are verbatim excerpts; open the PDF to read in context.
          </span>
        ) : (
          <span className="inspection-precis-note">
            {" "}
            Verbatim excerpt; open the PDF to read in context.
          </span>
        )}
      </p>
    </aside>
  );
}
