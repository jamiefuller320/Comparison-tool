/** Normalise common UK postcode syntax variations into outward + inward form. */

const POSTCODE_RE =
  /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/;

export function parseUkPostcode(raw: string): string | null {
  if (!raw) return null;
  let text = raw.trim().toUpperCase();
  // Common separators / noise: SO40-2HR, SO40.2HR, SO40_2HR, SO40  2HR, so40 2hr
  text = text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Compact form without space: SO402HR
  const compact = text.replace(/\s+/g, "");
  const spaced =
    compact.length >= 5
      ? `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`
      : text;

  const candidates = [text, spaced, compact.replace(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/, "$1 $2")];
  for (const candidate of candidates) {
    const normalised = candidate.replace(/\s+/g, " ").trim();
    const match = normalised.match(POSTCODE_RE);
    if (match) return `${match[1]} ${match[2]}`;
  }
  return null;
}

export function isPartialPostcode(raw: string): boolean {
  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length >= 2 && compact.length < 5;
}

export interface GeocodedPostcode {
  postcode: string;
  latitude: number;
  longitude: number;
  adminDistrict?: string | null;
  region?: string | null;
}

function readGeocodeResult(result: {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district?: string;
  region?: string;
}): GeocodedPostcode {
  return {
    postcode: result.postcode,
    latitude: result.latitude,
    longitude: result.longitude,
    adminDistrict: result.admin_district ?? null,
    region: result.region ?? null,
  };
}

export async function geocodePostcode(
  postcode: string,
): Promise<GeocodedPostcode | null> {
  const normalised = parseUkPostcode(postcode);
  if (!normalised) return null;
  const res = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(normalised)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Postcode lookup failed (${res.status})`);
  const data = (await res.json()) as {
    result?: {
      postcode: string;
      latitude: number;
      longitude: number;
      admin_district?: string;
      region?: string;
    } | null;
  };
  if (!data.result) return null;
  return readGeocodeResult(data.result);
}

/** Nearest UK postcode for a map pin (postcodes.io reverse lookup). */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodedPostcode | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    limit: "1",
  });
  const res = await fetch(`https://api.postcodes.io/postcodes?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Reverse postcode lookup failed (${res.status})`);
  const data = (await res.json()) as {
    result?: Array<{
      postcode: string;
      latitude: number;
      longitude: number;
      admin_district?: string;
      region?: string;
    }> | null;
  };
  const nearest = data.result?.[0];
  if (!nearest) return null;
  return readGeocodeResult(nearest);
}
