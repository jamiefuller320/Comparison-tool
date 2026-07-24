import type { IndependentBenchmarkSet, SchoolRecord } from "@/lib/types";
import { ppGap } from "@/lib/format";
import {
  phasesFromAgeRange,
  schoolMatchesPhases,
  type PhaseId,
} from "@/lib/phases";
import {
  resolveSchoolSector,
  schoolMatchesSectors,
  type SectorId,
} from "@/lib/sectors";

export interface SimilarSchool extends SchoolRecord {
  similarityScore: number;
  reasons: string[];
}

function phasesOverlap(a: PhaseId[], b: PhaseId[]): boolean {
  if (!a.length || !b.length) return true;
  return a.some((phase) => b.includes(phase));
}

function postcodeArea(postcode?: string | null): string | null {
  if (!postcode) return null;
  const m = postcode.toUpperCase().match(/^([A-Z]{1,2}\d{1,2})/);
  return m?.[1] ?? null;
}

/**
 * Suggest other schools a parent might weigh — same LA / nearby postcode area,
 * overlapping stages and similar cohort size, ranked by similarity + outcomes.
 */
export function suggestAlternatives(
  focus: SchoolRecord,
  pool: SchoolRecord[],
  limit = 6,
  stageFilter: PhaseId[] = [],
  sectorFilter: SectorId[] = [],
): SimilarSchool[] {
  const focusArea = postcodeArea(focus.postcode);
  const focusN = focus.eligiblePupils ?? focus.pupilsAged11 ?? null;
  const focusPhases = phasesFromAgeRange(focus.ageRange);

  const scored: SimilarSchool[] = [];
  for (const school of pool) {
    if (school.urn === focus.urn) continue;
    if (school.closed) continue;
    if (!schoolMatchesPhases(school, stageFilter)) continue;
    if (!schoolMatchesSectors(school, sectorFilter)) continue;

    const schoolPhases = phasesFromAgeRange(school.ageRange);
    if (!phasesOverlap(focusPhases, schoolPhases)) continue;

    let score = 0;
    const reasons: string[] = [];

    if (
      focus.localAuthority &&
      school.localAuthority &&
      school.localAuthority === focus.localAuthority
    ) {
      score += 40;
      reasons.push(`Also in ${school.localAuthority}`);
    }

    const area = postcodeArea(school.postcode);
    if (focusArea && area && focusArea === area) {
      score += 35;
      reasons.push(`Same postcode area (${area})`);
    }

    const shared = schoolPhases.filter((p) => focusPhases.includes(p));
    if (shared.length) {
      score += 10 * shared.length;
      reasons.push(`Shared stages: ${shared.join(", ")}`);
    }

    const n = school.eligiblePupils ?? school.pupilsAged11 ?? null;
    if (focusN != null && n != null && focusN > 0) {
      const ratio = n / focusN;
      if (ratio >= 0.6 && ratio <= 1.5) {
        score += 20;
        reasons.push("Similar Year 6 cohort size");
      } else if (ratio >= 0.4 && ratio <= 2) {
        score += 8;
      }
    }

    if (
      focus.religiousDenomination &&
      school.religiousDenomination &&
      school.religiousDenomination === focus.religiousDenomination
    ) {
      score += 10;
      reasons.push(school.religiousDenomination);
    }

    if (school.rwmExpected != null) score += 5;
    if (score < 30) continue;

    scored.push({ ...school, similarityScore: score, reasons: reasons.slice(0, 3) });
  }

  scored.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    const gapA = ppGap(a.rwmExpected, focus.rwmExpected) ?? -999;
    const gapB = ppGap(b.rwmExpected, focus.rwmExpected) ?? -999;
    return gapB - gapA;
  });

  return scored.slice(0, limit);
}

function independentHeadline(
  school: SchoolRecord,
  indieBench?: IndependentBenchmarkSet | null,
): string {
  const att8 = school.att8Average;
  const bench = indieBench?.att8Average;
  if (att8 != null && Number.isFinite(att8)) {
    if (bench != null && Number.isFinite(bench)) {
      const gap = Math.round((att8 - bench) * 10) / 10;
      if (gap >= 2) {
        return `Attainment 8 of ${att8} — ${gap} points above the mean for independents with published KS4 figures (${bench}).`;
      }
      if (gap <= -2) {
        return `Attainment 8 of ${att8} — ${Math.abs(gap)} points below the mean for independents with published KS4 figures (${bench}).`;
      }
      return `Attainment 8 of ${att8} — broadly in line with the independent-school mean (${bench}).`;
    }
    return `Attainment 8 of ${att8} in the latest published Key Stage 4 tables.`;
  }

  const aps = school.ks5ApsPerEntry;
  if (aps != null && Number.isFinite(aps)) {
    const cohort = school.ks5AlevelStudents ?? school.ks5Students;
    const cohortBit =
      cohort != null ? ` (${cohort} students at the end of 16–18 study)` : "";
    return `A-level APS per entry of ${aps}${cohortBit} in the latest 16–18 tables.`;
  }

  const ofsted = school.ofstedOverall || school.ofstedIssCompliance;
  if (ofsted) {
    const when = school.ofstedInspectionDate
      ? ` (inspection ${school.ofstedInspectionDate})`
      : "";
    return `Latest Ofsted judgement: ${ofsted}${when}. Published KS4 outcomes are limited for this school.`;
  }

  const inspectorate = (school.inspectorateName || school.ofstedInspectorate || "")
    .trim();
  if (inspectorate.toUpperCase() === "ISI") {
    return "Inspected by ISI rather than Ofsted — open the ISI reports link for the latest inspection. Published KS2/KS4 table outcomes are limited.";
  }
  if (inspectorate) {
    return `Inspectorate: ${inspectorate}. Latest published attainment tables are limited for this school.`;
  }

  return "Limited published outcomes for this independent school in the latest DfE tables — check the school website and inspection reports.";
}

export function headlineForParents(
  school: SchoolRecord,
  englandRwm?: number | null,
  indieBench?: IndependentBenchmarkSet | null,
): string {
  if (resolveSchoolSector(school) === "independent") {
    return independentHeadline(school, indieBench);
  }

  const rwm = school.rwmExpected;
  if (rwm == null) {
    return "Latest published combined reading, writing and maths results are not available for this school.";
  }
  if (englandRwm == null) {
    return `${rwm}% of pupils met the expected standard in reading, writing and maths combined.`;
  }
  const gap = ppGap(rwm, englandRwm);
  if (gap == null) {
    return `${rwm}% met the expected standard in reading, writing and maths combined.`;
  }
  if (gap >= 5) {
    return `${rwm}% met the expected standard in reading, writing and maths — ${gap} percentage points above the England average.`;
  }
  if (gap <= -5) {
    return `${rwm}% met the expected standard in reading, writing and maths — ${Math.abs(gap)} percentage points below the England average.`;
  }
  return `${rwm}% met the expected standard in reading, writing and maths — broadly in line with England (${englandRwm}%).`;
}
