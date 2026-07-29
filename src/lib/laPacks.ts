/**
 * Seed geography and on-demand local-authority pack helpers.
 * Hampshire stays the maintained root index; other LAs live under
 * `/data/packs/{slug}/`.
 */

import type {
  ChildmindersIndex,
  EyfspBenchmarkSet,
  EyProvidersIndex,
  IndependentBenchmarkSet,
  PhonicsBenchmarkSet,
  SchoolRecord,
  SchoolsIndex,
} from "@/lib/types";

export const SEED_LOCAL_AUTHORITY = "Hampshire";

/** Human label for UI / docs. */
export const SEED_GEOGRAPHY_LABEL = "Hampshire";

/** @deprecated Packs are no longer a user-facing mode; kept for clearing legacy storage. */
export const ACTIVE_PACK_STORAGE_KEY = "schoolside.activeLaPack";

export function normalizeLaName(name?: string | null): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ");
}

export function laSlug(name?: string | null): string {
  const text = normalizeLaName(name).toLowerCase();
  const slug = text
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "unknown";
}

export function isSeedLocalAuthority(
  localAuthority?: string | null,
): boolean {
  return isLocalAuthority(localAuthority, SEED_LOCAL_AUTHORITY);
}

export function isLocalAuthority(
  localAuthority?: string | null,
  target?: string | null,
): boolean {
  if (!localAuthority || !target) return false;
  return (
    normalizeLaName(localAuthority).toLowerCase() ===
    normalizeLaName(target).toLowerCase()
  );
}

export function packDataPath(
  localAuthorityOrSlug: string,
  file = "schools-index.json",
): string {
  return `/data/packs/${laSlug(localAuthorityOrSlug)}/${file}`;
}

export function packDataPathBySlug(
  slug: string,
  file = "schools-index.json",
): string {
  return `/data/packs/${slug}/${file}`;
}

export interface LaPackManifestEntry {
  localAuthority: string;
  slug: string;
  status: "ready" | "building" | "failed" | "queued";
  schoolCount?: number;
  withRwm?: number;
  withKs4?: number;
  eyProviderCount?: number | null;
  childminderCount?: number | null;
  giasEnriched?: boolean;
  phonicsEnriched?: boolean;
  independentEnriched?: boolean;
  eyEnriched?: boolean;
  requestedAt?: string;
  builtAt?: string;
  note?: string;
  paths?: {
    schoolsIndex?: string;
    directory?: string;
    eyProviders?: string;
    childminders?: string;
  };
}

export interface LaPackManifest {
  generatedAt?: string;
  seedLocalAuthority: string;
  packs: Record<string, LaPackManifestEntry>;
}

export type SchoolsIndexWithPack = SchoolsIndex & {
  maintainedScope?: string;
  /** @deprecated Prefer collatedPackLabels — packs are not a user-facing mode. */
  activePackSlug?: string;
  /** @deprecated Prefer collatedPackLabels */
  activePackLabel?: string;
  collatedPackLabels?: string[];
};

export function listReadyPacks(
  manifest: LaPackManifest | null | undefined,
): LaPackManifestEntry[] {
  if (!manifest?.packs) return [];
  return Object.values(manifest.packs)
    .filter((p) => p.status === "ready" && p.slug)
    .sort((a, b) =>
      a.localAuthority.localeCompare(b.localAuthority, "en-GB"),
    );
}

function mergePhonics(
  seed?: PhonicsBenchmarkSet,
  pack?: PhonicsBenchmarkSet,
): PhonicsBenchmarkSet | undefined {
  if (!seed && !pack) return undefined;
  if (!pack) return seed;
  if (!seed) return pack;
  return {
    ...seed,
    ...pack,
    england: pack.england ?? seed.england,
    localAuthorities: {
      ...(seed.localAuthorities || {}),
      ...(pack.localAuthorities || {}),
    },
  };
}

function mergeEyfsp(
  seed?: EyfspBenchmarkSet,
  pack?: EyfspBenchmarkSet,
): EyfspBenchmarkSet | undefined {
  if (!seed && !pack) return undefined;
  if (!pack) return seed;
  if (!seed) return pack;
  return {
    ...seed,
    ...pack,
    england: seed.england ?? pack.england,
    localAuthorities: {
      ...(seed.localAuthorities || {}),
      ...(pack.localAuthorities || {}),
    },
    note: seed.note || pack.note,
    sourceUrl: seed.sourceUrl || pack.sourceUrl,
    period: seed.period || pack.period,
  };
}

export type EyProvidersIndexWithPack = EyProvidersIndex & {
  collatedPackLabels?: string[];
};

