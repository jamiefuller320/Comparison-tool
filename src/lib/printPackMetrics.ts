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

/** Split shortlist into pages of two half-page note blocks. */
export function chunkPairs<T>(items: T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pages.push(items.slice(i, i + 2));
  }
  return pages;
}
