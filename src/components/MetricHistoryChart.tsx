"use client";

import { useCallback, useState } from "react";
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
  type TooltipPayloadEntry,
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

type SeriesLike = {
  dataKey?: LegendPayload["dataKey"] | TooltipPayloadEntry["dataKey"];
  value?: unknown;
  name?: unknown;
};

function isEnglandEntry(entry: SeriesLike): boolean {
  const label = String(entry.value ?? entry.name ?? "");
  return (
    entry.dataKey === "england" ||
    label === "England" ||
    label.startsWith("England ")
  );
}

/** Schools first (shortlist order), England fixed last. */
function orderSeriesEntries<T extends SeriesLike>(payload: readonly T[]): T[] {
  const england = payload.filter(isEnglandEntry);
  const schools = payload.filter((entry) => !isEnglandEntry(entry));
  return [...schools, ...england];
}

function HistoryLegendContent({ payload }: DefaultLegendContentProps) {
  if (!payload?.length) return null;
  const items = orderSeriesEntries(payload);

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
              style={{
                background: england ? "transparent" : color,
                borderColor: color,
              }}
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

function HistoryTooltipContent({
  active,
  payload,
  label,
  tickLabels,
  unit,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadEntry>;
  label?: string | number;
  tickLabels: Map<number, string>;
  unit: "pct" | "score" | "count";
}) {
  if (!active || !payload?.length) return null;

  const numeric = typeof label === "number" ? label : Number(label);
  const yearLabel = tickLabels.get(numeric);
  const title =
    yearLabel === COVID_GAP_LABEL
      ? "COVID gap (2019/20–2021/22)"
      : (yearLabel ?? String(label ?? ""));

  const items = orderSeriesEntries(payload);

  return (
    <div className="history-tooltip">
      <p className="history-tooltip-label">{title}</p>
      <ul className="history-tooltip-list">
        {items.map((entry) => {
          const name = String(entry.name ?? entry.dataKey ?? "");
          const raw = entry.value;
          const value =
            typeof raw === "number"
              ? raw
              : raw == null || raw === ""
                ? null
                : Number(raw);
          let display = "—";
          if (value != null && Number.isFinite(value)) {
            if (unit === "pct") display = `${value}%`;
            else if (unit === "count") display = String(Math.round(value));
            else display = value.toFixed(1);
          }
          const color = entry.color || ENGLAND_COLOR;
          return (
            <li key={String(entry.dataKey ?? name)}>
              <span
                className="history-tooltip-swatch"
                style={{ background: color }}
                aria-hidden
              />
              <span className="history-tooltip-name">{name}</span>
              <span className="history-tooltip-value">{display}</span>
            </li>
          );
        })}
      </ul>
    </div>
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
  // Recharts can leave the year popup stuck after mouse leave; control visibility.
  const [tooltipActive, setTooltipActive] = useState(false);

  const dismissTooltip = useCallback(() => setTooltipActive(false), []);
  const onChartMouseMove = useCallback(
    (state: { isTooltipActive?: boolean } | null) => {
      setTooltipActive(Boolean(state?.isTooltipActive));
    },
    [],
  );

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
  const englandName =
    metric === "eligiblePupils" ? "England (avg)" : "England";

  return (
    <div
      className="history-chart"
      onMouseLeave={dismissTooltip}
      onBlur={dismissTooltip}
    >
      <p className="footnote history-chart-note">
        Multi-year KS2 tables
        {meta.source?.years?.length
          ? ` (${meta.periods[0]?.replace("/20", "/")}–${meta.periods.at(-1)?.replace("/20", "/")})`
          : null}
        {metric === "eligiblePupils"
          ? " England (dashed) is the mean Year 6 cohort across KS2 table schools (total ÷ number of records)."
          : " England is the dashed line (last in the key)."}
        {gapRange ? ` ${COVID_GAP_NOTE}` : null}
      </p>
      <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
        <LineChart
          data={rows}
          margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
          onMouseMove={onChartMouseMove}
          onMouseLeave={dismissTooltip}
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
            active={tooltipActive}
            trigger="hover"
            wrapperStyle={{ pointerEvents: "none", outline: "none" }}
            content={(props) => (
              <HistoryTooltipContent
                active={props.active}
                payload={props.payload}
                label={props.label}
                tickLabels={tickLabels}
                unit={unit}
              />
            )}
            cursor={{ stroke: "rgba(11, 79, 108, 0.35)", strokeWidth: 1 }}
            isAnimationActive={false}
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
              activeDot={{ r: 5 }}
            />
          ))}
          {/* England last so the key and year popup list end with the national line. */}
          <Line
            type="monotone"
            dataKey="england"
            name={englandName}
            stroke={ENGLAND_COLOR}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: ENGLAND_COLOR }}
            connectNulls={false}
            isAnimationActive={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
