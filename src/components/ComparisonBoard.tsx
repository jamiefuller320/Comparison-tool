"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BenchmarkSet, MetricKey, SchoolRecord } from "@/lib/types";
import { PARENT_METRICS, type ParentMetric } from "@/lib/metrics";
import { fmtNum, fmtPct, fmtPp, ppGap, shortName } from "@/lib/format";
import { formatSector, resolveSchoolSector } from "@/lib/sectors";
import {
  loadKs2HistoryMeta,
  loadSchoolHistorySeries,
  seriesHasHistory,
  type HistoryMetricKey,
  type Ks2HistoryMeta,
  type SchoolHistorySeries,
} from "@/lib/ks2History";
import { MetricHistoryChart } from "@/components/MetricHistoryChart";
import { BoardProvenance } from "@/components/BoardProvenance";
import { CompareTableFrame } from "@/components/CompareTableFrame";
import type { SourceStamp } from "@/lib/sourceStamp";
import { schoolDeepLink } from "@/lib/sourceStamp";
import { ReportProblemButton } from "@/components/ReportProblemButton";

const SUBJECT_KEYS = [
  "rwmExpected",
  "readingExpected",
  "writingExpected",
  "mathsExpected",
  "gpsExpected",
  "scienceExpected",
] as const;

function formatValue(
  value: number | null | undefined,
  unit: "pct" | "score" | "count",
): string {
  if (unit === "pct") return fmtPct(value);
  if (unit === "count") return fmtNum(value, 0);
  return fmtNum(value, 1);
}

function bestUrn(
  schools: SchoolRecord[],
  getter: (s: SchoolRecord) => number | null | undefined,
  higherIsBetter = true,
): string | null {
  let best: { urn: string; value: number } | null = null;
  for (const school of schools) {
    const value = getter(school);
    if (value == null) continue;
    if (
      !best ||
      (higherIsBetter ? value > best.value : value < best.value)
    ) {
      best = { urn: school.urn, value };
    }
  }
  return best?.urn ?? null;
}

