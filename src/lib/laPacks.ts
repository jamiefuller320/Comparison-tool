/**
 * Seed geography and on-demand local-authority pack helpers.
 * Hampshire stays the maintained root index; other LAs live under
 * `/data/packs/{slug}/`.
 */

import type { PhonicsBenchmarkSet, SchoolsIndex } from "@/lib/types";

export const SEED_LOCAL_AUTHORITY = "Hampshire";

/** Human label for UI / docs. */
export const SEED_GEOGRAPHY_LABEL = "Hampshire";

/** localStorage key for the last activated on-demand pack slug. */
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
  requestedAt?: string;
  builtAt?: string;
  note?: string;
  paths?: {
    schoolsIndex?: string;
    directory?: string;
  };
}

export interface LaPackManifest {
  generatedAt?: string;
  seedLocalAuthority: string;
  packs: Record<string, LaPackManifestEntry>;
}

export type SchoolsIndexWithPack = SchoolsIndex & {
  maintainedScope?: string;
  activePackSlug?: string;
  activePackLabel?: string;
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

/**
 * Overlay an on-demand LA pack onto the Hampshire maintained seed index.
 * Pack schools win on URN collision; England benches stay from the seed;
 * LA / phonics benches are unioned.
 */
export function mergeSchoolsIndexWithPack(
  seed: SchoolsIndex,
  pack: SchoolsIndex,
  packMeta?: Pick<LaPackManifestEntry, "slug" | "localAuthority">,
): SchoolsIndexWithPack {
  const byUrn = new Map(seed.schools.map((s) => [s.urn, s]));
  for (const school of pack.schools) {
    byUrn.set(school.urn, school);
  }
  const schools = [...byUrn.values()];
  const packLabel =
    packMeta?.localAuthority ||
    (pack as SchoolsIndexWithPack).maintainedScope ||
    "area pack";

  return {
    ...seed,
    schools,
    benchmarks: {
      ...seed.benchmarks,
      localAuthorities: {
        ...(seed.benchmarks.localAuthorities || {}),
        ...(pack.benchmarks.localAuthorities || {}),
      },
      phonics: mergePhonics(seed.benchmarks.phonics, pack.benchmarks.phonics),
      // Prefer seed sector benches (Hampshire-sized). Pack KS4 depth is a later step.
      independent: seed.benchmarks.independent ?? pack.benchmarks.independent,
      stateKs4: seed.benchmarks.stateKs4 ?? pack.benchmarks.stateKs4,
    },
    stats: {
      ...seed.stats,
      schoolCount: schools.length,
      withRwm: schools.filter((s) => s.rwmExpected != null).length,
      localAuthorityCount: new Set(
        schools.map((s) => s.localAuthority).filter(Boolean),
      ).size,
      withCoordinates: schools.filter((s) => s.latitude != null).length,
    },
    source: {
      ...seed.source,
      note: `${seed.source.note} Active on-demand pack: ${packLabel}${
        packMeta?.slug ? ` (${packMeta.slug})` : ""
      }.`,
    },
    activePackSlug: packMeta?.slug,
    activePackLabel: packLabel,
  };
}
