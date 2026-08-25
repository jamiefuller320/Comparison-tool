/**
 * Ensure the collated school index includes ready LA packs for the user's
 * current admin district (postcodes.io) plus contiguous neighbours.
 * Used after postcode lookup / map pin relocate so crossing unitary
 * boundaries (e.g. Hampshire → Southampton) brings pack schools into the
 * Finder ring — without downloading every South East pack up front.
 */

import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import {
  loadLaPackChildmindersIndex,
  loadLaPackEyProvidersIndex,
  loadLaPackSchoolsIndex,
  loadPackUrnLookup,
} from "@/lib/data";
import { loadReadyPackEntries } from "@/lib/collateIndexes";
import {
  isLocalAuthority,
  laSlug,
  mergeChildmindersWithPacks,
  mergeEyProvidersWithPacks,
  mergeSchoolsIndexWithPacks,
  neighbourLocalAuthorities,
  normalizeLaName,
  type LaPackManifestEntry,
  type SchoolsIndexWithPack,
} from "@/lib/laPacks";
import { mapPool } from "@/lib/resilientFetch";

export const AREA_PACK_FETCH_CONCURRENCY = 3;

export function findReadyPackForDistrict(
  ready: LaPackManifestEntry[],
  adminDistrict?: string | null,
): LaPackManifestEntry | null {
  if (!adminDistrict?.trim()) return null;
  const slug = laSlug(adminDistrict);
  const norm = normalizeLaName(adminDistrict).toLowerCase();
  return (
    ready.find(
      (entry) =>
        entry.slug === slug ||
        normalizeLaName(entry.localAuthority).toLowerCase() === norm,
    ) ?? null
  );
}

export function indexCoversLocalAuthority(
  index: SchoolsIndex | SchoolsIndexWithPack,
  localAuthority: string,
): boolean {
  const labels = (index as SchoolsIndexWithPack).collatedPackLabels || [];
  if (labels.some((label) => isLocalAuthority(label, localAuthority))) {
    return true;
  }
  return index.schools.some((school) =>
    isLocalAuthority(school.localAuthority, localAuthority),
  );
}

export type AreaCoverageIndexes = {
  schools: SchoolsIndex | SchoolsIndexWithPack;
  ey: EyProvidersIndex | null;
  childminders: ChildmindersIndex | null;
};

/** Ready packs for a district plus its coverage-region neighbours. */
export function selectGeoLazyPacks(
  ready: LaPackManifestEntry[],
  adminDistrict?: string | null,
): LaPackManifestEntry[] {
  if (!adminDistrict?.trim()) return [];
  const wanted = new Set<string>([
    normalizeLaName(adminDistrict).toLowerCase(),
    ...neighbourLocalAuthorities(adminDistrict).map((la) =>
      normalizeLaName(la).toLowerCase(),
    ),
  ]);
  return ready.filter((entry) =>
    wanted.has(normalizeLaName(entry.localAuthority).toLowerCase()),
  );
}

