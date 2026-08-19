import type { SchoolRecord } from "@/lib/types";
import { phasesFromAgeRange } from "@/lib/phases";

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

/** School nursery / infant / primary with an early-years intake. */
export function schoolOffersEarlyYears(school: {
  ageRange?: string | null;
  phases?: string[] | null;
}): boolean {
  if (school.phases?.includes("early-years")) return true;
  return phasesFromAgeRange(school.ageRange).includes("early-years");
}

function hasOfstedEySignal(school: SchoolRecord): boolean {
  return Boolean(
    school.ofstedOverall ||
      school.ofstedEarlyYearsProvision ||
      school.ofstedQualityOfEducation ||
      school.ofstedReportUrl,
  );
}

/**
 * Settings that belong on the EY Ofsted comparison board: Hampshire day-care
 * providers, or state schools with an early-years intake and Ofsted grades.
 * Childminders stay on the directory + checklist path instead.
 */
export function isEyComparable(school: SchoolRecord): boolean {
  if (isChildminder(school)) return false;
  if (isEyProvider(school)) return true;
  if (school.sector === "independent") return false;
  return schoolOffersEarlyYears(school) && hasOfstedEySignal(school);
}

export interface EyDisplayMetric {
  key: string;
  label: string;
  parentHint: string;
  unit: "text" | "count" | "date";
  get: (s: SchoolRecord) => string | number | null | undefined;
}

/** Side-by-side fields for Ofsted childcare and school early-years settings. */
export const EY_PROVIDER_METRICS: EyDisplayMetric[] = [
  {
    key: "ofstedOverall",
    label: "Ofsted overall effectiveness",
    parentHint:
      "Most recent full inspection overall grade from Ofsted. Full/sessional nurseries usually show Outstanding–Inadequate; out-of-school / holiday clubs often show Met or Not met (safeguarding and welfare focus — curriculum domains are not graded the same way).",
    unit: "text",
    get: (s) => {
      if (s.ofstedOverall) return s.ofstedOverall;
      const hasDomains = Boolean(
        s.ofstedEarlyYearsProvision ||
          s.ofstedQualityOfEducation ||
          s.ofstedBehaviourAndAttitudes ||
          s.ofstedPersonalDevelopment ||
          s.ofstedLeadership,
      );
      if (hasDomains || s.ofstedReportUrl) {
        return "Ungraded / report-led";
      }
      return null;
    },
  },
  {
    key: "ofstedEarlyYearsProvision",
    label: "Early years provision",
    parentHint:
      "Ofsted judgement for early years provision in state schools (where published). Blank for most day-care rows.",
    unit: "text",
    get: (s) => s.ofstedEarlyYearsProvision,
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
    parentHint: "Date of the most recent graded inspection in Ofsted’s MI.",
    unit: "date",
    get: (s) => s.ofstedInspectionDate,
  },
  {
    key: "places",
    label: "Registered places",
    parentHint:
      "Places on the Ofsted childcare register (day care). Not used for schools.",
    unit: "count",
    get: (s) => s.places ?? s.placesIncludingEstimates,
  },
  {
    key: "providerSubtype",
    label: "Provider / school type",
    parentHint:
      "Ofsted subtype for day care (Full, Sessional, or Out-of-school), or school phase / type label.",
    unit: "text",
    get: (s) => s.providerSubtype || s.schoolTypeLabel || s.phase,
  },
];
