"use client";

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
import type { IndependentBenchmarkSet, SchoolRecord } from "@/lib/types";
import {
  INDEPENDENT_METRICS,
  independentBenchmarkValue,
  type IndependentMetric,
} from "@/lib/independentMetrics";
import { fmtNum, fmtPct, fmtPp, ppGap, shortName } from "@/lib/format";
import {
  formatSector,
  resolveSchoolSector,
} from "@/lib/sectors";

const CHART_KEYS = [
  "engMath94Percent",
  "anyPassPercent",
  "ebaccMat94Percent",
  "ebaccEng94Percent",
] as const;

function formatValue(
  value: number | string | null | undefined,
  unit: IndependentMetric["unit"],
): string {
  if (value == null || value === "") return "—";
  if (unit === "text") return String(value);
  if (unit === "pct") return fmtPct(Number(value));
  if (unit === "count") return fmtNum(Number(value), 0);
  return fmtNum(Number(value), 1);
}

function bestUrn(
  schools: SchoolRecord[],
  getter: (s: SchoolRecord) => number | string | null | undefined,
): string | null {
  let best: { urn: string; value: number } | null = null;
  for (const school of schools) {
    const value = getter(school);
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (!best || value > best.value) best = { urn: school.urn, value };
  }
  return best?.urn ?? null;
}

export function IndependentComparisonBoard({
  schools,
  independentBench,
}: {
  schools: SchoolRecord[];
  independentBench?: IndependentBenchmarkSet;
}) {
  if (schools.length === 0) {
    return (
      <div className="empty-compare">
        Add independent schools to see Key Stage 4 and inspection comparison.
      </div>
    );
  }

  const groups = ["outcomes", "pathways", "inspection", "cohort"] as const;
  const groupTitles = {
    outcomes: "Published GCSE outcomes",
    pathways: "Subject pathways (incl. alternatives when combined basics are nil)",
    inspection: "Inspection",
    cohort: "Cohort context",
  };

  const chartData = CHART_KEYS.map((key) => {
    const label =
      INDEPENDENT_METRICS.find((m) => m.key === key)?.label.replace(
        "English & maths ",
        "",
      ) ?? key;
    const row: Record<string, string | number | null> = { label };
    for (const school of schools) {
      const value = school[key];
      row[school.urn] = typeof value === "number" ? value : null;
    }
    row.benchmark =
      independentBenchmarkValue(independentBench, key) ?? null;
    return row;
  });

  const palette = ["#0b4f6c", "#c45c26", "#1f6b4a", "#6b4f8a"];
  const hasAnyKs4 = schools.some((s) => s.att8Average != null);
  const hasAnyOfsted = schools.some((s) => s.ofstedOverall || s.ofstedIssCompliance);
  const hasNilCleared = schools.some(
    (s) => (s.ks4ClearedNilFields && s.ks4ClearedNilFields.length > 0) || s.engMathMeasureUnavailable,
  );
  const hasIsi = schools.some(
    (s) => (s.inspectorateName || "").toUpperCase() === "ISI" || s.isiReportsUrl,
  );

  return (
    <div>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Independent schools are compared on published Key Stage 4 figures and
        inspection outcomes — not the Key Stage 2 tables used for state primaries.
        Zero percent English &amp; maths GCSE returns are treated as missing when
        other attainment shows the school is active (common with IGCSEs).
        {independentBench?.att8Average != null
          ? ` Indie benchmark is the mean Attainment 8 of ${independentBench.schoolCount?.toLocaleString("en-GB") ?? "matched"} independents with usable figures (${independentBench.period}).`
          : null}
        {!hasAnyKs4
          ? " None of these schools have published KS4 figures in the latest tables."
          : null}
        {hasNilCleared
          ? " Some combined English & maths cells were cleared as nil returns; check EBacc English/maths pillars instead."
          : null}
        {hasIsi && !hasAnyOfsted
          ? " ISI-inspected schools link to the ISI reports directory rather than Ofsted grades."
          : null}
      </p>

      <div className="compare-board">
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
                      {school.schoolTypeLabel
                        ? ` · ${school.schoolTypeLabel}`
                        : null}
                    </span>
                    {school.ks4Period ? (
                      <span>KS4 {school.ks4Period}</span>
                    ) : null}
                    {school.engMath94IsPillarFallback ? (
                      <span>English &amp; maths 4+ from EBacc pillars</span>
                    ) : school.engMathMeasureUnavailable ? (
                      <span>Combined English &amp; maths GCSE measure not published</span>
                    ) : null}
                    {school.ofstedReportUrl ? (
                      <a
                        href={school.ofstedReportUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ofsted reports ↗
                      </a>
                    ) : school.isiReportsUrl ? (
                      <a
                        href={school.isiReportsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ISI reports ↗
                      </a>
                    ) : null}
                    {school.schoolWebsite ? (
                      <a
                        href={school.schoolWebsite}
                        target="_blank"
                        rel="noreferrer"
                      >
                        School website ↗
                      </a>
                    ) : null}
                    {school.compareUrl ? (
                      <a
                        href={school.compareUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official tables ↗
                      </a>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const metrics = INDEPENDENT_METRICS.filter((m) => m.group === group);
              return (
                <GroupRows
                  key={group}
                  title={groupTitles[group]}
                  metrics={metrics}
                  schools={schools}
                  bench={independentBench}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {hasAnyKs4 ? (
        <div
          className="chart-wrap"
          aria-label="Independent school GCSE comparison chart"
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,35,58,0.1)" />
              <XAxis dataKey="label" tick={{ fill: "#3d4f66", fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#3d4f66", fontSize: 12 }}
                unit="%"
              />
              <Tooltip
                formatter={(value) =>
                  value == null || value === ""
                    ? "—"
                    : `${Number(value).toFixed(0)}%`
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
                dataKey="benchmark"
                name="Indie mean"
                fill="rgba(20,35,58,0.28)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

function GroupRows({
  title,
  metrics,
  schools,
  bench,
}: {
  title: string;
  metrics: IndependentMetric[];
  schools: SchoolRecord[];
  bench?: IndependentBenchmarkSet;
}) {
  return (
    <>
      <tr className="group-label">
        <td colSpan={schools.length + 1}>{title}</td>
      </tr>
      {metrics.map((metric) => {
        const winner =
          metric.unit === "count" || metric.unit === "text"
            ? null
            : bestUrn(schools, metric.get);
        return (
          <tr key={metric.key}>
            <th scope="row">
              {metric.label}
              <span className="hint">{metric.parentHint}</span>
            </th>
            {schools.map((school) => {
              const value = metric.get(school);
              const benchValue = independentBenchmarkValue(bench, metric.key);
              const gap =
                metric.unit === "pct" && typeof value === "number"
                  ? ppGap(value, benchValue)
                  : null;
              return (
                <td
                  key={school.urn}
                  className={
                    winner === school.urn ? "best-cell metric-cell" : "metric-cell"
                  }
                >
                  {formatValue(value, metric.unit)}
                  {gap != null ? (
                    <span
                      className={
                        gap > 1
                          ? "vs vs-up"
                          : gap < -1
                            ? "vs vs-down"
                            : "vs vs-flat"
                      }
                    >
                      {fmtPp(gap)} vs indie mean
                    </span>
                  ) : null}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
