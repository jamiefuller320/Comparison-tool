/** Parental phase filters derived from published age ranges. */

export const PHASE_OPTIONS = [
  {
    id: "early-years",
    label: "Early years",
    short: "EY",
    hint: "Nursery and reception (typically ages 0–5) — day care, school nurseries/infants, and EYFSP area context",
  },
  {
    id: "childminders",
    label: "Childminders",
    short: "CM",
    hint: "Consented childminders — often wrap-around care outside school hours; directory + vetting checklist (not school Ofsted tables)",
  },
  {
    id: "ks1",
    label: "KS1",
    short: "KS1",
    hint: "Years 1–2 (typically ages 5–7) — LA phonics context",
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
    hint: "Years 7–9 (typically ages 11–14) — shortlists secondaries; school-level attainment is published at KS4",
  },
  {
    id: "ks4",
    label: "KS4",
    short: "KS4",
    hint: "Years 10–11 (typically ages 14–16) — published GCSE / 16–18 outcomes",
  },
] as const;

export type PhaseId = (typeof PHASE_OPTIONS)[number]["id"];

/** Seed-path default: early years first (Hampshire EY MVP). */
export const DEFAULT_PHASES: PhaseId[] = ["early-years"];

/** Sensible stage defaults when the exclusive School type control changes. */
export const DEFAULT_PHASES_INDEPENDENT: PhaseId[] = ["ks3", "ks4"];

/** State-funded school path when user explicitly picks state only. */
export const DEFAULT_PHASES_STATE: PhaseId[] = ["ks2"];

/** Categories that are not school age-range stages (directory / care). */
export const DIRECTORY_PHASE_IDS: PhaseId[] = ["childminders"];

const PHASE_IDS = new Set<string>(PHASE_OPTIONS.map((o) => o.id));

/**
 * Stages to apply when School type becomes an exclusive selection.
 * Returns null for “Both” so the user’s stage chips are left alone.
 */
export function defaultPhasesForSectors(
  sectors: Array<"state" | "independent">,
): PhaseId[] | null {
  if (sectors.length === 1 && sectors[0] === "independent") {
    return [...DEFAULT_PHASES_INDEPENDENT];
  }
  if (sectors.length === 1 && sectors[0] === "state") {
    return [...DEFAULT_PHASES_STATE];
  }
  return null;
}

/** School age-range stages only (excludes childminders directory category). */
export function schoolStageIds(stages: PhaseId[]): PhaseId[] {
  return stages.filter((id) => !DIRECTORY_PHASE_IDS.includes(id));
}

/** Selected stages ask for early-years nursery / EYFSP context boards. */
export function wantsEyMetrics(stages: PhaseId[]): boolean {
  return stages.includes("early-years");
}

/** Selected stages ask for the consented childminders directory + checklist. */
export function wantsChildminders(stages: PhaseId[]): boolean {
  return stages.includes("childminders");
}

/** Selected stages ask for Key Stage 2 (Year 6) attainment tables. */
export function wantsKs2Metrics(stages: PhaseId[]): boolean {
  return stages.includes("ks2");
}

/** Selected stages ask for secondary / KS4 (and 16–18) attainment tables. */
export function wantsKs4Metrics(stages: PhaseId[]): boolean {
  return stages.includes("ks3") || stages.includes("ks4");
}

/**
 * Selected stages ask for KS1 phonics area context (LA / England).
 * School-level phonics is not published by the DfE.
 */
export function wantsKs1Metrics(stages: PhaseId[]): boolean {
  return stages.includes("ks1");
}

/**
 * Early years selected but the Hampshire EY pack is unavailable.
 * Callers should pass `hasEyData` from the loaded ey-providers index.
 */
export function wantsEarlyYearsOnlyNotice(
  stages: PhaseId[],
  hasEyData = false,
): boolean {
  if (!stages.length || !wantsEyMetrics(stages)) return false;
  if (
    wantsKs1Metrics(stages) ||
    wantsKs2Metrics(stages) ||
    wantsKs4Metrics(stages)
  ) {
    return false;
  }
  // Only-EY filter with no harvested pack → show the empty notice.
  return !hasEyData;
}

export function schoolOffersKs1(school: {
  ageRange?: string | null;
}): boolean {
  return phasesFromAgeRange(school.ageRange).includes("ks1");
}

export function schoolOffersKs2(school: {
  ageRange?: string | null;
}): boolean {
  return phasesFromAgeRange(school.ageRange).includes("ks2");
}

export function schoolOffersSecondary(school: {
  ageRange?: string | null;
}): boolean {
  const phases = phasesFromAgeRange(school.ageRange);
  return phases.includes("ks3") || phases.includes("ks4");
}

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
 * Childminders are a separate directory category — never derived from age range.
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
    if (id === "cm" || id === "childminder") {
      if (!out.includes("childminders")) out.push("childminders");
      continue;
    }
    if (PHASE_IDS.has(id) && !out.includes(id as PhaseId)) {
      out.push(id as PhaseId);
    }
  }
  return out;
}

/**
 * Migrate legacy `eySettings` URL param into stage chips.
 * Old nested toggles under Early years → peer Childminders category.
 */
export function migrateStagesFromLegacyEySettings(
  stages: PhaseId[],
  eySettingsRaw: string | null | undefined,
): PhaseId[] {
  if (eySettingsRaw == null || !String(eySettingsRaw).trim()) {
    return stages.length ? stages : [...DEFAULT_PHASES];
  }
  const tokens = String(eySettingsRaw)
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const wantsNursery = tokens.some((t) =>
    ["nurseries", "nursery", "daycare", "day-care"].includes(t),
  );
  const wantsCm = tokens.some((t) =>
    ["childminders", "childminder", "cm"].includes(t),
  );
  let next = [...stages];
  if (wantsCm && !next.includes("childminders")) {
    next.push("childminders");
  }
  // Childminders-only under the old EY toggle → drop Early years chip.
  if (wantsCm && !wantsNursery) {
    next = next.filter((id) => id !== "early-years");
  }
  if (!next.length) return [...DEFAULT_PHASES];
  return next;
}

/**
 * School matches if it offers every selected *school* stage (AND).
 * The Childminders category is ignored here — directory rows are stitched
 * in separately when that chip is on.
 */
export function schoolMatchesPhases(
  school: { ageRange?: string | null; phases?: string[] | null },
  selected: PhaseId[],
): boolean {
  const schoolStages = schoolStageIds(selected);
  if (!schoolStages.length) return false;
  // Always derive from age range so taxonomy changes (KS3/KS4) stay correct
  // even when the harvested JSON still carries a legacy "phases" array.
  const offered = phasesFromAgeRange(school.ageRange);
  if (!offered.length) return false;
  return schoolStages.every((phase) => offered.includes(phase));
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
  if (phases.includes("childminders")) return "Childminder";
  return "Other";
}
