/**
 * Crop a trend chart Y-axis to the published data band (with padding),
 * instead of always using the full 0–100% or 80–120 score frame.
 */

export type HistoryChartUnit = "pct" | "score" | "count";

export function yDomainFromHistoryData(
  rows: Array<Record<string, unknown>>,
  valueKeys: string[],
  unit: HistoryChartUnit,
): [number, number] | ["auto", "auto"] {
  const values: number[] = [];
  for (const row of rows) {
    if (row.gap === true) continue;
    for (const key of valueKeys) {
      const raw = row[key];
      if (typeof raw === "number" && Number.isFinite(raw)) values.push(raw);
    }
  }

  if (!values.length) {
    if (unit === "pct") return [0, 100];
    if (unit === "score") return [80, 120];
    return ["auto", "auto"];
  }

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    const pad = unit === "pct" ? 5 : unit === "score" ? 2 : Math.max(1, min * 0.05);
    min -= pad;
    max += pad;
  } else {
    const span = max - min;
    const pad = Math.max(
      span * 0.12,
      unit === "pct" ? 2 : unit === "score" ? 0.5 : 1,
    );
    min -= pad;
    max += pad;
  }

  if (unit === "pct") {
    min = Math.max(0, Math.floor(min));
    max = Math.min(100, Math.ceil(max));
    if (max - min < 5) {
      const mid = (min + max) / 2;
      min = Math.max(0, Math.floor(mid - 3));
      max = Math.min(100, Math.ceil(mid + 3));
    }
    return [min, max];
  }

  if (unit === "score") {
    min = Math.floor(min * 10) / 10;
    max = Math.ceil(max * 10) / 10;
    return [min, max];
  }

  min = Math.max(0, Math.floor(min));
  max = Math.ceil(max);
  return [min, max];
}
