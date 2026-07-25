import type { EyfspAreaBench, EyfspBenchmarkSet } from "@/lib/types";
import { SEED_LOCAL_AUTHORITY } from "@/lib/seedScope";

export type EyfspMetricKey =
  | "gldPercent"
  | "allElgsExpectedPercent"
  | "commLangLitExpectedPercent"
  | "elgsExpectedAverage"
  | "childrenCount";

export interface EyfspMetric {
  key: EyfspMetricKey;
  label: string;
  unit: "pct" | "score" | "count";
  parentHint: string;
  get: (area: EyfspAreaBench | undefined) => number | null | undefined;
}

/** Parental EYFSP metrics — area context only (England / LA). */
export const EYFSP_METRICS: EyfspMetric[] = [
  {
    key: "gldPercent",
    label: "Good level of development (GLD)",
    unit: "pct",
    parentHint:
      "Share of children assessed as having a good level of development at the end of reception (EYFSP).",
    get: (area) => area?.gldPercent,
  },
  {
    key: "commLangLitExpectedPercent",
    label: "Communication, language & literacy expected",
    unit: "pct",
    parentHint:
      "Share at expected level across the Communication & Language and Literacy areas of learning.",
    get: (area) => area?.commLangLitExpectedPercent,
  },
  {
    key: "allElgsExpectedPercent",
    label: "Expected across all early learning goals",
    unit: "pct",
    parentHint:
      "Share of children at the expected level in every early learning goal.",
    get: (area) => area?.allElgsExpectedPercent,
  },
  {
    key: "elgsExpectedAverage",
    label: "Average ELGs at expected level",
    unit: "score",
    parentHint:
      "Average number of early learning goals (of 17) at the expected level per child.",
    get: (area) => area?.elgsExpectedAverage,
  },
  {
    key: "childrenCount",
    label: "Children in the EYFSP return",
    unit: "count",
    parentHint: "Number of children included in the area EYFSP figures.",
    get: (area) => area?.childrenCount,
  },
];

export function eyfspEngland(
  pack: EyfspBenchmarkSet | undefined,
): EyfspAreaBench | undefined {
  return pack?.england;
}

export function eyfspForSeedLa(
  pack: EyfspBenchmarkSet | undefined,
  la: string = SEED_LOCAL_AUTHORITY,
): EyfspAreaBench | undefined {
  return pack?.localAuthorities?.[la];
}
