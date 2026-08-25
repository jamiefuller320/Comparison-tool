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

/** Human label for UI / docs (maintained root). */
export const SEED_GEOGRAPHY_LABEL = "Hampshire";

/** London boroughs (GIAS / DfE LA labels) — silent-merge packs. */
export const LONDON_BOROUGH_LOCAL_AUTHORITIES = [
  "City of London",
  "Barking and Dagenham",
  "Barnet",
  "Bexley",
  "Brent",
  "Bromley",
  "Camden",
  "Croydon",
  "Ealing",
  "Enfield",
  "Greenwich",
  "Hackney",
  "Hammersmith and Fulham",
  "Haringey",
  "Harrow",
  "Havering",
  "Hillingdon",
  "Hounslow",
  "Islington",
  "Kensington and Chelsea",
  "Kingston upon Thames",
  "Lambeth",
  "Lewisham",
  "Merton",
  "Newham",
  "Redbridge",
  "Richmond upon Thames",
  "Southwark",
  "Sutton",
  "Tower Hamlets",
  "Waltham Forest",
  "Wandsworth",
  "Westminster",
] as const;

/**
 * Coverage region: ONS South East LAs + Dorset / BCP + London boroughs.
 * Hampshire is the maintained root; other members ship as silent-merge packs.
 */
export const SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES = [
  "Bracknell Forest",
  "Brighton and Hove",
  "Buckinghamshire",
  "East Sussex",
  "Hampshire",
  "Isle of Wight",
  "Kent",
  "Medway",
  "Milton Keynes",
  "Oxfordshire",
  "Portsmouth",
  "Reading",
  "Slough",
  "Southampton",
  "Surrey",
  "West Berkshire",
  "West Sussex",
  "Windsor and Maidenhead",
  "Wokingham",
  "Dorset",
  "Bournemouth, Christchurch and Poole",
  ...LONDON_BOROUGH_LOCAL_AUTHORITIES,
] as const;

/** Canonical alias for full coverage-region membership. */
export const COVERAGE_REGION_LOCAL_AUTHORITIES =
  SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES;

/** Human label for the wider coverage region. */
export const COVERAGE_REGION_LABEL =
  "South East England, London, and Dorset";

/**
 * Contiguous neighbours within the coverage region (DfE LA labels).
 * Used for geo-lazy pack fetch: load the postcode LA plus these packs.
 * Hampshire is the seed (not a pack) but still lists neighbours to pull.
 */
export const COVERAGE_LA_NEIGHBOURS: Record<string, readonly string[]> = {
  Hampshire: [
    "Southampton",
    "Portsmouth",
    "Isle of Wight",
    "Surrey",
    "West Sussex",
    "West Berkshire",
    "Wokingham",
    "Dorset",
    "Bournemouth, Christchurch and Poole",
  ],
  Southampton: ["Hampshire", "Portsmouth", "Wiltshire"],
  Portsmouth: ["Hampshire", "Southampton", "Isle of Wight", "West Sussex"],
  "Isle of Wight": ["Hampshire", "Portsmouth"],
  Surrey: [
    "Hampshire",
    "West Sussex",
    "East Sussex",
    "Kent",
    "Wokingham",
    "Bracknell Forest",
    "Windsor and Maidenhead",
    "Slough",
    "Buckinghamshire",
  ],
  "West Sussex": [
    "Hampshire",
    "Surrey",
    "East Sussex",
    "Brighton and Hove",
    "Portsmouth",
  ],
  "East Sussex": ["West Sussex", "Brighton and Hove", "Kent", "Surrey"],
  "Brighton and Hove": ["East Sussex", "West Sussex"],
  Kent: ["Medway", "East Sussex", "Surrey", "London"],
  Medway: ["Kent"],
  Dorset: [
    "Hampshire",
    "Bournemouth, Christchurch and Poole",
    "Wiltshire",
  ],
  "Bournemouth, Christchurch and Poole": ["Dorset", "Hampshire"],
  "West Berkshire": [
    "Hampshire",
    "Reading",
    "Wokingham",
    "Windsor and Maidenhead",
    "Oxfordshire",
  ],
  Reading: [
    "West Berkshire",
    "Wokingham",
    "Windsor and Maidenhead",
    "Oxfordshire",
  ],
  Wokingham: [
    "Hampshire",
    "West Berkshire",
    "Reading",
    "Bracknell Forest",
    "Windsor and Maidenhead",
    "Surrey",
  ],
  "Bracknell Forest": [
    "Wokingham",
    "Windsor and Maidenhead",
    "Surrey",
    "Buckinghamshire",
  ],
  "Windsor and Maidenhead": [
    "Slough",
    "Buckinghamshire",
    "Bracknell Forest",
    "Wokingham",
    "Reading",
    "West Berkshire",
    "Surrey",
  ],
  Slough: ["Windsor and Maidenhead", "Buckinghamshire", "Surrey"],
  Buckinghamshire: [
    "Slough",
    "Windsor and Maidenhead",
    "Bracknell Forest",
    "Oxfordshire",
    "Milton Keynes",
    "Surrey",
  ],
  "Milton Keynes": ["Buckinghamshire", "Oxfordshire"],
  Oxfordshire: [
    "Buckinghamshire",
    "Milton Keynes",
    "West Berkshire",
    "Reading",
    "Wokingham",
  ],
};

/** @deprecated Packs are no longer a user-facing mode; kept for clearing legacy storage. */
export const ACTIVE_PACK_STORAGE_KEY = "schoolside.activeLaPack";

/** Neighbour LA labels for a district (coverage region only). */
export function neighbourLocalAuthorities(
  localAuthority?: string | null,
): string[] {
  if (!localAuthority?.trim()) return [];
  const norm = normalizeLaName(localAuthority).toLowerCase();
  for (const [la, neighbours] of Object.entries(COVERAGE_LA_NEIGHBOURS)) {
    if (normalizeLaName(la).toLowerCase() === norm) {
      return [...neighbours];
    }
  }
  return [];
}

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

export function isSoutheastPlusDorsetLocalAuthority(
  localAuthority?: string | null,
): boolean {
  return isCoverageRegionLocalAuthority(localAuthority);
}

export function isCoverageRegionLocalAuthority(
  localAuthority?: string | null,
): boolean {
  if (!localAuthority) return false;
  const target = normalizeLaName(localAuthority).toLowerCase();
  return COVERAGE_REGION_LOCAL_AUTHORITIES.some(
    (la) => normalizeLaName(la).toLowerCase() === target,
  );
}

export function isLondonBoroughLocalAuthority(
  localAuthority?: string | null,
): boolean {
  if (!localAuthority) return false;
  const target = normalizeLaName(localAuthority).toLowerCase();
  return LONDON_BOROUGH_LOCAL_AUTHORITIES.some(
    (la) => normalizeLaName(la).toLowerCase() === target,
  );
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
