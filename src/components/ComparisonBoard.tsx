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
import type { BenchmarkSet, SchoolRecord } from "@/lib/types";
import { PARENT_METRICS } from "@/lib/metrics";
import { fmtNum, fmtPct, fmtPp, ppGap, shortName } from "@/lib/format";
import { formatSector, resolveSchoolSector } from "@/lib/sectors";

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
}: {
  schools: SchoolRecord[];
  england: BenchmarkSet;
}) {
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

  return (
    <div>
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
                      {school.schoolTypeLabel ? ` · ${school.schoolTypeLabel}` : null}
                    </span>
                    {resolveSchoolSector(school) === "independent" &&
                    school.rwmExpected == null ? (
                      <span>
                        Independent schools often do not publish KS2 table
                        figures comparable with state schools.
                      </span>
                    ) : null}
                    {school.compareUrl ? (
                      <a href={school.compareUrl} target="_blank" rel="noreferrer">
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
              const metrics = PARENT_METRICS.filter((m) => m.group === group);
              return (
                <GroupRows
                  key={group}
                  title={groupTitles[group]}
                  metrics={metrics}
                  schools={schools}
                  england={england}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="chart-wrap" aria-label="Expected standard comparison chart">
        <ResponsiveContainer width="100%" height={320}>
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
}: {
  title: string;
  metrics: typeof PARENT_METRICS;
  schools: SchoolRecord[];
  england: BenchmarkSet;
}) {
  return (
    <>
      <tr className="group-label">
        <td colSpan={schools.length + 1}>{title}</td>
      </tr>
      {metrics.map((metric) => {
        const winner =
          metric.unit === "count"
            ? null
            : bestUrn(schools, metric.get, true);
        return (
          <tr key={metric.key}>
            <th scope="row">
              {metric.label}
              <span className="hint">{metric.parentHint}</span>
            </th>
            {schools.map((school) => {
              const value = metric.get(school);
              const englandValue = england[metric.key as keyof BenchmarkSet] as
                | number
                | null
                | undefined;
              const gap =
                metric.unit === "pct" ? ppGap(value, englandValue) : null;
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
        );
      })}
    </>
  );
}
