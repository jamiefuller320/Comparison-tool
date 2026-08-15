/** Known fetch/join / sanitised-nil gaps for comparison boards (not user challenges). */

import type { ChallengeBoardId } from "@/lib/sourceStamp";
import type { PhonicsBenchmarkSet, SchoolRecord } from "@/lib/types";
import { isChildminder, isEyProvider } from "@/lib/eyMetrics";
import {
  phasesFromAgeRange,
  schoolOffersKs2,
  schoolOffersSecondary,
} from "@/lib/phases";
import { phonicsForSchool } from "@/lib/phonicsMetrics";
import { resolveSchoolSector } from "@/lib/sectors";

export type DataGapSeverity = "info" | "watch";

/**
 * Stable reason grammar for gap chips / coverage legend.
 * Kept coarse so parents learn a small set of meanings.
 */
export type GapReasonCode =
  | "not-published"
  | "not-comparable"
  | "too-new"
  | "isi-inspectorate"
  | "ungraded-report"
  | "nil-cleared"
  | "missing-as-at"
  | "missing-grade"
  | "other";

export const GAP_REASON_LEGEND: Record<
  GapReasonCode,
  { short: string; meaning: string }
> = {
  "not-published": {
    short: "Not published",
    meaning:
      "No figure in the latest open DfE / Ofsted tables for this measure — often a small or suppressed cohort.",
  },
  "not-comparable": {
    short: "Not comparable",
    meaning:
      "This setting is not published like a mainstream cohort (for example special/AP, hospital/secure, or no Year 11).",
  },
  "too-new": {
    short: "Too new",
    meaning:
      "Opened recently — a full published cohort may not appear in the latest tables yet.",
  },
  "isi-inspectorate": {
    short: "ISI, not Ofsted grades",
    meaning:
      "Inspected by ISI rather than Ofsted grade cells. Open the ISI report — this does not explain missing attainment.",
  },
  "ungraded-report": {
    short: "Report only",
    meaning:
      "Ungraded / report-led inspection — domains or a report link may exist without an overall grade.",
  },
  "nil-cleared": {
    short: "Nil / IGCSE-style",
    meaning:
      "Combined English & maths was cleared as a nil return; check EBacc pillars where published.",
  },
  "missing-as-at": {
    short: "Pack date missing",
    meaning: "This build is missing the Ofsted/consented register as-at stamp for provenance.",
  },
  "missing-grade": {
    short: "Grade missing in pack",
    meaning: "No overall grade joined into this pack yet — not the same as a failed inspection.",
  },
  other: {
    short: "Known gap",
    meaning: "A known fetch/join hole — see the detail text for this school.",
  },
};

export interface DataGap {
  id: string;
  level: "board" | "school";
  board: ChallengeBoardId;
  severity: DataGapSeverity;
  /** Short chip label. */
  label: string;
  detail?: string;
  urn?: string;
  /** Optional legend code for graphical coverage / detail cards. */
  reasonCode?: GapReasonCode;
}

/** Why a secondary school may lack published KS4 outcome cells. */
export type Ks4MissingReason =
  | "special-ap-pru"
  | "ks3-only"
  | "hospital-secure"
  | "new-establishment"
  | "no-published";

function hasOfstedDomainOrReport(school: SchoolRecord): boolean {
  return Boolean(
    school.ofstedEarlyYearsProvision ||
      school.ofstedQualityOfEducation ||
      school.ofstedBehaviourAndAttitudes ||
      school.ofstedPersonalDevelopment ||
      school.ofstedLeadership ||
      school.ofstedIssCompliance ||
      school.ofstedReportUrl,
  );
}

/** Overall empty but domains/report present — report-led / ungraded visit. */
export function isUngradedOfsted(school: SchoolRecord): boolean {
  return !school.ofstedOverall && hasOfstedDomainOrReport(school);
}

export function hasKs4NilCleared(school: SchoolRecord): boolean {
  if (school.engMathMeasureUnavailable) return true;
  return Boolean(school.ks4ClearedNilFields && school.ks4ClearedNilFields.length);
}

