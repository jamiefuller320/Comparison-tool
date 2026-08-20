"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  CORE_AREA_LABELS,
  SOURCE_LABELS,
  citationFootnotes,
  citationSegments,
  coverageLevel,
  evidenceCount,
  groupSources,
  numberedCitationSources,
  parentParagraph,
  schoolHasQualitativeCapture,
  shortQualitativeSummary,
  type SourceGroupKey,
} from "@/lib/qualitativeEvidence";

function CitedParagraph({
  text,
  sources,
}: {
  text: string;
  sources: ReturnType<typeof numberedCitationSources>;
}) {
  const footnotes = citationFootnotes(text, sources);
  const byN = new Map(footnotes.map((fn) => [fn.n, fn]));
  const segments = citationSegments(text);

  if (!footnotes.length) {
    return <p className="qual-evidence-paragraph">{text}</p>;
  }

  return (
    <p className="qual-evidence-paragraph">
      {segments.map((seg, index) => {
        if (seg.kind === "text") {
          return <span key={`t-${index}`}>{seg.value}</span>;
        }
        const fn = byN.get(seg.n);
        if (!fn || !fn.href || fn.href === "#") {
          return (
            <sup key={`c-${index}`} className="qual-evidence-footnote-missing">
              {seg.n}
            </sup>
          );
        }
        return (
          <a
            key={`c-${index}`}
            className="qual-evidence-footnote"
            href={fn.href}
            target="_blank"
            rel="noreferrer"
            title={fn.label}
          >
            <sup>{seg.n}</sup>
          </a>
        );
      })}
    </p>
  );
}

