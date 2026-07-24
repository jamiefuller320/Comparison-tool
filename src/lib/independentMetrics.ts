import type { IndependentBenchmarkSet, SchoolRecord } from "@/lib/types";

export type IndependentMetricKey =
  | "att8Average"
  | "engMath94Percent"
  | "engMath95Percent"
  | "anyPassPercent"
  | "ebaccEng94Percent"
  | "ebaccMat94Percent"
  | "ebaccEnteringPercent"
  | "ebacc94Percent"
  | "ebaccAps"
  | "ks5ApsPerEntry"
  | "ks5Best3Aps"
  | "ks5ValueAdded"
  | "ks5AlevelStudents"
  | "ks4Pupils"
  | "ofstedOverall"
  | "ofstedQualityOfEducation"
  | "ofstedLeadership"
  | "ofstedIssCompliance"
  | "inspectorateName";

export interface IndependentMetric {
  key: IndependentMetricKey;
  label: string;
  group: "outcomes" | "pathways" | "ks5" | "inspection" | "cohort";
  unit: "pct" | "score" | "count" | "text";
  parentHint: string;
  get: (s: SchoolRecord) => number | string | null | undefined;
  /** Optional per-cell note when the value is blank. */
  blankHint?: (s: SchoolRecord) => string | null;
}

function engMathBlankHint(school: SchoolRecord): string | null {
  if (school.engMath94IsPillarFallback) return null;
  if (school.engMathMeasureUnavailable) {
    return "Nil / IGCSE-style return — not comparable GCSE basics";
  }
  const cleared = school.ks4ClearedNilFields || [];
  if (
    cleared.includes("engMath94Percent") ||
    cleared.includes("engMath95Percent")
  ) {
    return "Cleared as a nil return — see EBacc English/maths pillars";
  }
  return null;
}

/** Parental metrics for independent schools (KS4 + inspection), not KS2 tables. */
export const INDEPENDENT_METRICS: IndependentMetric[] = [
  {
    key: "att8Average",
    label: "Attainment 8",
    group: "outcomes",
    unit: "score",
    parentHint: "Average point score across eight qualifications in the KS4 tables.",
    get: (s) => s.att8Average,
  },
  {
    key: "engMath94Percent",
    label: "English & maths grade 4+",
    group: "outcomes",
    unit: "pct",
    parentHint:
      "Combined GCSE English & maths 4+. Nil/IGCSE returns are shown as —; where needed this uses the lower of the EBacc English and maths pillars.",
    get: (s) => s.engMath94Percent,
    blankHint: engMathBlankHint,
  },
  {
    key: "engMath95Percent",
    label: "English & maths grade 5+",
    group: "outcomes",
    unit: "pct",
    parentHint: "Combined GCSE English & maths 5+, when the DfE measure is published.",
    get: (s) => s.engMath95Percent,
    blankHint: engMathBlankHint,
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
    key: "ebaccEng94Percent",
    label: "EBacc English 4+",
    group: "pathways",
    unit: "pct",
    parentHint:
      "English pillar at grade 4+ — useful when the combined English & maths GCSE measure is a nil return.",
    get: (s) => s.ebaccEng94Percent,
  },
  {
    key: "ebaccMat94Percent",
    label: "EBacc maths 4+",
    group: "pathways",
    unit: "pct",
    parentHint:
      "Maths pillar at grade 4+ — often still published when combined English & maths is missing.",
    get: (s) => s.ebaccMat94Percent,
  },
  {
    key: "ebaccEnteringPercent",
    label: "Entering EBacc",
    group: "pathways",
    unit: "pct",
    parentHint: "Share entered for the full English Baccalaureate subject combination.",
    get: (s) => s.ebaccEnteringPercent,
  },
  {
    key: "ebacc94Percent",
    label: "EBacc grade 4+",
    group: "pathways",
    unit: "pct",
    parentHint: "Share achieving grades 4+ across the full EBacc (blank if nobody entered).",
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
    key: "ks5ApsPerEntry",
    label: "A-level APS per entry",
    group: "ks5",
    unit: "score",
    parentHint:
      "Average point score per A-level entry for students at the end of 16–18 study.",
    get: (s) => s.ks5ApsPerEntry,
  },
  {
    key: "ks5Best3Aps",
    label: "Best 3 A-levels APS",
    group: "ks5",
    unit: "score",
    parentHint: "Average points across each student’s best three A-level entries.",
    get: (s) => s.ks5Best3Aps,
  },
  {
    key: "ks5ValueAdded",
    label: "A-level value added",
    group: "ks5",
    unit: "score",
    parentHint:
      "Progress score versus similar starters (positive = above average progress).",
    get: (s) => s.ks5ValueAdded,
  },
  {
    key: "ks5AlevelStudents",
    label: "A-level cohort",
    group: "ks5",
    unit: "count",
    parentHint: "Students entered for at least one A level in the published year.",
    get: (s) => s.ks5AlevelStudents ?? s.ks5Students,
  },
  {
    key: "inspectorateName",
    label: "Inspectorate",
    group: "inspection",
    unit: "text",
    parentHint: "Ofsted inspects non-association independents; ISI inspects most association schools.",
    get: (s) => s.inspectorateName || s.ofstedInspectorate,
  },
  {
    key: "ofstedOverall",
    label: "Ofsted overall",
    group: "inspection",
    unit: "text",
    parentHint:
      "Latest Ofsted grade for non-association independents. ISI schools link out to ISI reports instead.",
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
    parentHint: "Whether Independent School Standards were met at the latest standard inspection.",
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
