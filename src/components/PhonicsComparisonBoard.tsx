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
import type { PhonicsBenchmarkSet, SchoolRecord } from "@/lib/types";
import {
  PHONICS_METRICS,
  phonicsEngland,
  phonicsForSchool,
  sharedPhonicsLaName,
  type PhonicsMetric,
} from "@/lib/phonicsMetrics";
import { fmtNum, fmtPct, fmtPp, ppGap, shortName } from "@/lib/format";
import { formatSector, resolveSchoolSector } from "@/lib/sectors";
import { SEED_GEOGRAPHY_LABEL } from "@/lib/seedScope";
import { BoardProvenance } from "@/components/BoardProvenance";
import type { SourceStamp } from "@/lib/sourceStamp";

const CHART_KEYS = [
  "year1Expected",
  "endYear2Expected",
  "year1DisadvantagedExpected",
] as const;

function formatValue(
  value: number | null | undefined,
  unit: PhonicsMetric["unit"],
): string {
  if (value == null) return "—";
  if (unit === "pct") return fmtPct(value);
  return fmtNum(value, 0);
}

export function PhonicsComparisonBoard({
  schools,
  phonics,
  sourceStamp,
}: {
  schools: SchoolRecord[];
  phonics?: PhonicsBenchmarkSet;
  sourceStamp?: SourceStamp | null;
}) {
  if (schools.length === 0) {
    return (
      <div className="empty-compare">
        Add state schools that offer KS1 to see {SEED_GEOGRAPHY_LABEL} phonics
        context alongside England.
      </div>
    );
  }

  const england = phonicsEngland(phonics);
  const sharedLa = sharedPhonicsLaName(schools);
  const sharedArea = sharedLa
    ? phonics?.localAuthorities?.[sharedLa]
    : undefined;
  const areas = schools.map((school) => ({
    school,
    area: phonicsForSchool(school, phonics),
  }));
  const withArea = areas.filter((row) => row.area?.year1Expected != null);
  const period = phonics?.period ?? "latest";
  const singleLaMode = Boolean(sharedLa && sharedArea?.year1Expected != null);

  const chartData = CHART_KEYS.map((key) => {
    const label =
      PHONICS_METRICS.find((m) => m.key === key)?.label.replace(
        " phonics — met the standard",
        "",
      ) ?? key;
    const row: Record<string, string | number | null> = { label };
    const metric = PHONICS_METRICS.find((m) => m.key === key);
    if (singleLaMode) {
      const value = metric?.get(sharedArea);
      row.la = typeof value === "number" ? value : null;
    } else {
      for (const { school, area } of areas) {
        const value = metric?.get(area);
        row[school.urn] = typeof value === "number" ? value : null;
      }
    }
    const engVal = metric?.get(england);
    row.england = typeof engVal === "number" ? engVal : null;
    return row;
  });

  const palette = ["#0b4f6c", "#c45c26", "#1f6b4a", "#6b4f8a"];

  return (
    <div>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Phonics figures are published for the <strong>local authority</strong>{" "}
        and <strong>England</strong> only — not for each school. Use this as
        area context while you shortlist. KS1 teacher assessment is no longer
        collected nationally.
        {singleLaMode
          ? ` Showing ${sharedLa} versus England for your shortlist (${schools.map((s) => shortName(s.name, 24)).join(", ")}).`
          : null}
        {england?.year1Expected != null
          ? ` England Year 1 expected standard is ${fmtPct(england.year1Expected)} (${period}).`
          : null}
        {!singleLaMode && withArea.length === 0
          ? " None of these schools have a matching local-authority phonics row."
          : null}
      </p>
      {sourceStamp ? (
        <BoardProvenance stamp={sourceStamp} board="ks1-phonics" />
      ) : null}

      <div className="compare-board">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              {singleLaMode ? (
                <th scope="col">
                  {sharedLa}
                  <div className="school-meta">
                    <span>Local authority phonics context</span>
                    <span>
                      Shortlist:{" "}
                      {schools.map((s) => shortName(s.name, 20)).join(" · ")}
                    </span>
                  </div>
                </th>
              ) : (
                schools.map((school) => (
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
                        {" · LA phonics context"}
                      </span>
                    </div>
                  </th>
                ))
              )}
              <th scope="col">England</th>
            </tr>
          </thead>
          <tbody>
            {PHONICS_METRICS.map((metric) => {
              const engValue = metric.get(england);
              const laValue = singleLaMode ? metric.get(sharedArea) : null;
              const singleGap =
                singleLaMode && metric.unit === "pct"
                  ? ppGap(
                      typeof laValue === "number" ? laValue : null,
                      typeof engValue === "number" ? engValue : null,
                    )
                  : null;
              return (
                <tr key={metric.key}>
                  <th scope="row">
                    {metric.label}
                    <span className="hint">{metric.parentHint}</span>
                  </th>
                  {singleLaMode ? (
                    <td className="metric-cell">
                      {formatValue(laValue, metric.unit)}
                      {singleGap != null ? (
                        <span
                          className={
                            singleGap > 1
                              ? "vs vs-up"
                              : singleGap < -1
                                ? "vs vs-down"
                                : "vs vs-flat"
                          }
                        >
                          {fmtPp(singleGap)} vs England
                        </span>
                      ) : null}
                    </td>
                  ) : (
                    areas.map(({ school, area }) => {
                      const value = metric.get(area);
                      const gap =
                        metric.unit === "pct"
                          ? ppGap(
                              typeof value === "number" ? value : null,
                              typeof engValue === "number" ? engValue : null,
                            )
                          : null;
                      return (
                        <td key={school.urn} className="metric-cell">
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
                              {fmtPp(gap)} vs England
                            </span>
                          ) : null}
                          {!area && school.localAuthority ? (
                            <span className="hint">
                              No LA phonics row for {school.localAuthority}
                            </span>
                          ) : null}
                        </td>
                      );
                    })
                  )}
                  <td className="metric-cell">
                    {formatValue(engValue, metric.unit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(singleLaMode || withArea.length > 0) ? (
        <div className="chart-panel" style={{ marginTop: "1.5rem" }}>
          <h3 className="compare-subhead">
            {singleLaMode ? `${sharedLa} vs England` : "LA phonics at a glance"}
          </h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {singleLaMode ? (
                  <Bar
                    dataKey="la"
                    name={sharedLa ?? "LA"}
                    fill={palette[0]}
                    maxBarSize={36}
                  />
                ) : (
                  schools.map((school, i) => (
                    <Bar
                      key={school.urn}
                      dataKey={school.urn}
                      name={shortName(school.name, 18)}
                      fill={palette[i % palette.length]}
                      maxBarSize={36}
                    />
                  ))
                )}
                <Bar
                  dataKey="england"
                  name="England"
                  fill="#8a8f98"
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {phonics?.note ? (
        <p className="footnote" style={{ marginTop: "1rem" }}>
          {phonics.note}
        </p>
      ) : null}
    </div>
  );
}
