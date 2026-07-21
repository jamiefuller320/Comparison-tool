/** Parental phase filters derived from published age ranges. */

export const PHASE_OPTIONS = [
  {
    id: "early-years",
    label: "Early years",
    short: "EY",
    hint: "Nursery and reception (typically ages 0–5)",
  },
  {
    id: "ks1",
    label: "KS1",
    short: "KS1",
    hint: "Years 1–2 (typically ages 5–7)",
  },
  {
    id: "ks2",
    label: "KS2",
    short: "KS2",
    hint: "Years 3–6 (typically ages 7–11)",
  },
  {
    id: "secondary",
    label: "Secondary",
    short: "Sec",
    hint: "Year 7 and above (typically ages 11–16/18)",
  },
] as const;

export type PhaseId = (typeof PHASE_OPTIONS)[number]["id"];

export const DEFAULT_PHASES: PhaseId[] = ["ks2"];

export function parseAgeBounds(
  ageRange?: string | null,
): { lo: number; hi: number } | null {
  if (!ageRange) return null;
  const nums = ageRange.match(/\d+/g)?.map((n) => Number(n)) ?? [];
  if (nums.length < 2) return null;
  const lo = nums[0];
  const hi = nums[1];
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return null;
  return { lo, hi };
}

/**
 * Phases a setting offers. Multi-phase schools (primary, all-through, etc.)
 * return every stage they cover so they stay visible under each selector.
 */
export function phasesFromAgeRange(ageRange?: string | null): PhaseId[] {
  const bounds = parseAgeBounds(ageRange);
  if (!bounds) return [];
  const { lo, hi } = bounds;
  const phases: PhaseId[] = [];

  // Nursery / reception intake
  if (lo <= 4) phases.push("early-years");

  // Covers Year 1–2 ages
  if (lo <= 5 && hi >= 7) phases.push("ks1");

  // Covers later primary (junior / primary / middle lower years)
  if (lo <= 10 && hi >= 9) phases.push("ks2");

  // Continues into secondary-age provision
  if (hi >= 12) phases.push("secondary");

  return phases;
}

/** School matches if it offers any of the selected phases (OR). */
export function schoolMatchesPhases(
  school: { ageRange?: string | null; phases?: PhaseId[] | null },
  selected: PhaseId[],
): boolean {
  if (!selected.length) return true;
  const offered =
    school.phases && school.phases.length > 0
      ? school.phases
      : phasesFromAgeRange(school.ageRange);
  if (!offered.length) return false;
  return selected.some((phase) => offered.includes(phase));
}

export function formatPhases(phases: PhaseId[]): string {
  if (!phases.length) return "";
  const labels = PHASE_OPTIONS.filter((o) => phases.includes(o.id)).map(
    (o) => o.short,
  );
  return labels.join(" · ");
}

export function primaryPhaseLabel(phases: PhaseId[]): string {
  if (phases.includes("secondary") && phases.includes("ks2")) return "All-through";
  if (phases.includes("secondary")) return "Secondary";
  if (phases.includes("ks2") && phases.includes("ks1")) return "Primary";
  if (phases.includes("ks2")) return "Junior / KS2";
  if (phases.includes("ks1") || phases.includes("early-years")) return "Infant / EY–KS1";
  return "Other";
}
