import type { SchoolRecord } from "@/lib/types";

const EARTH_RADIUS_M = 6371000;

export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export interface NearbySchool extends SchoolRecord {
  straightLineMetres: number;
  roadMetres?: number | null;
  roadMinutes?: number | null;
}

export function findNearbySchools(
  home: { latitude: number; longitude: number },
  schools: SchoolRecord[],
  radiusMetres: number,
  limit = 40,
  matches?: (school: SchoolRecord) => boolean,
): NearbySchool[] {
  const hits: NearbySchool[] = [];
  for (const school of schools) {
    if (school.latitude == null || school.longitude == null) continue;
    if (matches && !matches(school)) continue;
    const straightLineMetres = haversineMetres(
      home.latitude,
      home.longitude,
      school.latitude,
      school.longitude,
    );
    if (straightLineMetres > radiusMetres) continue;
    hits.push({ ...school, straightLineMetres });
  }
  hits.sort((a, b) => a.straightLineMetres - b.straightLineMetres);
  return hits.slice(0, limit);
}

/** Door-to-door driving distances via the public OSRM table service. */
export async function fetchRoadDistances(
  home: { longitude: number; latitude: number },
  destinations: Array<{ longitude: number; latitude: number }>,
): Promise<Array<{ metres: number | null; minutes: number | null }>> {
  if (destinations.length === 0) return [];
  // OSRM public API is happiest with modest batches
  const batchSize = 50;
  const results: Array<{ metres: number | null; minutes: number | null }> = [];

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    const coords = [
      `${home.longitude},${home.latitude}`,
      ...batch.map((d) => `${d.longitude},${d.latitude}`),
    ].join(";");
    const url =
      `https://router.project-osrm.org/table/v1/driving/${coords}` +
      `?sources=0&annotations=distance,duration`;
    const res = await fetch(url);
    if (!res.ok) {
      results.push(...batch.map(() => ({ metres: null, minutes: null })));
      continue;
    }
    const data = (await res.json()) as {
      code?: string;
      distances?: Array<Array<number | null>>;
      durations?: Array<Array<number | null>>;
    };
    if (data.code !== "Ok" || !data.distances?.[0]) {
      results.push(...batch.map(() => ({ metres: null, minutes: null })));
      continue;
    }
    const distances = data.distances[0].slice(1);
    const durations = data.durations?.[0]?.slice(1) ?? [];
    for (let j = 0; j < batch.length; j += 1) {
      const metres = distances[j];
      const seconds = durations[j];
      results.push({
        metres: metres == null ? null : Math.round(metres),
        minutes: seconds == null ? null : Math.round(seconds / 60),
      });
    }
  }

  return results;
}

export function fmtDistance(metres: number | null | undefined): string {
  if (metres == null || Number.isNaN(metres)) return "—";
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km`;
}

export function fmtDrive(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
