/**
 * Graphical coverage model: what each shortlisted school has across
 * outcomes / inspection / précis / directory — without inventing figures.
 */

import type { ChallengeBoardId } from "@/lib/sourceStamp";
import type { SchoolRecord } from "@/lib/types";
import {
  GAP_REASON_LEGEND,
  type DataGap,
  type GapReasonCode,
  hasPublishedKs4OrKs5,
  inspectorateIsIsi,
  schoolGaps,
} from "@/lib/dataGaps";
import { schoolHasInspectionPrecis } from "@/lib/inspectionHighlights";
import { schoolOffersKs2, schoolOffersSecondary } from "@/lib/phases";
import { resolveSchoolSector } from "@/lib/sectors";

export type CoverageDimensionId =
  | "outcomes"
  | "inspection"
  | "precis"
  | "directory";

export interface CoverageDimension {
  id: CoverageDimensionId;
  label: string;
  /** Short help for the legend. */
  hint: string;
}

export const COVERAGE_DIMENSIONS: CoverageDimension[] = [
  {
    id: "outcomes",
    label: "Published outcomes",
    hint: "DfE table figures for this path (KS2 RWM, KS4/16–18, or Ofsted grade cells).",
  },
  {
    id: "inspection",
    label: "Inspection link",
    hint: "Ofsted provider page and/or ISI profile / latest report.",
  },
  {
    id: "precis",
    label: "Report précis",
    hint: "Verbatim excerpt from a usable Ofsted/ISI inspection PDF.",
  },
  {
    id: "directory",
    label: "Directory context",
    hint: "Website, GIAS, or other directory links — not DfE attainment cells.",
  },
];

export interface SchoolCoverage {
  urn: string;
  name: string;
  present: Record<CoverageDimensionId, boolean>;
  gaps: DataGap[];
  reasonCodes: GapReasonCode[];
  hasSecondaryContext: boolean;
}

export interface CoverageSummary {
  board: ChallengeBoardId;
  schools: SchoolCoverage[];
  totals: Record<CoverageDimensionId, { present: number; total: number }>;
  legendCodes: GapReasonCode[];
}

function hasInspectionLink(school: SchoolRecord): boolean {
  return Boolean(
    school.ofstedReportUrl ||
      school.isiLatestReportUrl ||
      school.isiProfileUrl ||
      school.isiReportsUrl ||
      school.ofstedOverall ||
      school.ofstedIssCompliance,
  );
}

function hasDirectoryContext(school: SchoolRecord): boolean {
  return Boolean(
    school.schoolWebsite ||
      school.giasUrl ||
      school.compareUrl ||
      school.telephone ||
      school.address,
  );
}

/** True when we can show a quarantined secondary-context pane for this school. */
export function hasSecondaryContext(school: SchoolRecord): boolean {
  return Boolean(
    school.schoolWebsite ||
      school.isiLatestReportUrl ||
      school.isiProfileUrl ||
      school.isiReportsUrl ||
      school.giasUrl ||
      schoolHasInspectionPrecis(school) ||
      inspectorateIsIsi(school),
  );
}

export function outcomesPresent(
  school: SchoolRecord,
  board: ChallengeBoardId,
): boolean {
  if (board === "ks4") {
    return hasPublishedKs4OrKs5(school);
  }
  if (board === "ks2") {
    if (resolveSchoolSector(school) === "independent") {
      // Independents are not expected to have state KS2 RWM — treat as N/A present
      // only when they somehow have a figure; otherwise coverage uses directory/inspection.
      return school.rwmExpected != null;
    }
    return school.rwmExpected != null;
  }
  if (board === "early-years-ofsted" || board === "childminders") {
    return Boolean(school.ofstedOverall);
  }
  return true;
}

export function buildSchoolCoverage(
  school: SchoolRecord,
  board: ChallengeBoardId,
  allGaps: DataGap[],
): SchoolCoverage {
  const gaps = schoolGaps(allGaps, school.urn);
  const reasonCodes = [
    ...new Set(
      gaps
        .map((g) => g.reasonCode)
        .filter((c): c is GapReasonCode => Boolean(c)),
    ),
  ];
  const present: Record<CoverageDimensionId, boolean> = {
    outcomes: outcomesPresent(school, board),
    inspection: hasInspectionLink(school),
    precis: schoolHasInspectionPrecis(school),
    directory: hasDirectoryContext(school),
  };
  // KS2 independents: outcomes dimension is expected-empty — don't paint as a red gap bar.
  if (
    board === "ks2" &&
    resolveSchoolSector(school) === "independent" &&
    school.rwmExpected == null
  ) {
    // Keep false but callers treat indie KS2 outcomes as "not expected".
  }
  return {
    urn: school.urn,
    name: school.name,
    present,
    gaps,
    reasonCodes,
    hasSecondaryContext: hasSecondaryContext(school),
  };
}