export function ComparisonBoard({
  schools,
  england,
  sourceStamp,
}: {
  schools: SchoolRecord[];
  england: BenchmarkSet;
  sourceStamp?: SourceStamp | null;
}) {
  const [activeMetric, setActiveMetric] = useState<HistoryMetricKey | null>(
    null,
  );
  const [meta, setMeta] = useState<Ks2HistoryMeta | null>(null);
  const [schoolSeries, setSchoolSeries] = useState<Record<
    string,
    SchoolHistorySeries | null
  > | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPending, setHistoryPending] = useState(false);
  const historyPanelRef = useRef<HTMLDivElement | null>(null);

  const urnKey = schools.map((s) => s.urn).join(",");

  useEffect(() => {
    setActiveMetric(null);
    setSchoolSeries(null);
    setHistoryError(null);
  }, [urnKey]);

  useEffect(() => {
    if (!activeMetric || !urnKey) return;
    let cancelled = false;
    setHistoryPending(true);
    setHistoryError(null);
    const urns = urnKey.split(",").filter(Boolean);

    void (async () => {
      try {
        const nextMeta = await loadKs2HistoryMeta();
        const series = await loadSchoolHistorySeries(urns);
        if (cancelled) return;
        setMeta(nextMeta);
        setSchoolSeries(series);
      } catch (err) {
        if (cancelled) return;
        setHistoryError(
          err instanceof Error
            ? err.message
            : "Could not load multi-year KS2 history.",
        );
      } finally {
        if (!cancelled) setHistoryPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeMetric, urnKey]);

  // Bring the inline chart into view — it used to render below the whole table,
  // so clicks on top rows looked like a no-op.
  useEffect(() => {
    if (!activeMetric || historyPending) return;
    const node = historyPanelRef.current;
    if (!node) return;
    const id = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
    return () => window.clearTimeout(id);
  }, [activeMetric, historyPending, historyError, schoolSeries]);

  if (schools.length === 0) {
    return (
      <div className="empty-compare">
        Add two to four schools to see a side-by-side parental comparison.
      </div>
    );
  }

  const groups = ["outcomes", "depth", "cohort", "equity"] as const;
  const groupTitles = {
    outcomes: "What pupils achieved",
    depth: "How strong the scores were",
    cohort: "Who was in the year group",
    equity: "How different groups fared",
  };

  const chartData = SUBJECT_KEYS.map((key) => {
    const label =
      PARENT_METRICS.find((m) => m.key === key)?.label.replace(" (expected)", "") ??
      key;
    const row: Record<string, string | number | null> = { label };
    for (const school of schools) {
      row[school.urn] = school[key] ?? null;
    }
    row.england = england[key] ?? null;
    return row;
  });

  const palette = ["#0b4f6c", "#c45c26", "#1f6b4a", "#6b4f8a"];
  const activeDef = PARENT_METRICS.find((m) => m.key === activeMetric) ?? null;
  const hasAnyHistoryForActive =
    activeMetric &&
    schoolSeries &&
    schools.some((s) => seriesHasHistory(schoolSeries[s.urn], activeMetric));

  const historyBody =
    activeMetric && activeDef ? (
      <div
        ref={historyPanelRef}
        className="history-panel history-panel-inline"
        id={`history-${activeMetric}`}
        role="region"
        aria-label={`History for ${activeDef.label}`}
      >
        <div className="history-panel-head">
          <h3>{activeDef.label} over time</h3>
          <button
            type="button"
            className="history-close"
            onClick={() => setActiveMetric(null)}
          >
            Close
          </button>
        </div>
        {historyPending ? (
          <p className="footnote">Loading multi-year figures…</p>
        ) : null}
        {historyError ? <p className="footnote">{historyError}</p> : null}
        {!historyPending && !historyError && meta && schoolSeries ? (
          hasAnyHistoryForActive ? (
            <MetricHistoryChart
              key={`${activeMetric}-${urnKey}`}
              meta={meta}
              metric={activeMetric}
              unit={activeDef.unit}
              schools={schools.map((s) => ({ urn: s.urn, name: s.name }))}
              schoolSeries={schoolSeries}
            />
          ) : (
            <p className="footnote">
              None of these schools have archived figures for this measure in
              the KS2 history pack.
            </p>
          )
        ) : null}
      </div>
    ) : null;

  return (
    <div>
      <p className="footnote" style={{ marginBottom: "0.85rem" }}>
        Click a measure name to open its year-by-year trend directly under that
        row (state KS2 archive from Compare school performance).
      </p>
      {sourceStamp ? (
        <BoardProvenance stamp={sourceStamp} board="ks2" />
      ) : null}

      <CompareTableFrame tableId="ks2">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              {schools.map((school) => (
                <th key={school.urn} scope="col">
                  {shortName(school.name, 32)}
                  <div className="school-meta">
                    <span>
                      {[
                        formatSector(resolveSchoolSector(school)),
                        school.town,
                        school.localAuthority,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span>
                      {school.ageRange ? `Ages ${school.ageRange}` : null}
                      {school.schoolTypeLabel ? ` · ${school.schoolTypeLabel}` : null}
                    </span>
                    {resolveSchoolSector(school) === "independent" &&
                    school.rwmExpected == null ? (
                      <span>
                        Independent schools often do not publish KS2 table
                        figures comparable with state schools.
                      </span>
                    ) : null}
                    {resolveSchoolSector(school) === "state" &&
                    school.rwmExpected == null ? (
                      <span>
                        No Year 6 reading, writing and maths table figure in
                        this release — common for new schools, very small
                        cohorts, or suppressed results. Check the official
                        tables link.
                      </span>
                    ) : null}
                    {school.compareUrl ? (
                      <a href={school.compareUrl} target="_blank" rel="noreferrer">
                        Official tables ↗
                      </a>
                    ) : null}
                    {sourceStamp ? (
                      <ReportProblemButton
                        compact
                        board="ks2"
                        stamp={{
                          ...sourceStamp,
                          deepLink:
                            schoolDeepLink(school) || sourceStamp.deepLink,
                        }}
                        urn={school.urn}
                        schoolName={school.name}
                      />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const metrics = PARENT_METRICS.filter((m) => m.group === group);
              return (
                <GroupRows
                  key={group}
                  title={groupTitles[group]}
                  metrics={metrics}
                  schools={schools}
                  england={england}
                  activeMetric={activeMetric}
                  onToggleMetric={(key) =>
                    setActiveMetric((prev) => (prev === key ? null : key))
                  }
                  historyPanel={
                    activeMetric &&
                    metrics.some((m) => m.key === activeMetric)
                      ? historyBody
                      : null
                  }
                />
              );
            })}
          </tbody>
        </table>
      </CompareTableFrame>

      <div className="chart-wrap" aria-label="Expected standard comparison chart">
        <ResponsiveContainer width="100%" height={320} minWidth={0}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,35,58,0.1)" />
            <XAxis dataKey="label" tick={{ fill: "#3d4f66", fontSize: 12 }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#3d4f66", fontSize: 12 }}
              unit="%"
            />
            <Tooltip
              formatter={(value) =>
                value == null || value === "" ? "—" : `${Number(value).toFixed(0)}%`
              }
            />
            <Legend />
            {schools.map((school, i) => (
              <Bar
                key={school.urn}
                dataKey={school.urn}
                name={shortName(school.name, 22)}
                fill={palette[i % palette.length]}
                radius={[6, 6, 0, 0]}
              />
            ))}
            <Bar
              dataKey="england"
              name="England"
              fill="rgba(20,35,58,0.28)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GroupRows({
  title,
  metrics,
  schools,
  england,
  activeMetric,
  onToggleMetric,
  historyPanel,
}: {
  title: string;
  metrics: ParentMetric[];
  schools: SchoolRecord[];
  england: BenchmarkSet;
  activeMetric: HistoryMetricKey | null;
  onToggleMetric: (key: HistoryMetricKey) => void;
  historyPanel: ReactNode;
}) {
  return (
    <>
      <tr className="group-label">
        <td colSpan={schools.length + 1}>{title}</td>
      </tr>
      {metrics.map((metric, metricIndex) => {
        const winner =
          metric.unit === "count"
            ? null
            : bestUrn(schools, metric.get, true);
        const active = activeMetric === metric.key;
        return (
          <MetricFragment
            key={metric.key}
            metric={metric}
            schools={schools}
            england={england}
            winner={winner}
            active={active}
            onToggleMetric={onToggleMetric}
            historyPanel={active ? historyPanel : null}
            tourAnchor={title === "What pupils achieved" && metricIndex === 0}
          />
        );
      })}
    </>
  );
}

function MetricFragment({
  metric,
  schools,
  england,
  winner,
  active,
  onToggleMetric,
  historyPanel,
  tourAnchor = false,
}: {
  metric: ParentMetric;
  schools: SchoolRecord[];
  england: BenchmarkSet;
  winner: string | null;
  active: boolean;
  onToggleMetric: (key: HistoryMetricKey) => void;
  historyPanel: ReactNode;
  /** First outcomes row — walkthrough spotlight for Year trend. */
  tourAnchor?: boolean;
}) {
  return (
    <>
      <tr className={active ? "metric-row-active" : undefined}>
        <th scope="row">
          <button
            type="button"
            className={
              active ? "metric-history-trigger active" : "metric-history-trigger"
            }
            aria-expanded={active}
            aria-controls={`history-${metric.key}`}
            data-tour={tourAnchor ? "year-trend" : undefined}
            onClick={() => onToggleMetric(metric.key as MetricKey)}
          >
            <span className="metric-history-label">{metric.label}</span>
            <span className="metric-history-cta">
              {active ? "Hide trend" : "Year trend"}
            </span>
          </button>
          <span className="hint">{metric.parentHint}</span>
        </th>
        {schools.map((school) => {
          const value = metric.get(school);
          const englandValue = england[metric.key as keyof BenchmarkSet] as
            | number
            | null
            | undefined;
          const gap = metric.unit === "pct" ? ppGap(value, englandValue) : null;
          return (
            <td
              key={school.urn}
              className={winner === school.urn ? "best-cell metric-cell" : "metric-cell"}
            >
              {formatValue(value, metric.unit)}
              {gap != null ? (
                <span
                  className={
                    gap > 1 ? "vs vs-up" : gap < -1 ? "vs vs-down" : "vs vs-flat"
                  }
                >
                  {fmtPp(gap)} vs England
                </span>
              ) : null}
            </td>
          );
        })}
      </tr>
      {historyPanel ? (
        <tr className="history-row">
          <td colSpan={schools.length + 1}>{historyPanel}</td>
        </tr>
      ) : null}
    </>
  );
}
