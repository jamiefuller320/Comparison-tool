/**
 * Progressive collation: seed indexes first, then silent-merge LA packs.
 */

import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import {
  loadChildmindersIndex,
  loadEyProvidersIndex,
  loadLaPackChildmindersIndex,
  loadLaPackEyProvidersIndex,
  loadLaPackManifest,
  loadLaPackSchoolsIndex,
  loadSchoolsIndex,
} from "@/lib/data";
import {
  listReadyPacks,
  mergeChildmindersWithPacks,
  mergeEyProvidersWithPacks,
  mergeSchoolsIndexWithPacks,
  type LaPackManifestEntry,
} from "@/lib/laPacks";
import { mapPool } from "@/lib/resilientFetch";

/** Parallel pack downloads — keeps slow links from opening dozens at once. */
export const PACK_FETCH_CONCURRENCY = 3;

export interface SeedIndexes {
  schools: SchoolsIndex;
  ey: EyProvidersIndex | null;
  childminders: ChildmindersIndex | null;
}

export interface CollatedIndexes extends SeedIndexes {
  readyPacks: LaPackManifestEntry[];
  packsLoaded: number;
  packsFailed: number;
}

export async function loadReadyPackEntries(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<LaPackManifestEntry[]> {
  const manifest = await loadLaPackManifest(fetchImpl, cacheBust);
  return listReadyPacks(manifest);
}

/** Hampshire (and any other seed) only — enough to paint the UI. */
export async function loadSeedIndexes(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<SeedIndexes> {
  const [schools, ey, childminders] = await Promise.all([
    loadSchoolsIndex(fetchImpl, cacheBust),
    loadEyProvidersIndex(fetchImpl, cacheBust),
    loadChildmindersIndex(fetchImpl, cacheBust),
  ]);
  return { schools, ey, childminders };
}

export async function mergePacksIntoIndexes(
  seed: SeedIndexes,
  ready: LaPackManifestEntry[],
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<CollatedIndexes> {
  if (!ready.length) {
    return {
      ...seed,
      readyPacks: [],
      packsLoaded: 0,
      packsFailed: 0,
    };
  }

  const schoolRows = await mapPool(
    ready,
    PACK_FETCH_CONCURRENCY,
    async (entry) => {
      const index = await loadLaPackSchoolsIndex(
        entry.slug,
        fetchImpl,
        cacheBust,
      );
      return index ? { index, meta: entry } : null;
    },
  );
  const schoolPacks = schoolRows.filter(
    (row): row is { index: SchoolsIndex; meta: LaPackManifestEntry } =>
      Boolean(row),
  );
  const packsFailed = schoolRows.filter((row) => !row).length;

  const eyRows = seed.ey
    ? await mapPool(ready, PACK_FETCH_CONCURRENCY, async (entry) => {
        const index = await loadLaPackEyProvidersIndex(
          entry.slug,
          fetchImpl,
          cacheBust,
        );
        return index ? { index, meta: entry } : null;
      })
    : [];
  const eyPacks = eyRows.filter(
    (row): row is { index: EyProvidersIndex; meta: LaPackManifestEntry } =>
      Boolean(row),
  );

  const cmRows = seed.childminders
    ? await mapPool(ready, PACK_FETCH_CONCURRENCY, async (entry) => {
        const index = await loadLaPackChildmindersIndex(
          entry.slug,
          fetchImpl,
          cacheBust,
        );
        return index ? { index, meta: entry } : null;
      })
    : [];
  const cmPacks = cmRows.filter(
    (row): row is { index: ChildmindersIndex; meta: LaPackManifestEntry } =>
      Boolean(row),
  );

  const packsLoaded = new Set([
    ...schoolPacks.map((p) => p.meta.slug),
    ...eyPacks.map((p) => p.meta.slug),
    ...cmPacks.map((p) => p.meta.slug),
  ]).size;

  return {
    schools: schoolPacks.length
      ? mergeSchoolsIndexWithPacks(seed.schools, schoolPacks)
      : seed.schools,
    ey:
      seed.ey && eyPacks.length
        ? mergeEyProvidersWithPacks(seed.ey, eyPacks)
        : seed.ey,
    childminders:
      seed.childminders && cmPacks.length
        ? mergeChildmindersWithPacks(seed.childminders, cmPacks)
        : seed.childminders,
    readyPacks: ready,
    packsLoaded,
    packsFailed,
  };
}

/** Full collation in one shot (tests / forced reload). */
export async function loadCollatedIndexes(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<CollatedIndexes> {
  const seed = await loadSeedIndexes(fetchImpl, cacheBust);
  const ready = await loadReadyPackEntries(fetchImpl, cacheBust);
  return mergePacksIntoIndexes(seed, ready, fetchImpl, cacheBust);
}