async function mergeMissingPacks(
  current: AreaCoverageIndexes,
  packs: LaPackManifestEntry[],
  fetchImpl: typeof fetch,
  cacheBust: boolean,
): Promise<{
  next: AreaCoverageIndexes;
  loadedLabels: string[];
}> {
  const missing = packs.filter(
    (entry) =>
      !indexCoversLocalAuthority(current.schools, entry.localAuthority),
  );
  if (!missing.length) {
    return { next: current, loadedLabels: [] };
  }

  const schoolRows = await mapPool(
    missing,
    AREA_PACK_FETCH_CONCURRENCY,
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

  const eyRows = current.ey
    ? await mapPool(missing, AREA_PACK_FETCH_CONCURRENCY, async (entry) => {
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

  const cmRows = current.childminders
    ? await mapPool(missing, AREA_PACK_FETCH_CONCURRENCY, async (entry) => {
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

  if (!schoolPacks.length && !eyPacks.length && !cmPacks.length) {
    return { next: current, loadedLabels: [] };
  }

  const loadedLabels = [
    ...new Set(
      [...schoolPacks, ...eyPacks, ...cmPacks].map((p) => p.meta.localAuthority),
    ),
  ];

  return {
    next: {
      schools: schoolPacks.length
        ? mergeSchoolsIndexWithPacks(current.schools, schoolPacks)
        : current.schools,
      ey:
        current.ey && eyPacks.length
          ? mergeEyProvidersWithPacks(current.ey, eyPacks)
          : current.ey,
      childminders:
        current.childminders && cmPacks.length
          ? mergeChildmindersWithPacks(current.childminders, cmPacks)
          : current.childminders,
    },
    loadedLabels,
  };
}

/**
 * If `adminDistrict` matches ready packs (district + neighbours) not yet in
 * the index, fetch and merge them. Returns null when nothing needed loading.
 */
export async function ensureAreaCoverageForDistrict(
  current: AreaCoverageIndexes,
  adminDistrict: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
  cacheBust = true,
): Promise<{
  next: AreaCoverageIndexes;
  loadedLabel: string | null;
  loadedLabels: string[];
} | null> {
  const ready = await loadReadyPackEntries(fetchImpl, cacheBust);
  const targets = selectGeoLazyPacks(ready, adminDistrict);
  if (!targets.length) return null;

  const { next, loadedLabels } = await mergeMissingPacks(
    current,
    targets,
    fetchImpl,
    cacheBust,
  );
  if (!loadedLabels.length) return null;

  return {
    next,
    loadedLabel: loadedLabels[0] ?? null,
    loadedLabels,
  };
}

/**
 * Load packs needed for shared shortlist URNs that are not yet in the index
 * (geo-lazy: seed-only boot cannot resolve pack URNs until their pack loads).
 */
export async function ensureAreaCoverageForUrns(
  current: AreaCoverageIndexes,
  urns: string[],
  fetchImpl: typeof fetch = fetch,
  cacheBust = true,
): Promise<{
  next: AreaCoverageIndexes;
  loadedLabel: string | null;
  loadedLabels: string[];
} | null> {
  const needed = [
    ...new Set(
      urns
        .map((u) => String(u || "").trim())
        .filter((urn) => urn && !current.schools.schools.some((s) => s.urn === urn)),
    ),
  ];
  // Also check EY / CM indexes for already-loaded coverage.
  const stillNeeded = needed.filter((urn) => {
    if (current.ey?.providers.some((p) => p.urn === urn)) return false;
    if (current.childminders?.providers.some((p) => p.urn === urn)) return false;
    return true;
  });
  if (!stillNeeded.length) return null;

  const [ready, lookup] = await Promise.all([
    loadReadyPackEntries(fetchImpl, cacheBust),
    loadPackUrnLookup(fetchImpl, cacheBust),
  ]);
  if (!lookup) return null;

  const slugs = new Set<string>();
  for (const urn of stillNeeded) {
    const slug = lookup.byUrn[urn];
    if (slug) slugs.add(slug);
  }
  if (!slugs.size) return null;

  const targets = ready.filter((entry) => slugs.has(entry.slug));
  if (!targets.length) return null;

  const { next, loadedLabels } = await mergeMissingPacks(
    current,
    targets,
    fetchImpl,
    cacheBust,
  );
  if (!loadedLabels.length) return null;

  return {
    next,
    loadedLabel: loadedLabels[0] ?? null,
    loadedLabels,
  };
}

/** @deprecated Prefer ensureAreaCoverageForDistrict — kept for older imports. */
export async function ensureSinglePackForDistrict(
  current: AreaCoverageIndexes,
  adminDistrict: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
  cacheBust = true,
): Promise<{
  next: AreaCoverageIndexes;
  loadedLabel: string | null;
} | null> {
  const ready = await loadReadyPackEntries(fetchImpl, cacheBust);
  const match = findReadyPackForDistrict(ready, adminDistrict);
  if (!match) return null;
  if (indexCoversLocalAuthority(current.schools, match.localAuthority)) {
    return null;
  }
  const { next, loadedLabels } = await mergeMissingPacks(
    current,
    [match],
    fetchImpl,
    cacheBust,
  );
  if (!loadedLabels.length) return null;
  return { next, loadedLabel: loadedLabels[0] ?? null };
}