export function buildCoverageSummary(
  schools: SchoolRecord[],
  board: ChallengeBoardId,
  allGaps: DataGap[],
): CoverageSummary {
  const byUrn = new Map(schools.map((s) => [s.urn, s]));
  const rows = schools.map((s) => buildSchoolCoverage(s, board, allGaps));
  const totals = Object.fromEntries(
    COVERAGE_DIMENSIONS.map((dim) => {
      let present = 0;
      let total = 0;
      for (const row of rows) {
        const school = byUrn.get(row.urn);
        // Skip outcomes tally for independents on KS2 — not a DfE expectation.
        if (
          dim.id === "outcomes" &&
          board === "ks2" &&
          school &&
          resolveSchoolSector(school) === "independent"
        ) {
          continue;
        }
        total += 1;
        if (row.present[dim.id]) present += 1;
      }
      return [dim.id, { present, total }];
    }),
  ) as Record<CoverageDimensionId, { present: number; total: number }>;

  const legendCodes = [
    ...new Set(rows.flatMap((r) => r.reasonCodes)),
  ] as GapReasonCode[];

  return { board, schools: rows, totals, legendCodes };
}

export function reasonLegendEntries(codes: GapReasonCode[]) {
  return codes.map((code) => ({ code, ...GAP_REASON_LEGEND[code] }));
}

export interface SecondaryContextItem {
  id: string;
  label: string;
  href?: string | null;
  text?: string | null;
}

/**
 * Directory / inspection links for the quarantined secondary pane.
 * Never includes DfE attainment numbers.
 */
export function secondaryContextItems(
  school: SchoolRecord,
): SecondaryContextItem[] {
  const items: SecondaryContextItem[] = [];
  const inspectorate =
    school.inspectorateName || school.ofstedInspectorate || null;
  if (inspectorate) {
    items.push({
      id: "inspectorate",
      label: "Inspectorate",
      text: inspectorate,
    });
  }
  if (school.isiLatestReportUrl) {
    items.push({
      id: "isi-latest",
      label: school.isiLatestReportTitle || "Latest ISI report",
      href: school.isiLatestReportUrl,
      text: school.isiLatestReportDate
        ? `Dated ${school.isiLatestReportDate}`
        : "ISI inspection PDF",
    });
  }
  if (school.isiProfileUrl || school.isiReportsUrl) {
    items.push({
      id: "isi-profile",
      label: "ISI reports directory",
      href: school.isiProfileUrl || school.isiReportsUrl,
      text: "Open ISI listing",
    });
  }
  if (school.ofstedReportUrl) {
    items.push({
      id: "ofsted",
      label: "Ofsted provider page",
      href: school.ofstedReportUrl,
      text: school.ofstedOverall
        ? `Overall: ${school.ofstedOverall}`
        : "Reports & registration",
    });
  }
  if (school.schoolWebsite) {
    items.push({
      id: "website",
      label: "School website",
      href: school.schoolWebsite,
      text: "Prospectus / admissions (school-published)",
    });
  }
  if (school.giasUrl) {
    items.push({
      id: "gias",
      label: "GIAS record",
      href: school.giasUrl,
      text: "Get Information about Schools",
    });
  }
  if (school.compareUrl) {
    items.push({
      id: "compare",
      label: "Official performance tables",
      href: school.compareUrl,
      text: "DfE Compare school performance",
    });
  }
  if (schoolHasInspectionPrecis(school) && school.inspectionPrecis) {
    items.push({
      id: "precis",
      label: "Inspection précis (verbatim)",
      href: school.inspectionReportFileUrl || school.ofstedReportUrl,
      text: school.inspectionPrecis,
    });
  }
  return items;
}

/** Prefer showing secondary pane when outcomes are thin but directory/ISI exists. */
export function shouldSuggestSecondaryContext(
  schools: SchoolRecord[],
  board: ChallengeBoardId,
): boolean {
  if (board !== "ks4" && board !== "ks2") return false;
  return schools.some((school) => {
    const indie = resolveSchoolSector(school) === "independent";
    const thinOutcomes =
      board === "ks4"
        ? !hasPublishedKs4OrKs5(school) && schoolOffersSecondary(school)
        : indie && schoolOffersKs2(school) && school.rwmExpected == null;
    return thinOutcomes && hasSecondaryContext(school);
  });
}