export function inspectorateIsIsi(school: SchoolRecord): boolean {
  const name = (
    school.inspectorateName ||
    school.ofstedInspectorate ||
    ""
  ).toUpperCase();
  return name.includes("ISI") || Boolean(school.isiReportsUrl);
}

/** Special school, alternative provision, or pupil referral unit. */
export function isSpecialApOrPru(school: SchoolRecord): boolean {
  const typeBlob = [school.schoolType, school.schoolTypeLabel, school.phase]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (isHospitalOrSecure(school)) return false;
  if (typeBlob) {
    if (
      /\bpru\b/.test(typeBlob) ||
      typeBlob.includes("pupil referral") ||
      typeBlob.includes("alternative provision") ||
      typeBlob.includes("special school") ||
      typeBlob.includes("special academy") ||
      // DfE type codes / labels: "Community special school", "Academy special converter"
      /\bspecial\b/.test(typeBlob)
    ) {
      return true;
    }
  }
  // Name fallback only for clear specialist wording — avoid bare "special"
  // (false positives like "Specialist language" resource bases on mainstream sites).
  const name = (school.name || "").toLowerCase();
  if (!name) return false;
  return (
    /\bpru\b/.test(name) ||
    name.includes("pupil referral") ||
    name.includes("alternative provision") ||
    /\bspecial school\b/.test(name) ||
    /\bspecial academy\b/.test(name)
  );
}

/** Hospital school or secure unit — usually no comparable Att8. */
export function isHospitalOrSecure(school: SchoolRecord): boolean {
  const type = `${school.schoolType || ""} ${school.schoolTypeLabel || ""}`.toLowerCase();
  const name = (school.name || "").toLowerCase();
  if (type.includes("secure")) return true;
  if (type.includes("hospital") && type.includes("school")) return true;
  // Name-only "Hospital" is used carefully: require non-mainstream type.
  if (name.includes("hospital") && /miscellaneous|special|secure|clinic/.test(type)) {
    return true;
  }
  if (name.includes("clinic school") || name.includes("hospital school")) {
    return true;
  }
  return false;
}

/**
 * Recently opened / new provision relative to the latest KS4 tables year.
 * A school opened in the KS4 academic year often has no full Year 11 cohort yet.
 */
export function isRecentlyOpenedForKs4(
  school: SchoolRecord,
  ks4Year = "2024/2025",
): boolean {
  const reason = (school.reasonEstablishmentOpened || "").toLowerCase();
  const open = school.openDate;
  const endYearMatch = ks4Year.match(/(\d{4})\s*\/\s*(\d{2,4})/);
  const endYear = endYearMatch
    ? endYearMatch[2].length === 2
      ? 2000 + Number(endYearMatch[2])
      : Number(endYearMatch[2])
    : 2025;
  // Opened on/after 1 Sep of (endYear - 2) → unlikely to have sat a full KS4 series.
  const cutoff = `${endYear - 2}-09-01`;
  if (open && open >= cutoff) return true;
  if (reason.includes("new provision") && open && open >= `${endYear - 4}-09-01`) {
    return true;
  }
  return false;
}

/**
 * Age range covers KS3 (Years 7–9) but not a Year 11 / KS4 cohort.
 * These schools can appear under the KS3 chip while KS4 cells stay blank.
 */
export function isKs3OnlySecondary(school: SchoolRecord): boolean {
  const phases = phasesFromAgeRange(school.ageRange);
  return phases.includes("ks3") && !phases.includes("ks4");
}

export function hasPublishedKs4(school: SchoolRecord): boolean {
  return school.att8Average != null;
}

export function hasPublishedKs4OrKs5(school: SchoolRecord): boolean {
  return hasPublishedKs4(school) || school.ks5ApsPerEntry != null;
}

/**
 * Discovery filter for KS3/KS4 stages: keep non-secondaries, and secondaries
 * that publish Attainment 8. When `comparableOnly` is false, everything passes.
 */
