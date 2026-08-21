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
  type DefaultLegendContentProps,
  type LegendPayload,
} from "recharts";
import {
  COVID_GAP_LABEL,
  COVID_GAP_NOTE,
  withHalfWidthCovidGap,
} from "@/lib/covid-gap";
import { yDomainFromHistoryData } from "@/lib/historyChartDomain";
import {
  buildMetricHistoryPoints,
  type HistoryMetricKey,
  type Ks2HistoryMeta,
  type MetricHistoryPoint,
  type SchoolHistorySeries,
} from "@/lib/ks2History";
import { CovidAwareYearTick, CovidGapBand } from "@/components/CovidGapBand";

const PALETTE = ["#0b4f6c", "#c45c26", "#1f6b4a", "#6b4f8a"];
const ENGLAND_COLOR = "rgba(20,35,58,0.55)";

function isEnglandEntry(entry: LegendPayload): boolean {
  const label = entry.value ?? "";
  return (
    entry.dataKey === "england" ||
    label === "England" ||
    label.startsWith("England ")
  );
}

/** England first, then schools in shortlist order (payload order). */
function orderLegendPayload(payload: readonly LegendPayload[]): LegendPayload[] {
  const england = payload.filter(isEnglandEntry);
  const schools = payload.filter((entry) => !isEnglandEntry(entry));
  return [...england, ...schools];
}

function HistoryLegendContent({ payload }: DefaultLegendContentProps) {
  if (!payload?.length) return null;
  const items = orderLegendPayload(payload);

  return (
    <ul className="history-legend">
      {items.map((entry) => {
        const england = isEnglandEntry(entry);
        const color = entry.color || (england ? ENGLAND_COLOR : "#0b4f6c");
        const label = entry.value ?? "";
        return (
          <li
            key={String(entry.dataKey ?? label)}
            className={
              england ? "history-legend-item england" : "history-legend-item"
            }
          >
            <span
              className={
                england ? "history-legend-swatch dashed" : "history-legend-swatch"
              }
              style={{ background: england ? "transparent" : color, borderColor: color }}
              aria-hidden
            />
            <span className="history-legend-label" style={{ color }}>
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

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
  const valueKeys = ["england", ...urns];
  const domain = yDomainFromHistoryData(rows, valueKeys, unit);
  const xTicks = rows.map((row) => row.x);
  // Cropped Y-band needs less vertical room than a full 0–100 frame.
  const chartHeight = schools.length >= 3 ? 300 : 280;

  return (
    <div className="history-chart">
      <p className="footnote history-chart-note">
        Multi-year KS2 tables
        {meta.source?.years?.length
          ? ` (${meta.periods[0]?.replace("/20", "/")}–${meta.periods.at(-1)?.replace("/20", "/")})`
          : null}
        {metric === "eligiblePupils"
          ? " England (dashed) is the mean Year 6 cohort across KS2 table schools (total ÷ number of records)."
          : " England is the dashed line (first in the key)."}
        {gapRange ? ` ${COVID_GAP_NOTE}` : null}
      </p>
      <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
        <LineChart
          data={rows}
          margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
        >
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
            width={44}
            tick={{ fill: "#3d4f66", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (isPct ? `${v}%` : String(v))}
            allowDataOverflow={false}
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
          <Legend
            verticalAlign="bottom"
            align="left"
            itemSorter={null}
            content={(props) => <HistoryLegendContent {...props} />}
            wrapperStyle={{
              width: "100%",
              paddingTop: 8,
              overflow: "visible",
            }}
          />
          {gapRange ? <CovidGapBand x0={gapRange.x0} x1={gapRange.x1} /> : null}
          {/* England first so the key order stays stable with itemSorter={null}. */}
          <Line
            type="monotone"
            dataKey="england"
            name={metric === "eligiblePupils" ? "England (avg)" : "England"}
            stroke={ENGLAND_COLOR}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: ENGLAND_COLOR }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {schools.map((school, i) => (
            <Line
              key={school.urn}
              type="monotone"
              dataKey={school.urn}
              name={school.name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: PALETTE[i % PALETTE.length] }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