export type ChildmindersIndexWithPack = ChildmindersIndex & {
  collatedPackLabels?: string[];
};

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function collectMetric(
  schools: SchoolRecord[],
  sector: "state" | "independent",
  key: keyof SchoolRecord,
): number[] {
  const out: number[] = [];
  for (const school of schools) {
    if (school.sector !== sector) continue;
    const value = school[key];
    if (typeof value === "number" && Number.isFinite(value)) out.push(value);
  }
  return out;
}

/** Recompute KS4 sector means from the schools currently in the working index. */
export function recomputeSectorKs4Benches(
  schools: SchoolRecord[],
  prior?: {
    independent?: IndependentBenchmarkSet | null;
    stateKs4?: IndependentBenchmarkSet | null;
  },
): {
  independent: IndependentBenchmarkSet;
  stateKs4: IndependentBenchmarkSet;
} {
  function block(
    sector: "state" | "independent",
    fallback?: IndependentBenchmarkSet | null,
  ): IndependentBenchmarkSet {
    const att8 = collectMetric(schools, sector, "att8Average");
    const ks5 = collectMetric(schools, sector, "ks5ApsPerEntry");
    const label = sector === "independent" ? "independents" : "state schools";
    let period = fallback?.period ?? null;
    let ks5Period = fallback?.ks5Period ?? null;
    if (!period) {
      const hit = schools.find((s) => s.sector === sector && s.ks4Period);
      period = hit?.ks4Period ?? null;
    }
    if (!ks5Period) {
      const hit = schools.find((s) => s.sector === sector && s.ks5Period);
      ks5Period = hit?.ks5Period ?? null;
    }
    return {
      att8Average: mean(att8),
      engMath94Percent: mean(collectMetric(schools, sector, "engMath94Percent")),
      engMath95Percent: mean(collectMetric(schools, sector, "engMath95Percent")),
      ebaccEnteringPercent: mean(
        collectMetric(schools, sector, "ebaccEnteringPercent"),
      ),
      anyPassPercent: mean(collectMetric(schools, sector, "anyPassPercent")),
      ebaccEng94Percent: mean(collectMetric(schools, sector, "ebaccEng94Percent")),
      ebaccMat94Percent: mean(collectMetric(schools, sector, "ebaccMat94Percent")),
      ks5ApsPerEntry: mean(ks5),
      ks5Best3Aps: mean(collectMetric(schools, sector, "ks5Best3Aps")),
      period,
      ks5Period,
      schoolCount: att8.length,
      ks5SchoolCount: ks5.length,
      note: `Mean of ${label} in this collated index with usable KS4 figures`,
    };
  }

  return {
    independent: block("independent", prior?.independent),
    stateKs4: block("state", prior?.stateKs4),
  };
}

/**
 * Overlay one or more on-demand LA packs onto the Hampshire maintained seed.
 * Pack schools win on URN collision; England benches stay from the seed;
 * LA / phonics benches are unioned; KS4 sector means are recomputed across the
 * collated school set. Packs are a collation unit — not a user mode.
 */
export function mergeSchoolsIndexWithPack(
  seed: SchoolsIndex,
  pack: SchoolsIndex,
  packMeta?: Pick<LaPackManifestEntry, "slug" | "localAuthority">,
): SchoolsIndexWithPack {
  return mergeSchoolsIndexWithPacks(seed, [
    { index: pack, meta: packMeta },
  ]);
}