export function passesComparableKs4Filter(
  school: SchoolRecord,
  opts: { comparableOnly: boolean; secondaryStagesActive: boolean },
): boolean {
  if (!opts.comparableOnly || !opts.secondaryStagesActive) return true;
  if (!schoolOffersSecondary(school)) return true;
  return hasPublishedKs4(school);
}

/** Classify a secondary with no Att8 / 16–18 APS in the pack. */
export function classifyKs4Missing(school: SchoolRecord): Ks4MissingReason {
  if (isKs3OnlySecondary(school)) return "ks3-only";
  if (isHospitalOrSecure(school)) return "hospital-secure";
  if (isSpecialApOrPru(school)) return "special-ap-pru";
  if (isRecentlyOpenedForKs4(school, school.ks4Period || "2024/2025")) {
    return "new-establishment";
  }
  return "no-published";
}

export function ks4MissingGapMeta(reason: Ks4MissingReason): {
  label: string;
  detail: string;
  severity: DataGapSeverity;
  reasonCode: GapReasonCode;
} {
  switch (reason) {
    case "special-ap-pru":
      return {
        label: "Special or alternative provision",
        detail:
          "Special schools, alternative provision and pupil referral units often have no comparable Attainment 8 in the open tables — that is expected, not a join error.",
        severity: "info",
        reasonCode: "not-comparable",
      };
    case "ks3-only":
      return {
        label: "No Year 11 cohort yet",
        detail:
          "This setting’s ages cover KS3 but not Year 11. The DfE does not publish school-level KS3 scores, so GCSE cells stay blank until a Year 11 cohort appears.",
        severity: "info",
        reasonCode: "not-comparable",
      };
    case "hospital-secure":
      return {
        label: "Hospital or secure setting",
        detail:
          "Hospital schools and secure units are not published like mainstream secondary Attainment 8 cohorts.",
        severity: "info",
        reasonCode: "not-comparable",
      };
    case "new-establishment":
      return {
        label: "Recently opened",
        detail:
          "Opened recently according to GIAS — a full published KS4 cohort may not appear in the latest tables yet.",
        severity: "info",
        reasonCode: "too-new",
      };
    default:
      return {
        label: "No published GCSE / 16–18 figures",
        detail:
          "No Attainment 8 or 16–18 average points in the latest published tables (small/suppressed cohort, or not yet in the release).",
        severity: "watch",
        reasonCode: "not-published",
      };
  }
}

/** Per-cell blank hint for KS4 outcome metrics (not inspection rows). */
export function ks4OutcomeBlankHint(school: SchoolRecord): string | null {
  if (hasPublishedKs4(school)) return null;
  if (!schoolOffersSecondary(school) && !isSpecialApOrPru(school) && !isHospitalOrSecure(school)) {
    return null;
  }
  return ks4MissingGapMeta(classifyKs4Missing(school)).detail;
}

/** Per-cell blank hint for Ofsted grade rows when the school is ISI-inspected. */
export function ofstedBlankHintForIsi(school: SchoolRecord): string | null {
  if (school.ofstedOverall || school.ofstedIssCompliance) return null;
  if (!inspectorateIsIsi(school)) return null;
  return "ISI inspected — open the ISI report link above (not graded by Ofsted)";
}

