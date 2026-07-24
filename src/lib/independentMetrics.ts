import type { IndependentBenchmarkSet, SchoolRecord } from "@/lib/types";

export type IndependentMetricKey =
  | "att8Average"
  | "engMath94Percent"
  | "engMath95Percent"
  | "anyPassPercent"
  | "ebaccEnteringPercent"
  | "ebacc94Percent"
  | "ebaccAps"
  | "ks4Pupils"
  | "ofstedOverall"
  | "ofstedQualityOfEducation"
  | "ofstedLeadership"
  | "ofstedIssCompliance";

export interface IndependentMetric {
  key: IndependentMetricKey;
  label: string;
  group: "outcomes" | "pathways" | "inspection" | "cohort";
  unit: "pct" | "score" | "count" | "text";
  parentHint: string;
  get: (s: SchoolRecord) => number | string | null | undefined;
}

/** Parental metrics for independent schools (KS4 + Ofsted), not KS2 tables. */
export const INDEPENDENT_METRICS: IndependentMetric[] = [
  {
    key: "att8Average",
    label: "Attainment 8",
    group: "outcomes",
    unit: "score",
    parentHint: "Average GCSE point score across eight subjects (published KS4 tables).",
    get: (s) => s.att8Average,
  },
  {
    key: "engMath94Percent",
    label: "English & maths grade 4+",
    group: "outcomes",
    unit: "pct",
    parentHint: "Share achieving grade 4 or above in both English and maths GCSEs.",
    get: (s) => s.engMath94Percent,
  },
  {
    key: "engMath95Percent",
    label: "English & maths grade 5+",
    group: "outcomes",
    unit: "pct",
    parentHint: "Share achieving grade 5 or above in both English and maths GCSEs.",
    get: (s) => s.engMath95Percent,
  },
  {
    key: "anyPassPercent",
    label: "Any GCSE pass",
    group: "outcomes",
    unit: "pct",
    parentHint: "Share achieving any pass at GCSE or equivalent.",
    get: (s) => s.anyPassPercent,
  },
  {
    key: "ebaccEnteringPercent",
    label: "Entering EBacc",
    group: "pathways",
    unit: "pct",
    parentHint: "Share entered for the English Baccalaureate subject combination.",
    get: (s) => s.ebaccEnteringPercent,
  },
  {
    key: "ebacc94Percent",
    label: "EBacc grade 4+",
    group: "pathways",
    unit: "pct",
    parentHint: "Share achieving grades 4 or above across the EBacc subjects.",
    get: (s) => s.ebacc94Percent,
  },
  {
    key: "ebaccAps",
    label: "EBacc average point score",
    group: "pathways",
    unit: "score",
    parentHint: "Average points across the EBacc pillars.",
    get: (s) => s.ebaccAps,
  },
  {
    key: "ofstedOverall",
    label: "Ofsted overall",
    group: "inspection",
    unit: "text",
    parentHint:
      "Latest published Ofsted grade for non-association independents (ISI schools use a different inspectorate).",
    get: (s) => s.ofstedOverall,
  },
  {
    key: "ofstedQualityOfEducation",
    label: "Quality of education",
    group: "inspection",
    unit: "text",
    parentHint: "Ofsted quality of education judgement where published.",
    get: (s) => s.ofstedQualityOfEducation,
  },
  {
    key: "ofstedLeadership",
    label: "Leadership & management",
    group: "inspection",
    unit: "text",
    parentHint: "Ofsted leadership judgement where published.",
    get: (s) => s.ofstedLeadership,
  },
  {
    key: "ofstedIssCompliance",
    label: "Independent School Standards",
    group: "inspection",
    unit: "text",
    parentHint: "Whether the school met the Independent School Standards at the latest standard inspection.",
    get: (s) => s.ofstedIssCompliance,
  },
  {
    key: "ks4Pupils",
    label: "KS4 cohort size",
    group: "cohort",
    unit: "count",
    parentHint: "Number of pupils at the end of Key Stage 4 in the published results.",
    get: (s) => s.ks4Pupils,
  },
];

export function independentBenchmarkValue(
  bench: IndependentBenchmarkSet | undefined,
  key: IndependentMetricKey,
): number | null | undefined {
  if (!bench) return null;
  const value = bench[key as keyof IndependentBenchmarkSet];
  return typeof value === "number" ? value : null;
}