export function mergeSchoolsIndexWithPacks(
  seed: SchoolsIndex,
  packs: Array<{
    index: SchoolsIndex;
    meta?: Pick<LaPackManifestEntry, "slug" | "localAuthority">;
  }>,
): SchoolsIndexWithPack {
  if (!packs.length) {
    return { ...seed };
  }

  const byUrn = new Map(seed.schools.map((s) => [s.urn, s]));
  let localAuthorities = { ...(seed.benchmarks.localAuthorities || {}) };
  let phonics = seed.benchmarks.phonics;
  const packLabels: string[] = [];

  for (const { index: pack, meta } of packs) {
    for (const school of pack.schools) {
      byUrn.set(school.urn, school);
    }
    localAuthorities = {
      ...localAuthorities,
      ...(pack.benchmarks.localAuthorities || {}),
    };
    phonics = mergePhonics(phonics, pack.benchmarks.phonics);
    const label =
      meta?.localAuthority ||
      (pack as SchoolsIndexWithPack).maintainedScope ||
      meta?.slug;
    if (label) packLabels.push(label);
  }

  const schools = [...byUrn.values()];
  const sectorBenches = recomputeSectorKs4Benches(schools, {
    independent: seed.benchmarks.independent,
    stateKs4: seed.benchmarks.stateKs4,
  });
  const noteExtra = packLabels.length
    ? ` Collated area coverage also includes: ${packLabels.join(", ")}.`
    : "";

  return {
    ...seed,
    schools,
    benchmarks: {
      ...seed.benchmarks,
      localAuthorities,
      phonics,
      independent: sectorBenches.independent,
      stateKs4: sectorBenches.stateKs4,
    },
    stats: {
      ...seed.stats,
      schoolCount: schools.length,
      withRwm: schools.filter((s) => s.rwmExpected != null).length,
      localAuthorityCount: new Set(
        schools.map((s) => s.localAuthority).filter(Boolean),
      ).size,
      withCoordinates: schools.filter((s) => s.latitude != null).length,
      stateWithKs4: schools.filter(
        (s) => s.sector === "state" && s.att8Average != null,
      ).length,
      independentWithKs4: schools.filter(
        (s) => s.sector === "independent" && s.att8Average != null,
      ).length,
      withKs4: schools.filter((s) => s.att8Average != null).length,
    },
    source: {
      ...seed.source,
      note: `${seed.source.note}${noteExtra}`,
    },
    collatedPackLabels: packLabels,
  };
}

/**
 * Overlay ready LA EY provider packs onto the Hampshire maintained seed.
 * Pack providers win on URN collision; England EYFSP stays from the seed;
 * LA EYFSP benches are unioned.
 */
export function mergeEyProvidersWithPacks(
  seed: EyProvidersIndex,
  packs: Array<{
    index: EyProvidersIndex;
    meta?: Pick<LaPackManifestEntry, "slug" | "localAuthority">;
  }>,
): EyProvidersIndexWithPack {
  if (!packs.length) {
    return { ...seed };
  }

  const byUrn = new Map(seed.providers.map((p) => [p.urn, p]));
  let eyfsp = seed.benchmarks.eyfsp;
  const packLabels: string[] = [];

  for (const { index: pack, meta } of packs) {
    for (const provider of pack.providers || []) {
      byUrn.set(provider.urn, provider);
    }
    eyfsp = mergeEyfsp(eyfsp, pack.benchmarks?.eyfsp);
    const label = meta?.localAuthority || pack.localAuthority || meta?.slug;
    if (label) packLabels.push(label);
  }

  const providers = [...byUrn.values()];
  const noteExtra = packLabels.length
    ? ` Collated area coverage also includes: ${packLabels.join(", ")}.`
    : "";

  return {
    ...seed,
    providers,
    benchmarks: {
      ...seed.benchmarks,
      eyfsp,
    },
    stats: {
      ...seed.stats,
      providerCount: providers.length,
      withInspectionGrade: providers.filter((p) => p.ofstedOverall).length,
      withCoordinates: providers.filter((p) => p.latitude != null).length,
    },
    source: {
      ...seed.source,
      note: `${seed.source.note || ""}${noteExtra}`.trim(),
    },
    collatedPackLabels: packLabels,
  };
}

/**
 * Overlay ready LA consented-childminder packs onto the Hampshire seed.
 * Pack providers win on URN collision. Empty pack files are valid
 * (consent lists can be empty for an LA).
 */
export function mergeChildmindersWithPacks(
  seed: ChildmindersIndex,
  packs: Array<{
    index: ChildmindersIndex;
    meta?: Pick<LaPackManifestEntry, "slug" | "localAuthority">;
  }>,
): ChildmindersIndexWithPack {
  if (!packs.length) {
    return { ...seed };
  }

  const byUrn = new Map(seed.providers.map((p) => [p.urn, p]));
  const packLabels: string[] = [];

  for (const { index: pack, meta } of packs) {
    for (const provider of pack.providers || []) {
      byUrn.set(provider.urn, provider);
    }
    const label = meta?.localAuthority || pack.localAuthority || meta?.slug;
    if (label) packLabels.push(label);
  }

  const providers = [...byUrn.values()];
  const noteExtra = packLabels.length
    ? ` Collated area coverage also includes: ${packLabels.join(", ")}.`
    : "";

  return {
    ...seed,
    providers,
    stats: {
      ...seed.stats,
      providerCount: providers.length,
      withInspectionGrade: providers.filter((p) => p.ofstedOverall).length,
      withCoordinates: providers.filter((p) => p.latitude != null).length,
    },
    source: {
      ...seed.source,
      note: `${seed.source.note || ""}${noteExtra}`.trim(),
    },
    collatedPackLabels: packLabels,
  };
}
