import type { MetricKey, SchoolRecord } from "@/lib/types";

export interface ParentMetric {
  key: MetricKey;
  label: string;
  group: "outcomes" | "depth" | "cohort" | "equity";
  unit: "pct" | "score" | "count";
  parentHint: string;
  get: (s: SchoolRecord) => number | null | undefined;
}

/** Metrics ordered for parental decision-making, not governance challenge. */
export const PARENT_METRICS: ParentMetric[] = [
  {
    key: "rwmExpected",
    label: "Reading, writing & maths (expected)",
    group: "outcomes",
    unit: "pct",
    parentHint: "Share of Year 6 pupils meeting the expected standard in all three.",
    get: (s) => s.rwmExpected,
  },
  {
    key: "rwmHigher",
    label: "Reading, writing & maths (higher)",
    group: "outcomes",
    unit: "pct",
    parentHint: "Share reaching the higher standard across reading, writing and maths.",
    get: (s) => s.rwmHigher,
  },
  {
    key: "readingExpected",
    label: "Reading (expected)",
    group: "outcomes",
    unit: "pct",
    parentHint: "Year 6 reading test — expected standard.",
    get: (s) => s.readingExpected,
  },
  {
    key: "writingExpected",
    label: "Writing (expected)",
    group: "outcomes",
    unit: "pct",
    parentHint: "Teacher-assessed writing — expected standard.",
    get: (s) => s.writingExpected,
  },
  {
    key: "mathsExpected",
    label: "Maths (expected)",
    group: "outcomes",
    unit: "pct",
    parentHint: "Year 6 maths test — expected standard.",
    get: (s) => s.mathsExpected,
  },
  {
    key: "gpsExpected",
    label: "Grammar & spelling (expected)",
    group: "outcomes",
    unit: "pct",
    parentHint: "Grammar, punctuation and spelling test.",
    get: (s) => s.gpsExpected,
  },
  {
    key: "scienceExpected",
    label: "Science (expected)",
    group: "outcomes",
    unit: "pct",
    parentHint: "Teacher-assessed science — expected standard.",
    get: (s) => s.scienceExpected,
  },
  {
    key: "readingScaled",
    label: "Reading average scaled score",
    group: "depth",
    unit: "score",
    parentHint: "100 is the expected standard; higher means stronger reading attainment.",
    get: (s) => s.readingScaled,
  },
  {
    key: "mathsScaled",
    label: "Maths average scaled score",
    group: "depth",
    unit: "score",
    parentHint: "100 is the expected standard; higher means stronger maths attainment.",
    get: (s) => s.mathsScaled,
  },
  {
    key: "eligiblePupils",
    label: "Year 6 cohort size",
    group: "cohort",
    unit: "count",
    parentHint: "Number of pupils in the published results — small cohorts swing more year to year.",
    get: (s) => s.eligiblePupils,
  },
  {
    key: "disadvantagedPercent",
    label: "Disadvantaged pupils",
    group: "cohort",
    unit: "pct",
    parentHint: "Share of the cohort classed as disadvantaged (context for outcomes, not a quality score).",
    get: (s) => s.disadvantagedPercent,
  },
  {
    key: "boysRwmExpected",
    label: "Boys — RWM expected",
    group: "equity",
    unit: "pct",
    parentHint: "How boys in this cohort fared on the combined measure.",
    get: (s) => s.boysRwmExpected,
  },
  {
    key: "girlsRwmExpected",
    label: "Girls — RWM expected",
    group: "equity",
    unit: "pct",
    parentHint: "How girls in this cohort fared on the combined measure.",
    get: (s) => s.girlsRwmExpected,
  },
  {
    key: "disadvantagedRwmExpected",
    label: "Disadvantaged — RWM expected",
    group: "equity",
    unit: "pct",
    parentHint: "Outcomes for disadvantaged pupils in this cohort.",
    get: (s) => s.disadvantagedRwmExpected,
  },
];
