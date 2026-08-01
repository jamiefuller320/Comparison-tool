"use client";

import { useEffect, useMemo, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  computePrintNoteHeightPx,
  questionsForKind,
  toVisitContactRow,
  type VisitContactRow,
  type VisitPackKind,
} from "@/lib/visitPack";
import { printVisitPackElement } from "@/lib/printVisitPack";
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
import { InspectionPrecis } from "@/components/InspectionPrecis";
import { SaveShortlistPrompt } from "@/components/SaveShortlistPrompt";
import type { PhaseId } from "@/lib/phases";
import type { SectorId } from "@/lib/sectors";

function contactAsSchool(row: VisitContactRow): SchoolRecord {
  return {
    urn: row.urn,
    name: row.name,
    ofstedReportUrl: row.ofstedReportUrl,
    inspectionPrecis: row.inspectionPrecis,
    inspectionQuotes: row.inspectionQuotes,
    inspectionReportFileUrl: row.inspectionReportFileUrl,
    inspectionReportLabel: row.inspectionReportLabel,
    inspectionPrecisSource: row.inspectionPrecisSource,
  };
}

function ContactCard({
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
    <article className="visit-contact-card">
      <header className="visit-contact-head">
        <div>
          <h4>{row.name}</h4>
          <p className="visit-contact-meta">
            {row.kindLabel}
            {row.places != null ? ` · ${row.places} places` : null}
            {row.ofstedOverall ? ` · Ofsted ${row.ofstedOverall}` : null}
            {row.ofstedEarlyYearsProvision
              ? ` · EY provision ${row.ofstedEarlyYearsProvision}`
              : null}
          </p>
        </div>
        <label className="visit-status no-print">
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
        <p className="visit-status-print print-only">
          Status: {visitStatusLabel(entry.status)}
        </p>
      </header>

      <p className="visit-address">{row.addressLine}</p>
      {[row.localAuthority, row.ofstedInspectionDate]
        .filter(Boolean)
        .length ? (
        <p className="visit-contact-meta">
          {[row.localAuthority, row.ofstedInspectionDate]
            .filter(Boolean)
            .join(" · ")}
          {row.ofstedInspectionDate ? " (last inspection)" : null}
        </p>
      ) : null}

      {row.ofstedReportUrl ? (
        <p className="visit-report-link">
          <a href={row.ofstedReportUrl} target="_blank" rel="noreferrer">
            Ofsted report / registration ↗
          </a>
          {row.ofstedUrn ? (
            <span className="visit-contact-meta"> · URN {row.ofstedUrn}</span>
          ) : null}
        </p>
      ) : null}
      <InspectionPrecis school={contactAsSchool(row)} compact />

      <label className="visit-note">
        <span>Notes</span>
        <textarea
          className="no-print"
          rows={2}
          value={entry.note ?? ""}
          placeholder="Waiting list, fees heard, gut feel…"
          onChange={(e) => onNote(e.target.value)}
        />
        {entry.note ? (
          <p className="visit-note-print-text print-only">{entry.note}</p>
        ) : null}
        <div className="visit-note-lines print-only" aria-hidden />
      </label>
    </article>
  );
}

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

export function VisitPack({
  nurseries,
  childminders,
  stages = [],
  sectors = [],
}: {
  nurseries: SchoolRecord[];
  childminders: SchoolRecord[];
  stages?: PhaseId[];
  sectors?: SectorId[];
}) {
  const nurseryRows = useMemo(
    () =>
      nurseries
        .map(toVisitContactRow)
        .filter((r): r is VisitContactRow => Boolean(r)),
    [nurseries],
  );
  const childminderRows = useMemo(
    () =>
      childminders
        .map(toVisitContactRow)
        .filter((r): r is VisitContactRow => Boolean(r)),
    [childminders],
  );
  const shortlistUrns = useMemo(
    () => [...nurseries, ...childminders].map((s) => s.urn),
    [nurseries, childminders],
  );

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

  if (!nurseryRows.length && !childminderRows.length) return null;

  function entryFor(urn: string): VisitLogEntry {
    return log[urn] ?? { status: "none" };
  }

  function printPack() {
    const pack = document.querySelector<HTMLElement>(".visit-pack");
    if (!pack) return;
    const contactCount = nurseryRows.length + childminderRows.length;
    printVisitPackElement(pack, computePrintNoteHeightPx(contactCount));
  }

  const printedOn = new Date().toLocaleDateString("en-GB");

  return (
    <div className="visit-pack" data-tour="visit-pack">
      <div className="visit-pack-toolbar no-print">
        <div>
          <h3 className="compare-subhead" style={{ marginBottom: "0.35rem" }}>
            Visit pack — contacts &amp; interview prompts
          </h3>
          <p className="footnote" style={{ margin: 0 }}>
            Print this pack before you phone or visit. Status and notes stay in
            this browser. Phone numbers are not in Ofsted’s public files — use
            the address, Ofsted report, and routes the setting publishes.
          </p>
        </div>
        <div className="visit-pack-toolbar-actions">
          <SaveShortlistPrompt
            schools={shortlistUrns}
            stages={stages}
            sectors={sectors}
            includeVisitLog
            variant="visit-pack"
          />
          <button type="button" className="btn btn-pack" onClick={printPack}>
            Print / save as PDF
          </button>
        </div>
      </div>

      <div className="visit-pack-sheet visit-pack-contacts-sheet">
        <div className="visit-pack-print-title print-only">
          <p className="visit-pack-brand">
            School<em>side</em> visit pack
          </p>
          <p>
            {SEED_GEOGRAPHY_LABEL} shortlist · contacts · printed {printedOn}
          </p>
        </div>

        {nurseryRows.length ? (
          <section className="visit-pack-section">
            <h3 className="compare-subhead">Nurseries on your shortlist</h3>
            <div className="visit-contact-grid">
              {nurseryRows.map((row) => (
                <ContactCard
                  key={row.urn}
                  row={row}
                  entry={entryFor(row.urn)}
                  onStatus={(status) =>
                    setLog((prev) =>
                      upsertVisitLogEntry(prev, row.urn, { status }),
                    )
                  }
                  onNote={(note) =>
                    setLog((prev) =>
                      upsertVisitLogEntry(prev, row.urn, { note }),
                    )
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {childminderRows.length ? (
          <section className="visit-pack-section">
            <h3 className="compare-subhead">Childminders on your shortlist</h3>
            <div className="visit-contact-grid">
              {childminderRows.map((row) => (
                <ContactCard
                  key={row.urn}
                  row={row}
                  entry={entryFor(row.urn)}
                  onStatus={(status) =>
                    setLog((prev) =>
                      upsertVisitLogEntry(prev, row.urn, { status }),
                    )
                  }
                  onNote={(note) =>
                    setLog((prev) =>
                      upsertVisitLogEntry(prev, row.urn, { note }),
                    )
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="visit-pack-sheet visit-pack-questions-sheet">
        <div className="visit-pack-print-title print-only">
          <p className="visit-pack-brand">
            School<em>side</em> interview prompts
          </p>
          <p>
            {SEED_GEOGRAPHY_LABEL} shortlist · questions · printed {printedOn}
          </p>
        </div>

        {nurseryRows.length ? (
          <QuestionBlock
            kind="nursery"
            title="Suggested questions — nurseries &amp; school early years"
          />
        ) : null}
        {childminderRows.length ? (
          <QuestionBlock
            kind="childminder"
            title="Suggested questions — childminders"
          />
        ) : null}
      </div>
    </div>
  );
}
