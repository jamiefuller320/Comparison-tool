"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ChallengeBoardId } from "@/lib/sourceStamp";
import type { SchoolRecord } from "@/lib/types";
import type { DataGap } from "@/lib/dataGaps";
import { GAP_REASON_LEGEND } from "@/lib/dataGaps";
import {
  COVERAGE_DIMENSIONS,
  buildCoverageSummary,
  reasonLegendEntries,
  type CoverageDimensionId,
} from "@/lib/coverageStrip";
import { shortName } from "@/lib/format";

function SegmentBar({
  present,
  total,
  label,
}: {
  present: number;
  total: number;
  label: string;
}) {
  if (total <= 0) return null;
  const pct = Math.round((present / total) * 100);
  return (
    <div className="coverage-seg" title={`${present} of ${total} · ${label}`}>
      <div className="coverage-seg-label">
        <span>{label}</span>
        <span className="coverage-seg-count">
          {present}/{total}
        </span>
      </div>
      <div
        className="coverage-seg-track"
        role="img"
        aria-label={`${label}: ${present} of ${total} shortlisted schools`}
      >
        <div className="coverage-seg-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SchoolDots({
  present,
}: {
  present: Record<CoverageDimensionId, boolean>;
}) {
  return (
    <span className="coverage-dots" aria-hidden>
      {COVERAGE_DIMENSIONS.map((dim) => (
        <span
          key={dim.id}
          className={
            present[dim.id] ? "coverage-dot on" : "coverage-dot off"
          }
          title={`${dim.label}: ${present[dim.id] ? "present" : "missing"}`}
        />
      ))}
    </span>
  );
}

/** Graphical coverage + expandable gap-detail card for a compare board. */
export function CoverageStrip({
  schools,
  board,
  gaps,
  secondarySlot,
}: {
  schools: SchoolRecord[];
  board: ChallengeBoardId;
  gaps: DataGap[];
  /** Optional opt-in secondary-context controls (independents). */
  secondarySlot?: ReactNode;
}) {
  const summary = useMemo(
    () => buildCoverageSummary(schools, board, gaps),
    [schools, board, gaps],
  );
  const [open, setOpen] = useState(false);
  const legend = reasonLegendEntries(summary.legendCodes);
  const schoolRows = summary.schools.filter((row) => row.gaps.length > 0);

  if (!schools.length) return null;

  return (
    <section className="coverage-strip" aria-label="Shortlist data coverage">
      <div className="coverage-strip-head">
        <div>
          <h3 className="coverage-strip-title">What’s covered on this shortlist</h3>
          <p className="coverage-strip-lead">
            Filled segments are published joins. Hollow segments are known gaps —
            not bugs. Open details for plain-English reasons.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-quiet coverage-strip-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide gap details" : "Why is data missing?"}
        </button>
      </div>

      <div className="coverage-seg-grid">
        {COVERAGE_DIMENSIONS.map((dim) => (
          <SegmentBar
            key={dim.id}
            label={dim.label}
            present={summary.totals[dim.id].present}
            total={summary.totals[dim.id].total}
          />
        ))}
      </div>

      {legend.length ? (
        <ul className="coverage-legend" aria-label="Gap reason legend">
          {legend.map((entry) => (
            <li key={entry.code}>
              <span
                className={
                  entry.code === "not-published" ||
                  entry.code === "missing-grade"
                    ? "coverage-legend-mark watch"
                    : "coverage-legend-mark info"
                }
              />
              <span>
                <strong>{entry.short}</strong> — {entry.meaning}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {secondarySlot}

      {open ? (
        <div className="gap-detail-card">
          <h4>Gap details by school</h4>
          {!schoolRows.length ? (
            <p className="footnote" style={{ margin: 0 }}>
              No school-level gap chips on this shortlist. Board notes above still
              apply when a source stamp is missing.
            </p>
          ) : (
            <ul className="gap-detail-list">
              {schoolRows.map((row) => (
                <li key={row.urn}>
                  <div className="gap-detail-school">
                    <strong>{shortName(row.name, 40)}</strong>
                    <SchoolDots present={row.present} />
                  </div>
                  <ul className="gap-detail-reasons">
                    {row.gaps.map((gap) => {
                      const legendEntry = gap.reasonCode
                        ? GAP_REASON_LEGEND[gap.reasonCode]
                        : null;
                      return (
                        <li key={gap.id}>
                          <span
                            className={
                              gap.severity === "watch"
                                ? "data-gap-chip data-gap-chip-watch"
                                : "data-gap-chip data-gap-chip-info"
                            }
                          >
                            {legendEntry?.short || gap.label}
                          </span>
                          <p>{gap.detail || gap.label}</p>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <p className="gap-detail-foot">
            Use gaps to prepare visit questions. Directory and ISI links (when you
            opt in below) are not DfE table figures and are not comparable as
            Attainment 8 / RWM substitutes.
          </p>
        </div>
      ) : null}
    </section>
  );
}
