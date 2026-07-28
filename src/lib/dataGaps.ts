/** Known fetch/join / sanitised-nil gaps for comparison boards (not user challenges). */

import type { ChallengeBoardId } from "@/lib/sourceStamp";
import type { PhonicsBenchmarkSet, SchoolRecord } from "@/lib/types";
import { isChildminder, isEyProvider } from "@/lib/eyMetrics";
import { schoolOffersKs2 } from "@/lib/phases";
import { phonicsForSchool } from "@/lib/phonicsMetrics";
import { resolveSchoolSector } from "@/lib/sectors";

export type DataGapSeverity = "info" | "watch";

export interface DataGap {
  id: string;
  level: "board" | "school";
  board: ChallengeBoardId;
  severity: DataGapSeverity;
  /** Short chip label. */
  label: string;
  detail?: string;
  urn?: string;
}

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

function inspectorateIsIsi(school: SchoolRecord): boolean {
  const name = (school.inspectorateName || school.ofstedInspectorate || "").toUpperCase();
  return name === "ISI" || Boolean(school.isiReportsUrl);
}

export function gapsForKs2Board(schools: SchoolRecord[]): DataGap[] {
  const board: ChallengeBoardId = "ks2";
  const gaps: DataGap[] = [];
  let nilState = 0;
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
        "Missing state Key Stage 2 figures are usually unpublished tables (new school, small cohort, or suppression) — not a Schoolside join error.",
    });
  }
  return gaps;
}

export function gapsForKs4Board(schools: SchoolRecord[]): DataGap[] {
  const board: ChallengeBoardId = "ks4";
  const gaps: DataGap[] = [];
  let nilKs4 = 0;
  let nilCleared = 0;
  for (const school of schools) {
    const noOutcomes =
      school.att8Average == null && school.ks5ApsPerEntry == null;
    if (noOutcomes) {
      nilKs4 += 1;
      gaps.push({
        id: `nil-ks4:${school.urn}`,
        level: "school",
        board,
        severity: "watch",
        label: "No KS4 / 16–18 figures",
        detail:
          "No published Attainment 8 or 16–18 APS in this pack for this setting.",
        urn: school.urn,
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
          "ISI-inspected schools use the ISI reports directory rather than Ofsted grades.",
        urn: school.urn,
      });
    }
  }
  if (nilKs4 > 0) {
    gaps.unshift({
      id: "nil-ks4-board",
      level: "board",
      board,
      severity: "watch",
      label:
        nilKs4 === 1
          ? "1 shortlisted school has no published KS4 / 16–18 figures"
          : `${nilKs4} shortlisted schools have no published KS4 / 16–18 figures`,
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
        detail: "This setting has no overall or domain grade and no report link in the join.",
        urn: provider.urn,
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
  if (!phonics?.england?.year1Expected && !Object.keys(phonics?.localAuthorities || {}).length) {
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
