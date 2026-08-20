/**
 * Ensure the collated school index includes a ready LA pack for the user's
 * current admin district (postcodes.io). Used after postcode lookup / map pin
 * relocate so crossing unitary boundaries (e.g. Hampshire → Southampton)
 * actually brings that pack's schools into the Finder ring.
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
} from "@/lib/data";
import { loadReadyPackEntries } from "@/lib/collateIndexes";
import {
  isLocalAuthority,
  laSlug,
  mergeChildmindersWithPacks,
  mergeEyProvidersWithPacks,
  mergeSchoolsIndexWithPacks,
  normalizeLaName,
  type LaPackManifestEntry,
  type SchoolsIndexWithPack,
} from "@/lib/laPacks";

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

/**
 * If `adminDistrict` matches a ready pack that is not yet in the index,
 * fetch and merge that pack (schools + EY + childminders). Returns null when
 * nothing needed loading (seed district, unknown LA, or already covered).
 */
export async function ensureAreaCoverageForDistrict(
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

  const [schoolsPack, eyPack, cmPack] = await Promise.all([
    loadLaPackSchoolsIndex(match.slug, fetchImpl, cacheBust),
    current.ey
      ? loadLaPackEyProvidersIndex(match.slug, fetchImpl, cacheBust)
      : Promise.resolve(null),
    current.childminders
      ? loadLaPackChildmindersIndex(match.slug, fetchImpl, cacheBust)
      : Promise.resolve(null),
  ]);

  if (!schoolsPack && !eyPack && !cmPack) {
    return null;
  }

  return {
    next: {
      schools: schoolsPack
        ? mergeSchoolsIndexWithPacks(current.schools, [
            { index: schoolsPack, meta: match },
          ])
        : current.schools,
      ey:
        current.ey && eyPack
          ? mergeEyProvidersWithPacks(current.ey, [
              { index: eyPack, meta: match },
            ])
          : current.ey,
      childminders:
        current.childminders && cmPack
          ? mergeChildmindersWithPacks(current.childminders, [
              { index: cmPack, meta: match },
            ])
          : current.childminders,
    },
    loadedLabel: match.localAuthority,
  };
}