function SourceList({
  areaKey,
  groupKey,
  sources,
}: {
  areaKey: string;
  groupKey: SourceGroupKey;
  sources: ReturnType<typeof groupSources>[SourceGroupKey];
}) {
  if (!sources.length) return null;
  return (
    <div className="qual-evidence-source-group">
      <h5>{SOURCE_LABELS[groupKey] || groupKey}</h5>
      <ul>
        {sources.map((src, index) => (
          <li key={`${areaKey}-${groupKey}-${index}-${src.sourceUrl}`}>
            <a href={src.sourceUrl} target="_blank" rel="noreferrer">
              {src.pageTitle || src.text.slice(0, 80)}
            </a>
            {src.meta ? (
              <span className="qual-evidence-source-meta"> ({src.meta})</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreaBlock({
  school,
  areaKey,
  open,
  onToggle,
}: {
  school: SchoolRecord & { qualitativeCapture: NonNullable<SchoolRecord["qualitativeCapture"]> };
  areaKey: string;
  open: boolean;
  onToggle: () => void;
}) {
  const area = school.qualitativeCapture.areas.find((a) => a.area === areaKey);
  if (!area) return null;

  const cov = coverageLevel(area);
  const paragraph = parentParagraph(area);
  const groups = groupSources(area, school.qualitativeCapture);
  // Footnotes must follow synthesis numbering (signal order), not regrouped sources.
  const citationSources = numberedCitationSources(area);
  const sourceCount = evidenceCount(area, school.qualitativeCapture);

  return (
    <section className="qual-evidence-area">
      <header className="qual-evidence-area-header">
        <div>
          <h4>{CORE_AREA_LABELS[area.area] || area.area}</h4>
          <span className={`qual-evidence-coverage ${cov.className}`}>
            {cov.label}
          </span>
        </div>
        {sourceCount > 0 ? (
          <button
            type="button"
            className="qual-evidence-sources-toggle"
            aria-expanded={open}
            onClick={onToggle}
          >
            {open ? "Hide sources" : `Show ${sourceCount} source${sourceCount === 1 ? "" : "s"}`}
          </button>
        ) : null}
      </header>
      <CitedParagraph text={paragraph} sources={citationSources} />
      {area.synthesisMethod ? (
        <p className="qual-evidence-method">
          Summary:{" "}
          {area.synthesisMethod === "cursor" ||
          area.synthesisMethod === "openai" ||
          area.synthesisMethod === "llm"
            ? "AI-assisted from scanned sources"
            : "Built from scanned sources"}
        </p>
      ) : null}
      {open ? (
        <div className="qual-evidence-sources">
          {(Object.keys(groups) as SourceGroupKey[]).map((key) => (
            <SourceList
              key={key}
              areaKey={areaKey}
              groupKey={key}
              sources={groups[key]}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function QualitativeEvidenceSummary({ school }: { school: SchoolRecord }) {
  const summary = shortQualitativeSummary(school);
  if (!summary) {
    return <span className="qual-evidence-empty">—</span>;
  }
  return (
    <div className="qual-evidence-summary">
      <p className="qual-evidence-kicker">From school website scan</p>
      <p className="qual-evidence-summary-body">{summary}</p>
    </div>
  );
}

export function QualitativeEvidenceDetail({ school }: { school: SchoolRecord }) {
  if (!schoolHasQualitativeCapture(school)) {
    return (
      <aside className="qual-evidence-detail empty">
        <p className="qual-evidence-empty">No website evidence scan yet.</p>
      </aside>
    );
  }

  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set());
  const capture = school.qualitativeCapture;
  const areaKeys = capture.areas.map((a) => a.area);

  const toggle = (key: string) => {
    setOpenAreas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      className="qual-evidence-detail"
      aria-label={`Website evidence for ${school.name}`}
    >
      <p className="qual-evidence-detail-name">{school.name}</p>
      <p className="qual-evidence-kicker">
        Scanned {capture.sourcesScanned} page
        {capture.sourcesScanned === 1 ? "" : "s"}
        {capture.documentsDiscovered
          ? ` · ${capture.documentsDiscovered} document${capture.documentsDiscovered === 1 ? "" : "s"} found`
          : ""}
      </p>
      {areaKeys.map((key) => (
        <AreaBlock
          key={key}
          school={school}
          areaKey={key}
          open={openAreas.has(key)}
          onToggle={() => toggle(key)}
        />
      ))}
      <p className="qual-evidence-note">
        Paragraph summaries are drawn from publicly available school pages and
        documents — use them to prepare visit questions, not as a final verdict.
      </p>
    </aside>
  );
}

/** Compare-table rows: short summaries + expandable website evidence. */
export function QualitativeEvidenceRows({
  schools,
}: {
  schools: SchoolRecord[];
}): ReactNode {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLTableRowElement | null>(null);
  const captured = schools.filter(schoolHasQualitativeCapture).length;

  useEffect(() => {
    if (!open || !panelRef.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open]);

  return (
    <>
      <tr
        className={
          open
            ? "metric-row-active qual-evidence-summary-row"
            : "qual-evidence-summary-row"
        }
      >
        <th scope="row">
          <button
            type="button"
            className={
              open
                ? "metric-history-trigger active"
                : "metric-history-trigger"
            }
            aria-expanded={open}
            aria-controls="qualitative-evidence-detail"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="metric-history-label">Website evidence</span>
            <span className="metric-history-cta">
              {open ? "Hide detail" : "Show curriculum & clubs"}
            </span>
          </button>
          <span className="hint">
            Paragraph summaries from the school&apos;s own website and documents
            — expand for sources. Complements inspection précis, not a score.
            {captured > 0 && captured < schools.length
              ? ` ${captured} of ${schools.length} settings scanned so far.`
              : null}
          </span>
        </th>
        {schools.map((school) => (
          <td
            key={school.urn}
            className="metric-cell qual-evidence-summary-cell compare-harbour-cell"
          >
            <QualitativeEvidenceSummary school={school} />
          </td>
        ))}
      </tr>
      {open ? (
        <tr className="history-row qual-evidence-detail-row" ref={panelRef}>
          <td colSpan={schools.length + 1}>
            <div
              className="history-panel history-panel-inline qual-evidence-detail-panel compare-harbour-panel"
              id="qualitative-evidence-detail"
            >
              <div className="qual-evidence-detail-grid">
                {schools.map((school) => (
                  <QualitativeEvidenceDetail key={school.urn} school={school} />
                ))}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
