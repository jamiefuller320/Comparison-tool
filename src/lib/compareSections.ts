import type { SchoolRecord } from "@/lib/types";
import { admissionsSummaryGapLabel, schoolHasAdmissionsPlaces } from "@/lib/admissionsPlaces";
import { schoolHasInspectionPrecis } from "@/lib/inspectionHighlights";
import { schoolHasQualitativeCapture } from "@/lib/qualitativeEvidence";

export type CompareSectionId =
  | "ofsted"
  | "website"
  | "places"
  | "performance";

export const COMPARE_SECTION_ORDER: CompareSectionId[] = [
  "ofsted",
  "website",
  "places",
  "performance",
];

export const COMPARE_SECTION_META: Record<
  CompareSectionId,
  { label: string; short: string; step: number; lead: string }
> = {
  ofsted: {
    label: "Ofsted",
    short: "Ofsted",
    step: 1,
    lead:
      "Inspection précis and published grades from Ofsted or ISI — prepare visit questions, not a final verdict.",
  },
  website: {
    label: "Website evidence",
    short: "Website",
    step: 2,
    lead:
      "Paragraph summaries from each setting’s own website and documents — curriculum, clubs, and ethos in their words.",
  },
  places: {
    label: "Places & offers",
    short: "Places",
    step: 3,
    lead:
      "Published capacity fill and National Offer Day preference counts — how contested a school has been, not your chance of getting in.",
  },
  performance: {
    label: "Performance statistics",
    short: "Stats",
    step: 4,
    lead:
      "Published attainment and progress figures from official tables — patterns to discuss on visits, not league-table rankings.",
  },
};

export function schoolHasOfstedSection(school: SchoolRecord): boolean {
  return Boolean(
    schoolHasInspectionPrecis(school) ||
      school.ofstedOverall ||
      school.ofstedReportUrl ||
      school.isiReportsUrl ||
      school.isiLatestReportUrl,
  );
}

export function schoolHasPlacesSection(school: SchoolRecord): boolean {
  return Boolean(
    schoolHasAdmissionsPlaces(school) || admissionsSummaryGapLabel(school),
  );
}

export function compareSectionHasData(
  id: CompareSectionId,
  schools: SchoolRecord[],
): boolean {
  if (schools.length === 0) return false;
  switch (id) {
    case "ofsted":
      return schools.some(schoolHasOfstedSection);
    case "website":
      return schools.some(schoolHasQualitativeCapture);
    case "places":
      return schools.some(schoolHasPlacesSection);
    case "performance":
      return true;
    default:
      return false;
  }
}

export function compareSectionSummary(
  id: CompareSectionId,
  schools: SchoolRecord[],
): string | undefined {
  const n = schools.length;
  if (n === 0) return undefined;

  switch (id) {
    case "ofsted": {
      const count = schools.filter(schoolHasOfstedSection).length;
      if (count === 0) return "No inspection précis or grades in this shortlist";
      return `${count} of ${n} with inspection data`;
    }
    case "website": {
      const count = schools.filter(schoolHasQualitativeCapture).length;
      if (count === 0) return "No website capture yet for this shortlist";
      return `${count} of ${n} with website evidence`;
    }
    case "places": {
      const count = schools.filter(schoolHasPlacesSection).length;
      if (count === 0) return "No places or offer figures for this shortlist";
      return `${count} of ${n} with places context`;
    }
    case "performance":
      return `${n} setting${n === 1 ? "" : "s"} on this board`;
    default:
      return undefined;
  }
}
