import type { SchoolRecord } from "@/lib/types";
import { ppGap } from "@/lib/format";

export interface SimilarSchool extends SchoolRecord {
  similarityScore: number;
  reasons: string[];
}

function phaseCompatible(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return true;
  if (a === b) return true;
  if ((a === "junior" || a === "primary") && (b === "junior" || b === "primary")) {
    return true;
  }
  return false;
}

function postcodeArea(postcode?: string | null): string | null {
  if (!postcode) return null;
  const m = postcode.toUpperCase().match(/^([A-Z]{1,2}\d{1,2})/);
  return m?.[1] ?? null;
}

/**
 * Suggest other schools a parent might weigh — same LA / nearby postcode area,
 * similar phase and cohort size, ranked by a blend of similarity and outcomes.
 */
export function suggestAlternatives(
  focus: SchoolRecord,
  pool: SchoolRecord[],
  limit = 6,
): SimilarSchool[] {
  const focusArea = postcodeArea(focus.postcode);
  const focusN = focus.eligiblePupils ?? focus.pupilsAged11 ?? null;

  const scored: SimilarSchool[] = [];
  for (const school of pool) {
    if (school.urn === focus.urn) continue;
    if (school.closed) continue;
    if (!phaseCompatible(focus.phase, school.phase)) continue;

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

    if (focus.phase && school.phase && focus.phase === school.phase) {
      score += 15;
      reasons.push(`Same phase (${school.phase})`);
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
    // Prefer stronger outcomes when similarity ties — parents exploring options
    return gapB - gapA;
  });

  return scored.slice(0, limit);
}

export function headlineForParents(school: SchoolRecord, englandRwm?: number | null): string {
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