export function gapsForKs2Board(schools: SchoolRecord[]): DataGap[] {
  const board: ChallengeBoardId = "ks2";
  const gaps: DataGap[] = [];
  let nilState = 0;
  let nilOfsted = 0;
  for (const school of schools) {
    if (!schoolOffersKs2(school)) continue;
    const sector = resolveSchoolSector(school);
    if (sector === "state" && school.rwmExpected == null) {
      nilState += 1;
      gaps.push({
        id: `nil-ks2-rwm:${school.urn}`,
        level: "school",
        board,
        severity: "watch",
        label: "No KS2 tables",
        detail:
          "State RWM figures are missing — often a new school, suppressed small cohort, or not yet in the published tables.",
        urn: school.urn,
        reasonCode: "not-published",
      });
    }
    if (
      sector === "state" &&
      !school.ofstedOverall &&
      !inspectorateIsIsi(school) &&
      !isUngradedOfsted(school)
    ) {
      nilOfsted += 1;
      gaps.push({
        id: `nil-ks2-ofsted:${school.urn}`,
        level: "school",
        board,
        severity: "info",
        label: "No Ofsted grade in pack",
        detail:
          "No overall Ofsted grade joined for this school yet — open the Ofsted report link when present, or check the official Ofsted page.",
        urn: school.urn,
        reasonCode: "missing-grade",
      });
    }
  }
  if (nilState > 0) {
    gaps.unshift({
      id: "nil-ks2-rwm-board",
      level: "board",
      board,
      severity: "watch",
      label:
        nilState === 1
          ? "1 shortlisted school has no published KS2 tables"
          : `${nilState} shortlisted schools have no published KS2 tables`,
      detail:
        "Missing state Key Stage 2 figures are usually unpublished tables (new school, small cohort, or suppression) — not a School Compass join error.",
    });
  }
  if (nilOfsted > 0) {
    gaps.unshift({
      id: "nil-ks2-ofsted-board",
      level: "board",
      board,
      severity: "info",
      label:
        nilOfsted === 1
          ? "1 shortlisted school has no Ofsted grade in this pack"
          : `${nilOfsted} shortlisted schools have no Ofsted grade in this pack`,
      detail:
        "KS2 compare centres on Year 6 tables; Ofsted grades are joined when present in the school MI. Missing grades are not the same as missing KS2 outcomes.",
    });
  }
  return gaps;
}

export function gapsForKs4Board(schools: SchoolRecord[]): DataGap[] {
  const board: ChallengeBoardId = "ks4";
  const gaps: DataGap[] = [];
  let nilKs4 = 0;
  let nilCleared = 0;
  const reasonCounts: Record<Ks4MissingReason, number> = {
    "special-ap-pru": 0,
    "ks3-only": 0,
    "hospital-secure": 0,
    "new-establishment": 0,
    "no-published": 0,
  };

  for (const school of schools) {
    if (!hasPublishedKs4OrKs5(school)) {
      nilKs4 += 1;
      const reason = classifyKs4Missing(school);
      reasonCounts[reason] += 1;
      const meta = ks4MissingGapMeta(reason);
      gaps.push({
        id: `nil-ks4:${school.urn}`,
        level: "school",
        board,
        severity: meta.severity,
        label: meta.label,
        detail: meta.detail,
        urn: school.urn,
        reasonCode: meta.reasonCode,
      });
    }
    if (hasKs4NilCleared(school)) {
      nilCleared += 1;
      gaps.push({
        id: `ks4-nil-cleared:${school.urn}`,
        level: "school",
        board,
        severity: "info",
        label: school.engMath94IsPillarFallback
          ? "Eng & maths from pillars"
          : "Eng & maths nil-cleared",
        detail:
          "Combined English & maths GCSE returned as nil / IGCSE-style; check EBacc pillars where published.",
        urn: school.urn,
        reasonCode: "nil-cleared",
      });
    }
    if (
      inspectorateIsIsi(school) &&
      !school.ofstedOverall &&
      !school.ofstedIssCompliance
    ) {
      gaps.push({
        id: `isi-no-ofsted:${school.urn}`,
        level: "school",
        board,
        severity: "info",
        label: "ISI (no Ofsted grades)",
        detail:
          "ISI-inspected schools use the ISI reports directory rather than Ofsted grades. This does not explain missing KS4 attainment.",
        urn: school.urn,
        reasonCode: "isi-inspectorate",
      });
    }
  }

  if (nilKs4 > 0) {
    const parts: string[] = [];
    if (reasonCounts["special-ap-pru"]) {
      parts.push(
        `${reasonCounts["special-ap-pru"]} special/AP/PRU`,
      );
    }
    if (reasonCounts["hospital-secure"]) {
      parts.push(`${reasonCounts["hospital-secure"]} hospital/secure`);
    }
    if (reasonCounts["new-establishment"]) {
      parts.push(`${reasonCounts["new-establishment"]} newly opened`);
    }
    if (reasonCounts["ks3-only"]) {
      parts.push(`${reasonCounts["ks3-only"]} without a Year 11 cohort`);
    }
    if (reasonCounts["no-published"]) {
      parts.push(
        `${reasonCounts["no-published"]} with no published KS4 / 16–18 row`,
      );
    }
    gaps.unshift({
      id: "nil-ks4-board",
      level: "board",
      board,
      severity: reasonCounts["no-published"] > 0 ? "watch" : "info",
      label:
        nilKs4 === 1
          ? "1 shortlisted school has no published KS4 / 16–18 figures"
          : `${nilKs4} shortlisted schools have no published KS4 / 16–18 figures`,
      detail: parts.length ? parts.join("; ") + "." : undefined,
    });
  }
  if (nilCleared > 0) {
    gaps.unshift({
      id: "ks4-nil-cleared-board",
      level: "board",
      board,
      severity: "info",
      label:
        "Some English & maths GCSE cells were cleared as nil returns — check EBacc pillars",
    });
  }
  return gaps;
}

