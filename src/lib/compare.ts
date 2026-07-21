import type { SchoolRecord } from "@/lib/types";
import { ppGap } from "@/lib/format";
import {
  phasesFromAgeRange,
  schoolMatchesPhases,
  type PhaseId,
} from "@/lib/phases";

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
): SimilarSchool[] {
  const focusArea = postcodeArea(focus.postcode);
  const focusN = focus.eligiblePupils ?? focus.pupilsAged11 ?? null;
  const focusPhases = phasesFromAgeRange(focus.ageRange);

  const scored: SimilarSchool[] = [];
  for (const school of pool) {
    if (school.urn === focus.urn) continue;
    if (school.closed) continue;
    if (!schoolMatchesPhases(school, stageFilter)) continue;

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

export function headlineForParents(
  school: SchoolRecord,
  englandRwm?: number | null,
): string {
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
