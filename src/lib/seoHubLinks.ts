/**
 * Hub internal links: area school lists and nearest-town hub assignment
 * for sitemap schools in places below townMinSchools.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { haversineMetres } from "@/lib/nearby";
import {
  laSlug,
  packDataPathBySlug,
  SEED_LOCAL_AUTHORITY,
} from "@/lib/laPacks";
import type { SchoolRecord, SchoolsIndex } from "@/lib/types";
import {
  getSeoTown,
  getSeoTownForSchool,
  listSeoSchools,
  listSeoSchoolsInTown,
  listSeoTowns,
  schoolInSeoTown,
  type SeoSchoolSummary,
  type SeoTown,
} from "@/lib/seoSchools";

export function listSeoSchoolsInArea(areaSlug: string): SeoSchoolSummary[] {
  return listSeoSchools()
    .filter((school) => school.areaSlug === areaSlug)
    .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}

/** True when this school is listed on its postal-town hub page today. */
export function schoolOnNativeTownHub(school: SeoSchoolSummary): boolean {
  const town = getSeoTownForSchool(school);
  if (!town) return false;
  return schoolInSeoTown(school, town);
}

function publicPath(relativePath: string): string {
  return join(process.cwd(), "public", relativePath.replace(/^\//, ""));
}

const coordsLoadedAreas = new Set<string>();
const coordsByUrn = new Map<string, { lat: number; lon: number } | null>();

function loadSchoolCoordsForArea(areaSlug: string): void {
  if (coordsLoadedAreas.has(areaSlug)) return;
  coordsLoadedAreas.add(areaSlug);
  const seedSlug = laSlug(SEED_LOCAL_AUTHORITY);
  const rel =
    areaSlug === seedSlug
      ? "data/schools-index.json"
      : packDataPathBySlug(areaSlug, "schools-index.json").replace(/^\//, "");
  const path = publicPath(rel);
  if (!existsSync(path)) return;
  const index = JSON.parse(readFileSync(path, "utf8")) as SchoolsIndex;
  for (const school of index.schools) {
    const urn = String(school.urn ?? "").trim();
    if (!urn) continue;
    const lat = school.latitude;
    const lon = school.longitude;
    if (lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon)) {
      coordsByUrn.set(urn, { lat, lon });
    } else {
      coordsByUrn.set(urn, null);
    }
  }
}

export function schoolSeoCoordinates(
  school: SeoSchoolSummary,
): { lat: number; lon: number } | null {
  loadSchoolCoordsForArea(school.areaSlug);
  return coordsByUrn.get(school.urn) ?? null;
}

const townCentroidCache = new Map<string, { lat: number; lon: number } | null>();

function townHubCentroid(town: SeoTown): { lat: number; lon: number } | null {
  const key = `${town.areaSlug}::${town.slug}`;
  if (townCentroidCache.has(key)) return townCentroidCache.get(key) ?? null;
  const schools = listSeoSchoolsInTown(town);
  const points = schools
    .map((s) => schoolSeoCoordinates(s))
    .filter((p): p is { lat: number; lon: number } => p != null);
  let centroid: { lat: number; lon: number } | null = null;
  if (points.length) {
    const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const lon = points.reduce((sum, p) => sum + p.lon, 0) / points.length;
    centroid = { lat, lon };
  }
  townCentroidCache.set(key, centroid);
  return centroid;
}

let orphanTownKeyByUrn: Map<string, string> | null = null;

function townKey(town: SeoTown): string {
  return `${town.areaSlug}::${town.slug}`;
}

function buildOrphanTownAssignments(): Map<string, string> {
  const map = new Map<string, string>();
  for (const school of listSeoSchools()) {
    if (schoolOnNativeTownHub(school)) continue;
    const hubs = listSeoTowns(school.areaSlug);
    if (!hubs.length) continue;

    const coord = schoolSeoCoordinates(school);
    let picked: SeoTown | undefined;
    if (coord) {
      let bestM = Infinity;
      for (const hub of hubs) {
        const center = townHubCentroid(hub);
        if (!center) continue;
        const m = haversineMetres(coord.lat, coord.lon, center.lat, center.lon);
        if (m < bestM) {
          bestM = m;
          picked = hub;
        }
      }
    }
    if (!picked) {
      picked = [...hubs].sort(
        (a, b) =>
          b.schoolCount - a.schoolCount ||
          a.name.localeCompare(b.name, "en-GB"),
      )[0];
    }
    if (picked) map.set(school.urn, townKey(picked));
  }
  return map;
}

function orphanTownKeyForSchool(school: SeoSchoolSummary): string | undefined {
  if (!orphanTownKeyByUrn) {
    orphanTownKeyByUrn = buildOrphanTownAssignments();
  }
  return orphanTownKeyByUrn.get(school.urn);
}

/** Nearest town hub for a school not on its own postal-town hub (SEO orphan). */
export function nearestSeoTownHubForSchool(
  school: SeoSchoolSummary,
): SeoTown | undefined {
  const key = orphanTownKeyForSchool(school);
  if (!key) return undefined;
  const [areaSlug, townSlug] = key.split("::");
  return getSeoTown(townSlug, areaSlug);
}

/**
 * Schools linked from a town hub: native postal-town members plus
 * small-place schools assigned to this nearest hub.
 */
export function listSeoSchoolsForTownHub(town: SeoTown): SeoSchoolSummary[] {
  const native = listSeoSchoolsInTown(town);
  const nativeUrns = new Set(native.map((s) => s.urn));
  const assigned = listSeoSchools().filter((school) => {
    if (school.areaSlug !== town.areaSlug) return false;
    if (nativeUrns.has(school.urn)) return false;
    const key = orphanTownKeyForSchool(school);
    return key === townKey(town);
  });
  return [...native, ...assigned].sort((a, b) =>
    a.name.localeCompare(b.name, "en-GB"),
  );
}

export type HubLinkAudit = {
  sitemapSchools: number;
  linkedFromHubs: number;
  hubOrphans: number;
  linkedFromAreaHubs: number;
  linkedFromTownHubs: number;
  beforeStyleTownOnly: number;
};

/** Count hub-orphan sitemap schools (build-time graph, matches static HTML). */
export function auditSeoHubLinks(): HubLinkAudit {
  const all = listSeoSchools();
  const fromArea = new Set<string>();
  const fromTown = new Set<string>();

  const areaSlugs = [...new Set(all.map((s) => s.areaSlug))];
  for (const slug of areaSlugs) {
    for (const school of listSeoSchoolsInArea(slug)) {
      fromArea.add(school.urn);
    }
  }
  for (const town of listSeoTowns()) {
    for (const school of listSeoSchoolsForTownHub(town)) {
      fromTown.add(school.urn);
    }
  }

  const linked = new Set<string>([...fromArea, ...fromTown]);
  const townOnly = new Set<string>();
  for (const town of listSeoTowns()) {
    for (const school of listSeoSchoolsInTown(town)) {
      townOnly.add(school.urn);
    }
  }

  return {
    sitemapSchools: all.length,
    linkedFromHubs: linked.size,
    hubOrphans: all.length - linked.size,
    linkedFromAreaHubs: fromArea.size,
    linkedFromTownHubs: fromTown.size,
    beforeStyleTownOnly: townOnly.size,
  };
}