export function gapsForEyOfstedBoard(
  providers: SchoolRecord[],
  opts: {
    childcareOfstedAsAt?: string | null;
    stateOfstedAsAt?: string | null;
  } = {},
): DataGap[] {
  const board: ChallengeBoardId = "early-years-ofsted";
  const gaps: DataGap[] = [];
  const hasChildcare = providers.some(isEyProvider);
  const hasSchool = providers.some((p) => !isEyProvider(p));

  if (hasChildcare && !opts.childcareOfstedAsAt) {
    gaps.push({
      id: "missing-ofsted-as-at-childcare",
      level: "board",
      board,
      severity: "watch",
      label: "Childcare Ofsted as-at missing from this pack",
      detail: "The Ofsted childcare MI snapshot date was not recorded in this build.",
    });
  }
  if (hasSchool && !opts.stateOfstedAsAt) {
    gaps.push({
      id: "missing-ofsted-as-at-state",
      level: "board",
      board,
      severity: "watch",
      label: "State school Ofsted as-at missing from this pack",
      detail: "The Ofsted state-schools MI snapshot date was not recorded in this build.",
    });
  }

  for (const provider of providers) {
    if (isUngradedOfsted(provider)) {
      gaps.push({
        id: `ofsted-ungraded:${provider.urn}`,
        level: "school",
        board,
        severity: "info",
        label: "Ungraded / report-led",
        detail:
          "No overall grade in the MI, but domain grades or a report link are available.",
        urn: provider.urn,
        reasonCode: "ungraded-report",
      });
    } else if (
      !provider.ofstedOverall &&
      !hasOfstedDomainOrReport(provider)
    ) {
      gaps.push({
        id: `ofsted-missing:${provider.urn}`,
        level: "school",
        board,
        severity: "watch",
        label: "No Ofsted grade in pack",
        detail:
          "This setting has no overall or domain grade and no report link in the join.",
        urn: provider.urn,
        reasonCode: "missing-grade",
      });
    }

    if (
      (provider.ofstedOverall || hasOfstedDomainOrReport(provider)) &&
      !provider.ofstedInspectionDate
    ) {
      gaps.push({
        id: `ofsted-date-missing:${provider.urn}`,
        level: "school",
        board,
        severity: "info",
        label: "Inspection date missing",
        detail:
          "Grade or report is present but the inspection start date did not join from Ofsted MI.",
        urn: provider.urn,
      });
    }
  }
  return gaps;
}

