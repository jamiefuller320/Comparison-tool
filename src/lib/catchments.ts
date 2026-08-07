import type { PhaseId } from "@/lib/phases";

export type CatchmentBand = "ages-4-6" | "ages-7-10" | "ages-11-16";

export type CatchmentRelation = "in" | "out" | "unknown";

export type CatchmentUnknownReason =
  | "not-loaded"
  | "no-home"
  | "no-polygon"
  | "wrong-band";

export interface CatchmentFeatureProperties {
  urn?: string | null;
  name?: string | null;
  dfe?: string | null;
  laEstab?: string | null;
  band: CatchmentBand;
}

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type CatchmentGeometry = PolygonGeometry | MultiPolygonGeometry;

export interface CatchmentFeature {
  type: "Feature";
  properties: CatchmentFeatureProperties;
  geometry: CatchmentGeometry | null;
}

export interface CatchmentCollection {
  type: "FeatureCollection";
  generatedAt?: string;
  localAuthority?: string;
  source?: {
    note?: string;
    finder?: string;
    licence?: string;
  };
  features: CatchmentFeature[];
}

let cache: CatchmentCollection | null = null;
let inflight: Promise<CatchmentCollection | null> | null = null;

export function bandsForStages(stages: PhaseId[]): CatchmentBand[] {
  const bands = new Set<CatchmentBand>();
  if (stages.includes("early-years") || stages.includes("ks1")) {
    bands.add("ages-4-6");
  }
  if (stages.includes("ks2")) {
    bands.add("ages-7-10");
    // All-through / primary catchments often live in the infant layer too.
    bands.add("ages-4-6");
  }
  if (stages.includes("ks3") || stages.includes("ks4")) {
    bands.add("ages-11-16");
  }
  if (bands.size === 0) {
    bands.add("ages-4-6");
    bands.add("ages-7-10");
    bands.add("ages-11-16");
  }
  return [...bands];
}

export async function loadHampshireCatchments(
  fetchImpl: typeof fetch = fetch,
): Promise<CatchmentCollection | null> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetchImpl("/data/catchments/hampshire.json");
      if (!res.ok) return null;
      const data = (await res.json()) as CatchmentCollection;
      cache = data;
      return data;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Ray-casting point-in-polygon for rings in [lng, lat] order. */
export function pointInRing(
  lng: number,
  lat: number,
  ring: number[][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];
    if (
      xi == null ||
      yi == null ||
      xj == null ||
      yj == null ||
      Number.isNaN(xi)
    ) {
      continue;
    }
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(
  lng: number,
  lat: number,
  geometry: CatchmentFeature["geometry"],
): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates;
    if (!rings?.[0] || !pointInRing(lng, lat, rings[0])) return false;
    // Holes
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i]!)) return false;
    }
    return true;
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => {
      if (!poly?.[0] || !pointInRing(lng, lat, poly[0])) return false;
      for (let i = 1; i < poly.length; i++) {
        if (pointInRing(lng, lat, poly[i]!)) return false;
      }
      return true;
    });
  }
  return false;
}

export function featuresForUrns(
  collection: CatchmentCollection | null,
  urns: string[],
  bands?: CatchmentBand[],
): CatchmentFeature[] {
  if (!collection) return [];
  const urnSet = new Set(urns);
  const bandSet = bands ? new Set(bands) : null;
  return collection.features.filter((f) => {
    const urn = f.properties?.urn;
    if (!urn || !urnSet.has(urn)) return false;
    if (bandSet && !bandSet.has(f.properties.band)) return false;
    return Boolean(f.geometry);
  });
}

export function classifyCatchmentUnknown(
  home: { latitude: number; longitude: number } | null,
  collection: CatchmentCollection | null,
  urn: string,
  bands?: CatchmentBand[],
): CatchmentUnknownReason | null {
  if (!collection) return "not-loaded";
  if (!home) return "no-home";
  const anyForUrn = featuresForUrns(collection, [urn]);
  if (anyForUrn.length === 0) return "no-polygon";
  const bandFeats = featuresForUrns(collection, [urn], bands);
  if (bandFeats.length === 0) return "wrong-band";
  return null;
}

export function catchmentUnknownMeta(reason: CatchmentUnknownReason): {
  label: string;
  detail: string;
} {
  switch (reason) {
    case "not-loaded":
      return {
        label: "Catchments still loading",
        detail: "Hampshire catchment polygons have not loaded yet.",
      };
    case "no-home":
      return {
        label: "Needs a home postcode",
        detail: "Set a home postcode to test in/out of catchment.",
      };
    case "wrong-band":
      return {
        label: "No catchment for these stages",
        detail:
          "This school has a Hampshire catchment polygon, but not for the stage bands currently selected.",
      };
    default:
      return {
        label: "No catchment polygon",
        detail:
          "No Hampshire open-data catchment polygon matched this school (common for academies with different arrangements, independents, or special settings).",
      };
  }
}

export function catchmentRelationForSchool(
  home: { latitude: number; longitude: number } | null,
  collection: CatchmentCollection | null,
  urn: string,
  bands?: CatchmentBand[],
): CatchmentRelation {
  if (classifyCatchmentUnknown(home, collection, urn, bands)) return "unknown";
  const feats = featuresForUrns(collection, [urn], bands);
  const inside = feats.some((f) =>
    pointInGeometry(home!.longitude, home!.latitude, f.geometry),
  );
  return inside ? "in" : "out";
}

export function homeCatchmentMatches(
  home: { latitude: number; longitude: number },
  collection: CatchmentCollection | null,
  candidateUrns: string[],
  bands?: CatchmentBand[],
): { urn: string; name: string | null; band: CatchmentBand }[] {
  if (!collection) return [];
  const matches: { urn: string; name: string | null; band: CatchmentBand }[] =
    [];
  for (const feature of featuresForUrns(collection, candidateUrns, bands)) {
    const urn = feature.properties.urn;
    if (!urn) continue;
    if (
      pointInGeometry(home.longitude, home.latitude, feature.geometry)
    ) {
      matches.push({
        urn,
        name: feature.properties.name ?? null,
        band: feature.properties.band,
      });
    }
  }
  return matches;
}

export function catchmentRelationLabel(
  relation: CatchmentRelation,
  unknownReason?: CatchmentUnknownReason | null,
): string {
  if (relation === "in") return "In catchment";
  if (relation === "out") return "Outside catchment";
  if (unknownReason) return catchmentUnknownMeta(unknownReason).label;
  return "Catchment unknown";
}
