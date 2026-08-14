/** Parental phase filters derived from published age ranges. */

export const PHASE_OPTIONS = [
  {
    id: "early-years",
    label: "Early years",
    short: "EY",
    ages: "0–4",
    hint: "Nursery and reception (typically ages 0–5) — day care, school nurseries/infants, and EYFSP area context",
  },
  {
    id: "childminders",
    label: "Childminders",
    short: "CM",
    ages: null,
    hint: "Consented childminders — often wrap-around care outside school hours; directory + vetting checklist (not school Ofsted tables)",
  },
  {
    id: "ks1",
    label: "KS1",
    short: "KS1",
    ages: "5–7",
    hint: "Years 1–2 (typically ages 5–7) — LA phonics context",
  },
  {
    id: "ks2",
    label: "KS2",
    short: "KS2",
    ages: "7–11",
    hint: "Years 3–6 (typically ages 7–11)",
  },
  {
    id: "ks3",
    label: "KS3",
    short: "KS3",
    ages: "11–14",
    hint: "Years 7–9 (typically ages 11–14) — shortlists secondaries; school-level attainment is published at KS4",
  },
  {
    id: "ks4",
    label: "KS4",
    short: "KS4",
    ages: "14–16",
    hint: "Years 10–11 (typically ages 14–16) — published GCSE / 16–18 outcomes",
  },
] as const;

export type PhaseId = (typeof PHASE_OPTIONS)[number]["id"];

/** Inclusive child ages the age-range slider can express. */
export const CHILD_AGE_MIN = 0;
export const CHILD_AGE_MAX = 16;

/**
 * Typical child-age bands for each school stage.
 * Boundary ages intentionally overlap (e.g. 7 → KS1 and KS2) for transition years.
 * Childminders are a directory category — not driven by age.
 */
export const CHILD_STAGE_AGE_BANDS: ReadonlyArray<{
  id: Exclude<PhaseId, "childminders">;
  lo: number;
  hi: number;
}> = [
  { id: "early-years", lo: 0, hi: 4 },
  { id: "ks1", lo: 5, hi: 7 },
  { id: "ks2", lo: 7, hi: 11 },
  { id: "ks3", lo: 11, hi: 14 },
  { id: "ks4", lo: 14, hi: 16 },
];

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

function clampChildAge(n: number): number {
  if (!Number.isFinite(n)) return CHILD_AGE_MIN;
  return Math.min(CHILD_AGE_MAX, Math.max(CHILD_AGE_MIN, Math.round(n)));
}

/** True when two stage lists contain the same ids (order-independent). */
export function samePhaseSet(a: PhaseId[], b: PhaseId[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * School stages implied by a parent's child-age window (inclusive).
 * Does not include Childminders — keep that chip as a manual directory toggle.
 */
export function stagesFromChildAgeWindow(lo: number, hi: number): PhaseId[] {
  const a = clampChildAge(Math.min(lo, hi));
  const b = clampChildAge(Math.max(lo, hi));
  return CHILD_STAGE_AGE_BANDS.filter(
    (band) => a <= band.hi && b >= band.lo,
  ).map((band) => band.id);
}

/**
 * Approximate age window covering the selected school stages (for slider sync).
 * Ignores Childminders. Falls back to early-years ages when none selected.
 */
export function ageWindowFromStages(stages: PhaseId[]): {
  lo: number;
  hi: number;
} {
  const school = schoolStageIds(stages);
  if (!school.length) {
    return { lo: CHILD_AGE_MIN, hi: 4 };
  }
  let lo = CHILD_AGE_MAX;
  let hi = CHILD_AGE_MIN;
  for (const band of CHILD_STAGE_AGE_BANDS) {
    if (!school.includes(band.id)) continue;
    lo = Math.min(lo, band.lo);
    hi = Math.max(hi, band.hi);
  }
  return { lo, hi };
}

/**
 * Apply age-driven school stages while preserving directory chips (Childminders).
 */
export function applyChildAgeWindowToStages(
  current: PhaseId[],
  lo: number,
  hi: number,
): PhaseId[] {
  const school = stagesFromChildAgeWindow(lo, hi);
  const directory = current.filter((id) => DIRECTORY_PHASE_IDS.includes(id));
  const next = [...school, ...directory];
  return next.length ? next : [...DEFAULT_PHASES];
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
 * Match mode for selected school stages.
 * - any (default): school offers at least one selected stage (OR)
 * - all: school offers every selected stage (AND) — e.g. all-through covering KS1+KS2
 */
export type StageMatchMode = "any" | "all";

export const DEFAULT_STAGE_MATCH: StageMatchMode = "any";

export function normalizeStageMatchMode(
  raw: string | null | undefined,
): StageMatchMode {
  const id = (raw || "").trim().toLowerCase();
  if (id === "all" || id === "and") return "all";
  return "any";
}

/**
 * School matches selected *school* stages.
 * Default is OR (any selected stage). Pass mode "all" to require every stage.
 * The Childminders category is ignored here — directory rows are stitched
 * in separately when that chip is on.
 */
export function schoolMatchesPhases(
  school: { ageRange?: string | null; phases?: string[] | null },
  selected: PhaseId[],
  mode: StageMatchMode = DEFAULT_STAGE_MATCH,
): boolean {
  const schoolStages = schoolStageIds(selected);
  if (!schoolStages.length) return false;
  // Always derive from age range so taxonomy changes (KS3/KS4) stay correct
  // even when the harvested JSON still carries a legacy "phases" array.
  const offered = phasesFromAgeRange(school.ageRange);
  if (!offered.length) return false;
  if (mode === "all") {
    return schoolStages.every((phase) => offered.includes(phase));
  }
  return schoolStages.some((phase) => offered.includes(phase));
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
