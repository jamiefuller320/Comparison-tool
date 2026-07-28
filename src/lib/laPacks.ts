/**
 * Seed geography and on-demand local-authority pack helpers.
 * Hampshire stays the maintained root index; other LAs live under
 * `/data/packs/{slug}/`.
 */

export const SEED_LOCAL_AUTHORITY = "Hampshire";

/** Human label for UI / docs. */
export const SEED_GEOGRAPHY_LABEL = "Hampshire";

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
  localAuthority: string,
  file = "schools-index.json",
): string {
  return `/data/packs/${laSlug(localAuthority)}/${file}`;
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
