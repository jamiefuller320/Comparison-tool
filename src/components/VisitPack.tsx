"use client";

import { useEffect, useMemo, useState } from "react";
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
import { SEED_GEOGRAPHY_LABEL } from "@/lib/seedScope";
import { DecisionGuidancePrintBlock } from "@/components/DecisionGuidance";
import { SaveShortlistPrompt } from "@/components/SaveShortlistPrompt";
import { SchoolOutboundLinks } from "@/components/SchoolOutboundLinks";
import { BRAND_NAME } from "@/lib/brand";
import type { GuidancePathId } from "@/lib/decisionGuidance";
import type { PhaseId } from "@/lib/phases";
import type { SectorId } from "@/lib/sectors";
import {
  buildPrintCompareTable,
  type PrintCompareTable,
} from "@/lib/printPackMetrics";
import {
  inspectionHighlights,
  inspectionSourceLabel,
  schoolHasInspectionPrecis,
  shortInspectionSummary,
} from "@/lib/inspectionHighlights";

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
  const precis = school.inspectionPrecis?.trim();

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
            {strengths.length ? (
              <p className="visit-pack-school-bullets">
                <strong>Positives:</strong>{" "}
                {strengths
                  .slice(0, 2)
                  .map((q) => q.text)
                  .join(" · ")}
              </p>
            ) : null}
            {improvements.length ? (
              <p className="visit-pack-school-bullets">
                <strong>Improve:</strong>{" "}
                {improvements
                  .slice(0, 2)
                  .map((q) => q.text)
                  .join(" · ")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="visit-pack-school-empty">
            No usable inspection précis in this pack yet — open the report link
            on the compare board before you visit.
          </p>
        )}
      </section>

      <section className="visit-pack-school-notes">
        <h5>Notes</h5>
        {entry.note ? (
          <p className="visit-note-print-text">{entry.note}</p>
        ) : null}
        <div className="visit-note-lines" aria-hidden />
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
        {SEED_GEOGRAPHY_LABEL} · {subtitle} · printed {printedOn}
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

  function printPack() {
    const pack = document.querySelector<HTMLElement>(".visit-pack");
    if (!pack) return;
    printVisitPackElement(pack, computePrintNoteHeightPx(1));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(FEEDBACK_PRINTED_EVENT));
    }
  }

  const printedOn = new Date().toLocaleDateString("en-GB");

  return (
    <div className="visit-pack" data-tour="visit-pack">
      <div className="visit-pack-toolbar no-print">
        <div>
          <h3 className="compare-subhead" style={{ marginBottom: "0.35rem" }}>
            {isSchoolPack
              ? "Shortlist pack — print for visits"
              : "Visit pack — print for visits"}
          </h3>
          <p className="footnote" style={{ margin: 0 }}>
            Print order: each section on its own page — advice &amp; questions,
            published figures, then one setting per page with room for notes.
            Status and notes stay in this browser.
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

      {figures ? (
        <div className="visit-pack-sheet visit-pack-figures-sheet">
          <PackSheetTitle subtitle="published figures" printedOn={printedOn} />
          <PrintFiguresTable table={figures} />
        </div>
      ) : null}

      {schoolNotePages.map(({ row, school }) => (
        <div
          key={row.urn}
          className="visit-pack-sheet visit-pack-school-sheet"
        >
          <PackSheetTitle
            subtitle={`précis & notes · ${row.name}`}
            printedOn={printedOn}
          />
          <SchoolNotesPage
            school={school}
            row={row}
            entry={entryFor(row.urn)}
          />
        </div>
      ))}
    </div>
  );
}
