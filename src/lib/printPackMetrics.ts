/**
 * Compact metric sets for printable shortlist / visit packs.
 * Keeps the table short enough for one A4 landscape-friendly compare sheet.
 */

import type { SchoolRecord } from "@/lib/types";
import type { GuidancePathId } from "@/lib/decisionGuidance";
import { PARENT_METRICS } from "@/lib/metrics";
import { INDEPENDENT_METRICS } from "@/lib/independentMetrics";
import { EY_PROVIDER_METRICS } from "@/lib/eyMetrics";
import { fmtNum, fmtPct, shortName } from "@/lib/format";

export interface PrintMetricRow {
  id: string;
  label: string;
  values: string[];
}

export interface PrintCompareTable {
  title: string;
  caption: string;
  columns: string[];
  rows: PrintMetricRow[];
}

function formatMetric(
  value: number | string | null | undefined,
  unit: "pct" | "score" | "count" | "text" | "date",
): string {
  if (value == null || value === "") return "—";
  if (unit === "text" || unit === "date") return String(value);
  if (unit === "pct") return fmtPct(Number(value));
  if (unit === "count") return fmtNum(Number(value), 0);
  return fmtNum(Number(value), 1);
}

const KS2_PRINT_KEYS = [
  "rwmExpected",
  "rwmHigher",
  "readingExpected",
  "writingExpected",
  "mathsExpected",
  "readingScaled",
  "mathsScaled",
  "eligiblePupils",
] as const;

const KS4_PRINT_KEYS = [
  "att8Average",
  "engMath94Percent",
  "engMath95Percent",
  "anyPassPercent",
  "ebaccEng94Percent",
  "ebaccMat94Percent",
  "ks5ApsPerEntry",
  "ofstedOverall",
] as const;

const EY_PRINT_KEYS = [
  "ofstedOverall",
  "ofstedEarlyYearsProvision",
  "ofstedQualityOfEducation",
  "ofstedBehaviourAndAttitudes",
  "ofstedLeadership",
  "ofstedInspectionDate",
  "places",
] as const;

function columnLabels(schools: SchoolRecord[]): string[] {
  return schools.map((s) => shortName(s.name, 22));
}

export function buildPrintCompareTable(
  schools: SchoolRecord[],
  path: GuidancePathId,
): PrintCompareTable | null {
  if (!schools.length) return null;
  const columns = columnLabels(schools);

  if (path === "ks2" || path === "ks1") {
    const metrics = PARENT_METRICS.filter((m) =>
      (KS2_PRINT_KEYS as readonly string[]).includes(m.key),
    );
    return {
      title:
        path === "ks1"
          ? "Published figures (KS2 context for infant / primary shortlist)"
          : "Published Key Stage 2 figures",
      caption:
        "DfE Compare school performance. Dash = not published. Not a league table.",
      columns,
      rows: metrics.map((m) => ({
        id: m.key,
        label: m.label,
        values: schools.map((s) => formatMetric(m.get(s), m.unit)),
      })),
    };
  }

  if (path === "ks4") {
    const metrics = INDEPENDENT_METRICS.filter((m) =>
      (KS4_PRINT_KEYS as readonly string[]).includes(m.key),
    );
    return {
      title: "Published Key Stage 4 / 16–18 figures",
      caption:
        "DfE tables plus Ofsted overall where joined. Dash = not published or not comparable.",
      columns,
      rows: metrics.map((m) => ({
        id: m.key,
        label: m.label,
        values: schools.map((s) => formatMetric(m.get(s), m.unit)),
      })),
    };
  }

  if (path === "early-years" || path === "childminders") {
    const metrics = EY_PROVIDER_METRICS.filter((m) =>
      (EY_PRINT_KEYS as readonly string[]).includes(m.key),
    );
    // Childminders: slim further.
    const rows =
      path === "childminders"
        ? metrics.filter((m) =>
            ["ofstedOverall", "ofstedInspectionDate", "places"].includes(m.key),
          )
        : metrics;
    return {
      title:
        path === "childminders"
          ? "Childminder directory figures"
          : "Early years Ofsted grades",
      caption:
        "Ofsted grades from the published MI / consented directory. Dash = missing in this pack.",
      columns,
      rows: rows.map((m) => ({
        id: m.key,
        label: m.label,
        values: schools.map((s) => formatMetric(m.get(s), m.unit)),
      })),
    };
  }

  return null;
}

/** Series for a print-only SVG bar chart (no Recharts — iOS-safe). */
export interface PrintChartSeries {
  title: string;
  caption: string;
  /** Measure labels (y categories). */
  measures: string[];
  /** One series per school. */
  schools: Array<{
    urn: string;
    name: string;
    /** Parallel to measures; null = missing. */
    values: Array<number | null>;
  }>;
  /** Axis unit for labels. */
  unit: "pct" | "score";
}

const KS2_CHART_KEYS = [
  { key: "rwmExpected", label: "RWM expected" },
  { key: "readingExpected", label: "Reading" },
  { key: "writingExpected", label: "Writing" },
  { key: "mathsExpected", label: "Maths" },
] as const;

const KS4_SCORE_KEYS = [
  { key: "att8Average", label: "Attainment 8" },
] as const;

const KS4_PCT_KEYS = [
  { key: "engMath94Percent", label: "Eng & maths 4+" },
  { key: "engMath95Percent", label: "Eng & maths 5+" },
  { key: "ebaccEnteringPercent", label: "EBacc entry" },
] as const;

function numericField(
  school: SchoolRecord,
  key: string,
): number | null {
  const raw = (school as Record<string, unknown>)[key];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function chartFromKeys(
  schools: SchoolRecord[],
  keys: ReadonlyArray<{ key: string; label: string }>,
  meta: { title: string; caption: string; unit: "pct" | "score" },
): PrintChartSeries | null {
  const measures = keys.map((m) => m.label);
  const series = schools.map((s) => ({
    urn: s.urn,
    name: shortName(s.name, 18),
    values: keys.map((m) => numericField(s, m.key)),
  }));
  if (!series.some((s) => s.values.some((v) => v != null))) return null;
  return { ...meta, measures, schools: series };
}

/** Print-safe chart series for the pack graphs sheet (empty when not applicable). */
export function buildPrintChartSeries(
  schools: SchoolRecord[],
  path: GuidancePathId,
): PrintChartSeries[] {
  if (schools.length < 1 || schools.length > 4) return [];

  if (path === "ks2" || path === "ks1") {
    const chart = chartFromKeys(schools, KS2_CHART_KEYS, {
      title:
        path === "ks1"
          ? "Published attainment snapshot (KS2 context)"
          : "Published Key Stage 2 attainment",
      caption:
        "Percentages at expected standard. Dash on the figures sheet = not published.",
      unit: "pct",
    });
    return chart ? [chart] : [];
  }

  if (path === "ks4") {
    const out: PrintChartSeries[] = [];
    const score = chartFromKeys(schools, KS4_SCORE_KEYS, {
      title: "Key Stage 4 — Attainment 8",
      caption: "Average Attainment 8 score (not a percentage).",
      unit: "score",
    });
    if (score) out.push(score);
    const pct = chartFromKeys(schools, KS4_PCT_KEYS, {
      title: "Key Stage 4 — GCSE thresholds",
      caption: "Percentages of pupils. Missing bars = not published.",
      unit: "pct",
    });
    if (pct) out.push(pct);
    return out;
  }

  return [];
}