export function gapsForChildminders(
  providers: SchoolRecord[],
  opts: {
    consentedAsAt?: string | null;
    ofstedAsAt?: string | null;
  } = {},
): DataGap[] {
  const board: ChallengeBoardId = "childminders";
  const gaps: DataGap[] = [];
  if (providers.length && !opts.consentedAsAt) {
    gaps.push({
      id: "missing-consented-as-at",
      level: "board",
      board,
      severity: "watch",
      label: "Consented register as-at missing from this pack",
    });
  }
  for (const provider of providers) {
    if (!isChildminder(provider) && !provider.ofstedOverall) continue;
    if (!provider.ofstedOverall) {
      gaps.push({
        id: `cm-ofsted-missing:${provider.urn}`,
        level: "school",
        board,
        severity: "info",
        label: "No Ofsted overall in directory",
        urn: provider.urn,
      });
    } else if (!provider.ofstedInspectionDate) {
      gaps.push({
        id: `cm-date-missing:${provider.urn}`,
        level: "school",
        board,
        severity: "info",
        label: "Inspection date missing",
        urn: provider.urn,
      });
    }
  }
  return gaps;
}

export function gapsForPhonics(
  schools: SchoolRecord[],
  phonics?: PhonicsBenchmarkSet | null,
): DataGap[] {
  const board: ChallengeBoardId = "ks1-phonics";
  const gaps: DataGap[] = [];
  if (
    !phonics?.england?.year1Expected &&
    !Object.keys(phonics?.localAuthorities || {}).length
  ) {
    gaps.push({
      id: "missing-phonics-pack",
      level: "board",
      board,
      severity: "watch",
      label: "Phonics benchmarks missing from this pack",
    });
    return gaps;
  }
  let missingLa = 0;
  for (const school of schools) {
    const area = phonicsForSchool(school, phonics ?? undefined);
    if (area?.year1Expected == null) {
      missingLa += 1;
      gaps.push({
        id: `phonics-la-missing:${school.urn}`,
        level: "school",
        board,
        severity: "watch",
        label: "Phonics LA row missing",
        detail: school.localAuthority
          ? `No phonics bench for ${school.localAuthority} in this pack.`
          : "No local authority on this school to look up phonics.",
        urn: school.urn,
      });
    }
  }
  if (missingLa > 0) {
    gaps.unshift({
      id: "phonics-la-missing-board",
      level: "board",
      board,
      severity: "watch",
      label:
        missingLa === 1
          ? "1 shortlisted school has no matching phonics LA row"
          : `${missingLa} shortlisted schools have no matching phonics LA row`,
    });
  }
  return gaps;
}

export function gapsForEyfsp(eyfsp?: {
  england?: { gldPercent?: number | null };
  localAuthorities?: Record<string, unknown>;
} | null): DataGap[] {
  const board: ChallengeBoardId = "eyfsp";
  if (
    eyfsp?.england?.gldPercent != null ||
    (eyfsp?.localAuthorities && Object.keys(eyfsp.localAuthorities).length > 0)
  ) {
    return [];
  }
  return [
    {
      id: "missing-eyfsp-benches",
      level: "board",
      board,
      severity: "watch",
      label: "EYFSP area benches missing from this pack",
    },
  ];
}

/** Optional Ofsted as-at honesty when inspection grades are shown on KS4. */
export function gapsForKs4OfstedAsAt(
  schools: SchoolRecord[],
  ofstedStateAsAt?: string | null,
): DataGap[] {
  const hasStateOfsted = schools.some(
    (s) =>
      resolveSchoolSector(s) === "state" &&
      (s.ofstedOverall || s.ofstedQualityOfEducation),
  );
  if (!hasStateOfsted || ofstedStateAsAt) return [];
  return [
    {
      id: "missing-ofsted-as-at-state-ks4",
      level: "board",
      board: "ks4",
      severity: "info",
      label: "State Ofsted as-at missing from this pack",
    },
  ];
}

export function boardGaps(gaps: DataGap[]): DataGap[] {
  return gaps.filter((g) => g.level === "board");
}

export function schoolGaps(gaps: DataGap[], urn: string): DataGap[] {
  return gaps.filter((g) => g.level === "school" && g.urn === urn);
}
