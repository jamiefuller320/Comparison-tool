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
  /** When merged from several LA files, list contributing labels. */
  localAuthorities?: string[];
  source?: {
    note?: string;
    finder?: string;
    licence?: string;
    publisher?: string;
    contributors?: Array<{
      localAuthority: string;
      slug: string;
      finder?: string;
    }>;
  };
  features: CatchmentFeature[];
}

export interface CatchmentManifestEntry {
  localAuthority: string;
  slug: string;
  status: "ready" | "building" | "planned";
  path: string;
  publisher?: string;
  licence?: string;
  finder?: string;
}

export interface CatchmentManifest {
  generatedAt?: string;
  note?: string;
  packs: Record<string, CatchmentManifestEntry>;
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

/** Merge FeatureCollections from several LA harvests (dedupe by urn+band). */
export function mergeCatchmentCollections(
  collections: CatchmentCollection[],
): CatchmentCollection | null {
  const usable = collections.filter((c) => (c.features || []).length > 0);
  if (!usable.length) return null;
  if (usable.length === 1) return usable[0]!;

  const seen = new Set<string>();
  const features: CatchmentFeature[] = [];
  const las: string[] = [];
  const contributors: NonNullable<
    NonNullable<CatchmentCollection["source"]>["contributors"]
  > = [];

  for (const collection of usable) {
    const la = collection.localAuthority || "Unknown";
    if (!las.includes(la)) las.push(la);
    contributors.push({
      localAuthority: la,
      slug: (la || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      finder: collection.source?.finder,
    });
    for (const feature of collection.features || []) {
      const urn = feature.properties?.urn || "";
      const band = feature.properties?.band || "";
      const key = `${urn}|${band}`;
      if (urn && seen.has(key)) continue;
      if (urn) seen.add(key);
      features.push(feature);
    }
  }

  const finders = contributors.map((c) => c.finder).filter(Boolean);
  return {
    type: "FeatureCollection",
    generatedAt: usable.map((c) => c.generatedAt).filter(Boolean).sort().at(-1),
    localAuthority: las.length === 1 ? las[0] : undefined,
    localAuthorities: las,
    source: {
      note:
        las.length === 1
          ? usable[0]!.source?.note
          : `Merged catchment polygons from ${las.join(", ")}. Boundaries change; living in-catchment does not guarantee a place.`,
      licence: usable.map((c) => c.source?.licence).find(Boolean),
      finder: finders[0],
      contributors,
    },
    features,
  };
}

async function loadCatchmentManifest(
  fetchImpl: typeof fetch,
): Promise<CatchmentManifest | null> {
  try {
    const res = await fetchImpl("/data/catchments/manifest.json");
    if (!res.ok) return null;
    return (await res.json()) as CatchmentManifest;
  } catch {
    return null;
  }
}

/**
 * Load every ready catchment pack from the manifest and merge.
 * Falls back to Hampshire-only when the manifest is missing (legacy).
 */
export async function loadCatchmentOverlay(
  fetchImpl: typeof fetch = fetch,
): Promise<CatchmentCollection | null> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const manifest = await loadCatchmentManifest(fetchImpl);
      const entries = Object.values(manifest?.packs || {}).filter(
        (p) => p.status === "ready" && p.path,
      );
      const paths = entries.length
        ? entries.map((e) => e.path)
        : ["/data/catchments/hampshire.json"];

      const collections: CatchmentCollection[] = [];
      await Promise.all(
        paths.map(async (path) => {
          try {
            const res = await fetchImpl(path);
            if (!res.ok) return;
            const data = (await res.json()) as CatchmentCollection;
            if (data?.features?.length) collections.push(data);
          } catch {
            /* skip failed pack */
          }
        }),
      );

      // Prefer publisher metadata from the manifest when present.
      const merged = mergeCatchmentCollections(collections);
      if (merged && entries.length) {
        merged.source = {
          ...merged.source,
          contributors: entries.map((e) => ({
            localAuthority: e.localAuthority,
            slug: e.slug,
            finder: e.finder,
          })),
          finder: entries[0]?.finder || merged.source?.finder,
          licence: entries[0]?.licence || merged.source?.licence,
        };
        merged.localAuthorities = entries.map((e) => e.localAuthority);
        if (entries.length === 1) {
          merged.localAuthority = entries[0]!.localAuthority;
        }
      }
      cache = merged;
      return merged;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** @deprecated Prefer loadCatchmentOverlay — kept for older call sites / tests. */
export async function loadHampshireCatchments(
  fetchImpl: typeof fetch = fetch,
): Promise<CatchmentCollection | null> {
  return loadCatchmentOverlay(fetchImpl);
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
        detail: "Open-data catchment polygons have not loaded yet.",
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
          "This school has a catchment polygon, but not for the stage bands currently selected.",
      };
    default:
      return {
        label: "No catchment polygon",
        detail:
          "No open-data catchment polygon matched this school (common for academies with different arrangements, independents, special settings, or LAs that do not publish polygons).",
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
