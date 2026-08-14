"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  computePrintNoteHeightPx,
  guidancePathForPack,
  questionsForKind,
  toVisitContactRow,
  type VisitContactRow,
  type VisitPackKind,
} from "@/lib/visitPack";
import { printVisitPackElement } from "@/lib/printVisitPack";
import { FEEDBACK_PRINTED_EVENT } from "@/lib/productFeedback";
import {
  loadVisitLog,
  saveVisitLog,
  upsertVisitLogEntry,
  VISIT_STATUS_OPTIONS,
  visitStatusLabel,
  type VisitLogEntry,
  type VisitStatusId,
} from "@/lib/visitLog";
import { DecisionGuidancePrintBlock } from "@/components/DecisionGuidance";
import { SaveShortlistPrompt } from "@/components/SaveShortlistPrompt";
import { SchoolOutboundLinks } from "@/components/SchoolOutboundLinks";
import { BRAND_NAME } from "@/lib/brand";
import type { GuidancePathId } from "@/lib/decisionGuidance";
import type { PhaseId } from "@/lib/phases";
import type { SectorId } from "@/lib/sectors";
import {
  buildPrintChartSeries,
  buildPrintCompareTable,
  type PrintCompareTable,
} from "@/lib/printPackMetrics";
import {
  inspectionHighlights,
  inspectionReportHref,
  inspectionSourceLabel,
  looksLikeInspectionPrecisJunk,
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
import { PrintPackChart } from "@/components/PrintPackChart";
import type { InspectionQuote, QualitativeSubjectArea } from "@/lib/types";

function QuestionBlock({
  kind,
  title,
}: {
  kind: VisitPackKind;
  title: string;
}) {
  const questions = questionsForKind(kind);
  return (
    <section className="visit-questions">
      <h4>{title}</h4>
      <ol>
        {questions.map((item) => (
          <li key={item.id}>
            <div className="visit-question-check" aria-hidden>
              □
            </div>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <div className="visit-answer-line" aria-hidden />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PrintFiguresTable({ table }: { table: PrintCompareTable }) {
  return (
    <section className="visit-pack-figures">
      <h3 className="compare-subhead">{table.title}</h3>
      <p className="visit-pack-figures-caption">{table.caption}</p>
      <div className="visit-pack-figures-scroll">
        <table className="visit-pack-compare-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              {table.columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, i) => (
                  <td key={`${row.id}-${i}`}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScreenStatusRow({
  row,
  entry,
  onStatus,
  onNote,
}: {
  row: VisitContactRow;
  entry: VisitLogEntry;
  onStatus: (status: VisitStatusId) => void;
  onNote: (note: string) => void;
}) {
  return (
    <article className="visit-status-row no-print">
      <div>
        <h4>{row.name}</h4>
        <p className="visit-contact-meta">
          {row.kindLabel}
          {row.addressLine ? ` · ${row.addressLine}` : null}
        </p>
        {row.contactRows?.length ? (
          <ul className="visit-contact-lines no-print">
            {row.contactRows.map((line) => (
              <li key={`${line.role}-${line.label}-${line.value}`}>
                <strong>{line.label}:</strong> {line.value}
                {line.sourceUrl ? (
                  <>
                    {" "}
                    <a href={line.sourceUrl} target="_blank" rel="noopener noreferrer">
                      source
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <label className="visit-status">
        <span className="visually-hidden">Contact status</span>
        <select
          value={entry.status}
          onChange={(e) => onStatus(e.target.value as VisitStatusId)}
        >
          {VISIT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="visit-note">
        <span>Notes (also print)</span>
        <textarea
          rows={2}
          value={entry.note ?? ""}
          placeholder="Impressions, questions, gut feel…"
          onChange={(e) => onNote(e.target.value)}
        />
      </label>
    </article>
  );
}

function PrintQuoteList({
  schoolName,
  quotes,
  heading,
}: {
  schoolName: string;
  quotes: InspectionQuote[];
  heading: string;
}) {
  if (!quotes.length) return null;
  return (
    <div className="visit-pack-quote-block">
      <h6>{heading}</h6>
      <ol className="visit-pack-quotes">
        {quotes.slice(0, 4).map((quote, index) => (
          <li key={`${schoolName}-${heading}-${index}-${quote.text.slice(0, 20)}`}>
            <blockquote>
              “{quote.text}”
              {quote.section ? (
                <span className="visit-pack-quote-section"> — {quote.section}</span>
              ) : null}
            </blockquote>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WebsiteEvidencePrint({ school }: { school: SchoolRecord }) {
  if (!schoolHasQualitativeCapture(school)) {
    return (
      <section className="visit-pack-school-website">
        <h5>Website evidence</h5>
        <p className="visit-pack-school-empty">
          No website scan on this shortlist yet — check the school site before
          you visit, or wait for the daily qualitative loop to enrich it.
        </p>
      </section>
    );
  }

  const summary = shortQualitativeSummary(school);
  const areas = (school.qualitativeCapture.areas || []).filter(
    (a) => coverageLevel(a).id !== "none",
  );

  return (
    <section className="visit-pack-school-website">
      <h5>Website evidence</h5>
      {summary ? <p className="visit-pack-school-summary">{summary}</p> : null}
      {areas.map((area) => {
        const label =
          CORE_AREA_LABELS[area.area as QualitativeSubjectArea] || area.area;
        const cov = coverageLevel(area);
        const paragraph = parentParagraph(area);
        const offerings = (area.offerings || []).slice(0, 8);
        return (
          <div className="visit-pack-website-area" key={area.area}>
            <p className="visit-pack-website-area-head">
              <strong>{label}</strong>
              <span className={`visit-pack-cov ${cov.className}`}>
                {cov.label}
              </span>
            </p>
            <p className="visit-pack-school-body">{paragraph}</p>
            {offerings.length ? (
              <p className="visit-pack-school-bullets">
                <strong>Listed:</strong> {offerings.join(" · ")}
              </p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function SchoolNotesPage({
  school,
  row,
  entry,
}: {
  school: SchoolRecord;
  row: VisitContactRow;
  entry: VisitLogEntry;
}) {
  const hasPrecis = schoolHasInspectionPrecis(school);
  const summary = shortInspectionSummary(school);
  const { strengths, improvements } = inspectionHighlights(school);
  const inspectorate = inspectionSourceLabel(school.inspectionPrecisSource);
  const rawPrecis = school.inspectionPrecis?.trim();
  const precis =
    rawPrecis && !looksLikeInspectionPrecisJunk(rawPrecis) ? rawPrecis : null;
  const reportHref = inspectionReportHref(school);
  const hasWebsite = schoolHasQualitativeCapture(school);
  const compactNotes = hasPrecis || hasWebsite;

  return (
    <article className="visit-pack-school">
      <header className="visit-pack-school-head">
        <div>
          <h4>{row.name}</h4>
          <p className="visit-contact-meta">
            {[row.kindLabel, row.ageRange ? `Ages ${row.ageRange}` : null]
              .filter(Boolean)
              .join(" · ")}
            {row.ofstedOverall ? ` · Ofsted ${row.ofstedOverall}` : null}
            {row.ofstedEarlyYearsProvision
              ? ` · EY ${row.ofstedEarlyYearsProvision}`
              : null}
          </p>
          <p className="visit-address">{row.addressLine}</p>
          {row.contactRows?.length ? (
            <ul className="visit-contact-lines">
              {row.contactRows.map((line) => (
                <li key={`${line.role}-${line.label}-${line.value}`}>
                  <strong>{line.label}:</strong> {line.value}
                  {line.sourceUrl ? (
                    <>
                      {" "}
                      <span className="visit-contact-source">
                        (
                        <a
                          href={line.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {line.sourceType?.replaceAll("-", " ") || "source"}
                        </a>
                        )
                      </span>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="visit-contact-meta">
            {[row.localAuthority, row.ofstedInspectionDate]
              .filter(Boolean)
              .join(" · ")}
            {entry.status !== "none"
              ? ` · Status: ${visitStatusLabel(entry.status)}`
              : null}
          </p>
          <SchoolOutboundLinks school={school} includeInspection />
        </div>
      </header>

      <section className="visit-pack-school-precis">
        <h5>{hasPrecis ? `${inspectorate} précis` : "Inspection précis"}</h5>
        {hasPrecis ? (
          <>
            {summary ? (
              <p className="visit-pack-school-summary">{summary}</p>
            ) : null}
            {precis && precis !== summary ? (
              <p className="visit-pack-school-body">{precis}</p>
            ) : null}
            <PrintQuoteList
              schoolName={row.name}
              quotes={strengths}
              heading="What the report highlights"
            />
            <PrintQuoteList
              schoolName={row.name}
              quotes={improvements}
              heading="Areas to improve"
            />
            {reportHref ? (
              <p className="visit-pack-report-link">
                Full report:{" "}
                <a href={reportHref} target="_blank" rel="noopener noreferrer">
                  {school.inspectionReportLabel || "Open source PDF"}
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <p className="visit-pack-school-empty">
            No usable inspection précis for this setting yet — open the report
            link on the compare board before you visit.
          </p>
        )}
      </section>

      <WebsiteEvidencePrint school={school} />

      <section className="visit-pack-school-notes">
        <h5>Notes</h5>
        {entry.note ? (
          <p className="visit-note-print-text">{entry.note}</p>
        ) : null}
        <div
          className={
            compactNotes ? "visit-note-lines is-compact" : "visit-note-lines"
          }
          aria-hidden
        />
      </section>
    </article>
  );
}

function PackSheetTitle({
  subtitle,
  printedOn,
}: {
  subtitle: string;
  printedOn: string;
}) {
  return (
    <div className="visit-pack-sheet-title">
      <p className="visit-pack-brand">
        {BRAND_NAME} shortlist pack
      </p>
      <p>
        {subtitle} · printed {printedOn}
      </p>
    </div>
  );
}

export function VisitPack({
  nurseries = [],
  childminders = [],
  schools = [],
  preferPath,
  stages = [],
  sectors = [],
}: {
  nurseries?: SchoolRecord[];
  childminders?: SchoolRecord[];
  schools?: SchoolRecord[];
  preferPath?: GuidancePathId;
  stages?: PhaseId[];
  sectors?: SectorId[];
}) {
  const nurseryRows = useMemo(
    () =>
      nurseries
        .map((r) => toVisitContactRow(r))
        .filter((r): r is VisitContactRow => Boolean(r && r.kind === "nursery")),
    [nurseries],
  );
  const childminderRows = useMemo(
    () =>
      childminders
        .map((r) => toVisitContactRow(r))
        .filter(
          (r): r is VisitContactRow => Boolean(r && r.kind === "childminder"),
        ),
    [childminders],
  );
  const schoolRows = useMemo(
    () =>
      schools
        .map((r) => toVisitContactRow(r, "school"))
        .filter((r): r is VisitContactRow => Boolean(r)),
    [schools],
  );

  const allRecords = useMemo(() => {
    if (schools.length) return schools;
    if (childminders.length) return childminders;
    return nurseries;
  }, [schools, childminders, nurseries]);

  const allRows = useMemo(() => {
    if (schoolRows.length) return schoolRows;
    if (childminderRows.length) return childminderRows;
    return nurseryRows;
  }, [schoolRows, childminderRows, nurseryRows]);

  const shortlistUrns = useMemo(
    () => allRecords.map((s) => s.urn),
    [allRecords],
  );

  const guidancePath = guidancePathForPack({
    schools,
    nurseries,
    childminders,
    preferPath,
  });

  const figures = useMemo(
    () => buildPrintCompareTable(allRecords, guidancePath),
    [allRecords, guidancePath],
  );

  const chartSeries = useMemo(
    () => buildPrintChartSeries(allRecords, guidancePath),
    [allRecords, guidancePath],
  );

  const schoolNotePages = useMemo(
    () =>
      allRows.map((row) => ({
        row,
        school: allRecords.find((s) => s.urn === row.urn) || {
          urn: row.urn,
          name: row.name,
        },
      })),
    [allRows, allRecords],
  );

  const isSchoolPack = schoolRows.length > 0;

  const [log, setLog] = useState<Record<string, VisitLogEntry>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLog(loadVisitLog());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveVisitLog(log);
  }, [log, hydrated]);

  if (!allRows.length) return null;

  function entryFor(urn: string): VisitLogEntry {
    return log[urn] ?? { status: "none" };
  }

  const [previewOpen, setPreviewOpen] = useState(false);

  function printPack() {
    const pack = document.querySelector<HTMLElement>(".visit-pack");
    if (!pack) return;
    // Print clones the pack sheets; preview open state does not matter.
    printVisitPackElement(pack, computePrintNoteHeightPx(1));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(FEEDBACK_PRINTED_EVENT));
    }
  }

  const printedOn = new Date().toLocaleDateString("en-GB");
  const settingCount = allRows.length;
  const packTitle = isSchoolPack
    ? "Shortlist pack"
    : "Visit pack";

  return (
    <div
      className={`visit-pack${previewOpen ? " is-expanded" : ""}`}
      data-tour="visit-pack"
    >
      <div className="visit-pack-toolbar no-print">
        <div>
          <h3 className="compare-subhead" style={{ marginBottom: "0.35rem" }}>
            {packTitle}
          </h3>
          <p className="footnote" style={{ margin: 0 }}>
            Print a visit pack for {settingCount}{" "}
            {settingCount === 1 ? "setting" : "settings"} — advice, figures
            {chartSeries.length ? ", comparison graphs" : ""}, expanded Ofsted
            &amp; website précis, and note pages. Preview stays collapsed until
            you open it; status notes stay in this browser.
          </p>
        </div>
        <div className="visit-pack-toolbar-actions">
          <SaveShortlistPrompt
            schools={shortlistUrns}
            stages={stages}
            sectors={sectors}
            variant="visit-pack"
            includeVisitLog
          />
          <button
            type="button"
            className="btn btn-ghost visit-pack-toggle"
            aria-expanded={previewOpen}
            aria-controls="visit-pack-body"
            onClick={() => setPreviewOpen((v) => !v)}
          >
            {previewOpen ? "Hide pack preview" : "Preview pack"}
          </button>
          <button type="button" className="btn btn-pack" onClick={printPack}>
            Print / save as PDF
          </button>
        </div>
      </div>

      <section className="visit-pack-section no-print">
        <h3 className="compare-subhead">Shortlist status &amp; notes</h3>
        <div className="visit-status-list">
          {allRows.map((row) => (
            <ScreenStatusRow
              key={row.urn}
              row={row}
              entry={entryFor(row.urn)}
              onStatus={(status) =>
                setLog((prev) => upsertVisitLogEntry(prev, row.urn, { status }))
              }
              onNote={(note) =>
                setLog((prev) => upsertVisitLogEntry(prev, row.urn, { note }))
              }
            />
          ))}
        </div>
      </section>

      <div
        id="visit-pack-body"
        className="visit-pack-body"
        hidden={!previewOpen}
      >
        <div className="visit-pack-sheet visit-pack-guide-sheet">
          <PackSheetTitle subtitle="advice & questions" printedOn={printedOn} />
          <DecisionGuidancePrintBlock path={guidancePath} />
          {schoolRows.length ? (
            <QuestionBlock
              kind="school"
              title="Questions to ask — school visits &amp; open days"
            />
          ) : null}
          {nurseryRows.length ? (
            <QuestionBlock
              kind="nursery"
              title="Questions to ask — nurseries &amp; school early years"
            />
          ) : null}
          {childminderRows.length ? (
            <QuestionBlock
              kind="childminder"
              title="Questions to ask — childminders"
            />
          ) : null}
        </div>

        {figures || chartSeries.length || schoolNotePages.length ? (
          <div className="visit-pack-page-break" aria-hidden="true" />
        ) : null}

        {figures ? (
          <div className="visit-pack-sheet visit-pack-figures-sheet">
            <PackSheetTitle subtitle="published figures" printedOn={printedOn} />
            <PrintFiguresTable table={figures} />
          </div>
        ) : null}

        {chartSeries.length ? (
          <>
            {figures ? (
              <div className="visit-pack-page-break" aria-hidden="true" />
            ) : null}
            <div className="visit-pack-sheet visit-pack-graphs-sheet">
              <PackSheetTitle
                subtitle="comparison graphs"
                printedOn={printedOn}
              />
              <p className="visit-pack-figures-caption">
                Visual side-by-side of the same published metrics — on a separate
                sheet so the figures table stays readable on phones and in print.
              </p>
              <div className="visit-pack-graphs-grid">
                {chartSeries.map((series) => (
                  <PrintPackChart key={series.title} series={series} />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {schoolNotePages.map(({ row, school }, index) => (
          <Fragment key={row.urn}>
            {figures || chartSeries.length > 0 || index > 0 ? (
              <div className="visit-pack-page-break" aria-hidden="true" />
            ) : null}
            <div className="visit-pack-sheet visit-pack-school-sheet">
              <PackSheetTitle
                subtitle={`Ofsted, website & notes · ${row.name}`}
                printedOn={printedOn}
              />
              <SchoolNotesPage
                school={school}
                row={row}
                entry={entryFor(row.urn)}
              />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
