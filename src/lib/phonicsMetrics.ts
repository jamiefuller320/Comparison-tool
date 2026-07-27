import type { PhonicsAreaBench, PhonicsBenchmarkSet } from "@/lib/types";

export type PhonicsMetricKey =
  | "year1Expected"
  | "endYear2Expected"
  | "year1DisadvantagedExpected"
  | "year1Eligible";

export interface PhonicsMetric {
  key: PhonicsMetricKey;
  label: string;
  unit: "pct" | "count";
  parentHint: string;
  get: (area: PhonicsAreaBench | undefined) => number | null | undefined;
}

/** Parental phonics metrics — always area (LA / England), never school scores. */
export const PHONICS_METRICS: PhonicsMetric[] = [
  {
    key: "year1Expected",
    label: "Year 1 phonics — met the standard",
    unit: "pct",
    parentHint:
      "Share of Year 1 pupils in this local authority who met the phonics screening standard.",
    get: (area) => area?.year1Expected,
  },
  {
    key: "endYear2Expected",
    label: "Met phonics standard by end of Year 2",
    unit: "pct",
    parentHint:
      "Share of pupils in this local authority who had met the phonics standard by the end of Year 2 (includes retakes).",
    get: (area) => area?.endYear2Expected,
  },
  {
    key: "year1DisadvantagedExpected",
    label: "Disadvantaged pupils — Year 1 phonics",
    unit: "pct",
    parentHint:
      "Year 1 phonics expected standard for disadvantaged pupils in this local authority.",
    get: (area) => area?.year1DisadvantagedExpected,
  },
  {
    key: "year1Eligible",
    label: "Year 1 pupils in the LA check",
    unit: "count",
    parentHint:
      "Number of Year 1 pupils included in the local authority phonics figures (context only).",
    get: (area) => area?.year1Eligible,
  },
];

export function phonicsForSchool(
  school: { localAuthority?: string | null },
  pack: PhonicsBenchmarkSet | undefined,
): PhonicsAreaBench | undefined {
  if (!pack || !school.localAuthority) return undefined;
  return pack.localAuthorities?.[school.localAuthority];
}

export function phonicsEngland(
  pack: PhonicsBenchmarkSet | undefined,
): PhonicsAreaBench | undefined {
  return pack?.england;
}

/** When every shortlisted school shares one LA (Hampshire maintained set), collapse duplicate columns. */
export function sharedPhonicsLaName(
  schools: { localAuthority?: string | null }[],
): string | null {
  const names = [
    ...new Set(
      schools
        .map((s) => (s.localAuthority || "").trim())
        .filter(Boolean),
    ),
  ];
  return names.length === 1 ? names[0] : null;
}
