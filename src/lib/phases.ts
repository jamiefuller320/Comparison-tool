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
    id: "ks3",
    label: "KS3",
    short: "KS3",
    hint: "Years 7–9 (typically ages 11–14)",
  },
  {
    id: "ks4",
    label: "KS4",
    short: "KS4",
    hint: "Years 10–11 (typically ages 14–16)",
  },
] as const;

export type PhaseId = (typeof PHASE_OPTIONS)[number]["id"];

export const DEFAULT_PHASES: PhaseId[] = ["ks2"];

const PHASE_IDS = new Set<string>(PHASE_OPTIONS.map((o) => o.id));

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

  // Year 1–2
  if (lo <= 5 && hi >= 7) phases.push("ks1");

  // Year 3–6 / junior / middle lower years
  if (lo <= 10 && hi >= 9) phases.push("ks2");

  // Year 7–9
  if (lo <= 13 && hi >= 12) phases.push("ks3");

  // Year 10–11 (must continue past age 14)
  if (lo <= 15 && hi >= 15) phases.push("ks4");

  return phases;
}

/** Expand legacy tokens (e.g. "secondary") into current phase ids. */
export function normalizePhaseIds(raw: string[]): PhaseId[] {
  const out: PhaseId[] = [];
  for (const token of raw) {
    const id = token.trim().toLowerCase();
    if (id === "secondary" || id === "sec") {
      if (!out.includes("ks3")) out.push("ks3");
      if (!out.includes("ks4")) out.push("ks4");
      continue;
    }
    if (id === "ey") {
      if (!out.includes("early-years")) out.push("early-years");
      continue;
    }
    if (PHASE_IDS.has(id) && !out.includes(id as PhaseId)) {
      out.push(id as PhaseId);
    }
  }
  return out;
}

/** School matches if it offers every selected phase (AND). */
export function schoolMatchesPhases(
  school: { ageRange?: string | null; phases?: string[] | null },
  selected: PhaseId[],
): boolean {
  if (!selected.length) return true;
  // Always derive from age range so taxonomy changes (KS3/KS4) stay correct
  // even when the harvested JSON still carries a legacy "phases" array.
  const offered = phasesFromAgeRange(school.ageRange);
  if (!offered.length) return false;
  return selected.every((phase) => offered.includes(phase));
}

export function formatPhases(phases: PhaseId[]): string {
  if (!phases.length) return "";
  const labels = PHASE_OPTIONS.filter((o) => phases.includes(o.id)).map(
    (o) => o.short,
  );
  return labels.join(" · ");
}

export function primaryPhaseLabel(phases: PhaseId[]): string {
  const hasSecondary = phases.includes("ks3") || phases.includes("ks4");
  if (hasSecondary && (phases.includes("ks2") || phases.includes("ks1"))) {
    return "All-through";
  }
  if (phases.includes("ks3") && phases.includes("ks4")) return "Secondary";
  if (phases.includes("ks4")) return "KS4 / upper secondary";
  if (phases.includes("ks3")) return "KS3 / middle";
  if (phases.includes("ks2") && phases.includes("ks1")) return "Primary";
  if (phases.includes("ks2")) return "Junior / KS2";
  if (phases.includes("ks1") || phases.includes("early-years")) {
    return "Infant / EY–KS1";
  }
  return "Other";
}
