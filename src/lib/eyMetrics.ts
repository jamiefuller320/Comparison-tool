import type { SchoolRecord } from "@/lib/types";

export function isEyProvider(record: {
  urn?: string | null;
  source?: string | null;
}): boolean {
  if (record.source === "ofsted-childcare") return true;
  return Boolean(record.urn && record.urn.startsWith("ey:"));
}

/** Consented childminder / domestic childcare (directory + map, not Ofsted board). */
export function isChildminder(record: {
  urn?: string | null;
  source?: string | null;
}): boolean {
  if (record.source === "ofsted-consented-childminder") return true;
  return Boolean(record.urn && record.urn.startsWith("cm:"));
}

/**
 * Hampshire EY settings that bypass school-type filters in search/map when
 * Early years is selected (day care + consented childminders).
 */
export function isEyDirectorySetting(record: {
  urn?: string | null;
  source?: string | null;
}): boolean {
  return isEyProvider(record) || isChildminder(record);
}

export interface EyDisplayMetric {
  key: string;
  label: string;
  parentHint: string;
  unit: "text" | "count" | "date";
  get: (s: SchoolRecord) => string | number | null | undefined;
}

/** Side-by-side fields for Ofsted childcare providers. */
export const EY_PROVIDER_METRICS: EyDisplayMetric[] = [
  {
    key: "ofstedOverall",
    label: "Ofsted overall effectiveness",
    parentHint: "Most recent full inspection overall grade from Ofsted.",
    unit: "text",
    get: (s) => s.ofstedOverall,
  },
  {
    key: "ofstedQualityOfEducation",
    label: "Quality of education",
    parentHint: "Ofsted judgement for quality of education, when published.",
    unit: "text",
    get: (s) => s.ofstedQualityOfEducation,
  },
  {
    key: "ofstedBehaviourAndAttitudes",
    label: "Behaviour and attitudes",
    parentHint: "Ofsted judgement for behaviour and attitudes, when published.",
    unit: "text",
    get: (s) => s.ofstedBehaviourAndAttitudes,
  },
  {
    key: "ofstedPersonalDevelopment",
    label: "Personal development",
    parentHint: "Ofsted judgement for personal development, when published.",
    unit: "text",
    get: (s) => s.ofstedPersonalDevelopment,
  },
  {
    key: "ofstedLeadership",
    label: "Leadership and management",
    parentHint:
      "Ofsted judgement for effectiveness of leadership and management.",
    unit: "text",
    get: (s) => s.ofstedLeadership,
  },
  {
    key: "ofstedSafeguardingEffective",
    label: "Safeguarding effective?",
    parentHint: "Whether Ofsted judged safeguarding to be effective.",
    unit: "text",
    get: (s) => s.ofstedSafeguardingEffective,
  },
  {
    key: "ofstedInspectionDate",
    label: "Inspection date",
    parentHint: "Date of the most recent full inspection in Ofsted’s MI.",
    unit: "date",
    get: (s) => s.ofstedInspectionDate,
  },
  {
    key: "places",
    label: "Registered places",
    parentHint: "Places recorded on the Ofsted childcare register.",
    unit: "count",
    get: (s) => s.places ?? s.placesIncludingEstimates,
  },
  {
    key: "providerSubtype",
    label: "Provider type",
    parentHint: "Ofsted subtype (for example full day care or sessional).",
    unit: "text",
    get: (s) => s.providerSubtype || s.schoolTypeLabel,
  },
];
