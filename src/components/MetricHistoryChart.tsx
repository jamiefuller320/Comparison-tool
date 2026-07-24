"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  COVID_GAP_LABEL,
  COVID_GAP_NOTE,
  withHalfWidthCovidGap,
} from "@/lib/covid-gap";
import {
  buildMetricHistoryPoints,
  type HistoryMetricKey,
  type Ks2HistoryMeta,
  type MetricHistoryPoint,
  type SchoolHistorySeries,
} from "@/lib/ks2History";
import { CovidAwareYearTick, CovidGapBand } from "@/components/CovidGapBand";
import { shortName } from "@/lib/format";

const PALETTE = ["#0b4f6c", "#c45c26", "#1f6b4a", "#6b4f8a"];

export function MetricHistoryChart({
  meta,
  metric,
  unit,
  schools,
  schoolSeries,
}: {
  meta: Ks2HistoryMeta;
  metric: HistoryMetricKey;
  unit: "pct" | "score" | "count";
  schools: Array<{ urn: string; name: string }>;
  schoolSeries: Record<string, SchoolHistorySeries | null>;
}) {
  const urns = schools.map((s) => s.urn);
  const baseRows = buildMetricHistoryPoints(meta, metric, schoolSeries, urns);

  if (!baseRows.length) {
    return (
      <p className="footnote">
        No published figures for this measure across the archived KS2 years.
      </p>
    );
  }

  const { rows, gapRange, tickLabels } = withHalfWidthCovidGap(baseRows, () => {
    const gapPoint: MetricHistoryPoint & { gap: true } = {
      year: COVID_GAP_LABEL,
      period: "",
      england: null,
      gap: true,
    };
    for (const urn of urns) gapPoint[urn] = null;
    return gapPoint;
  });

  const isPct = unit === "pct";
  const domain: [number | "auto", number | "auto"] =
    unit === "pct" ? [0, 100] : unit === "score" ? [80, 120] : ["auto", "auto"];
  const xTicks = rows.map((row) => row.x);

  return (
    <div className="history-chart">
      <p className="footnote history-chart-note">
        Multi-year KS2 tables
        {meta.source?.years?.length
          ? ` (${meta.periods[0]?.replace("/20", "/")}–${meta.periods.at(-1)?.replace("/20", "/")})`
          : null}
        . England shown as a dashed line.
        {gapRange ? ` ${COVID_GAP_NOTE}` : null}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,35,58,0.1)" />
          <XAxis
            type="number"
            dataKey="x"
            ticks={xTicks}
            domain={["dataMin", "dataMax"]}
            tick={<CovidAwareYearTick tickLabels={tickLabels} />}
            axisLine={false}
            tickLine={false}
            height={28}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            domain={domain}
            tick={{ fill: "#3d4f66", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (isPct ? `${v}%` : String(v))}
            allowDataOverflow={unit !== "count"}
          />
          <Tooltip
            formatter={(value, name) => {
              if (value == null || value === "") return ["—", String(name)];
              const n = Number(value);
              if (unit === "pct") return [`${n}%`, String(name)];
              if (unit === "count") return [String(Math.round(n)), String(name)];
              return [n.toFixed(1), String(name)];
            }}
            labelFormatter={(label) => {
              const numeric = typeof label === "number" ? label : Number(label);
              const name = tickLabels.get(numeric);
              if (name === COVID_GAP_LABEL) {
                return "COVID gap (2019/20–2021/22)";
              }
              return name ?? String(label);
            }}
            contentStyle={{
              background: "rgba(255,252,247,0.96)",
              border: "1px solid rgba(20,35,58,0.12)",
              borderRadius: 8,
            }}
          />
          <Legend />
          {gapRange ? <CovidGapBand x0={gapRange.x0} x1={gapRange.x1} /> : null}
          {schools.map((school, i) => (
            <Line
              key={school.urn}
              type="monotone"
              dataKey={school.urn}
              name={shortName(school.name, 22)}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: PALETTE[i % PALETTE.length] }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          <Line
            type="monotone"
            dataKey="england"
            name="England"
            stroke="rgba(20,35,58,0.55)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: "rgba(20,35,58,0.55)" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
