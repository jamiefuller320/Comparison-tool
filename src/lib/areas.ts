/**
 * Build-time coverage areas for SEO landings.
 * Hampshire is the maintained root; other LAs come from ready packs.
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  COVERAGE_REGION_LABEL,
  SEED_LOCAL_AUTHORITY,
  laSlug,
  listReadyPacks,
  type LaPackManifest,
} from "@/lib/laPacks";

export type CoverageArea = {
  slug: string;
  localAuthority: string;
  isSeed: boolean;
  schoolCount: number;
  withRwm: number | null;
  withKs4: number | null;
  eyProviderCount: number | null;
  childminderCount: number | null;
  lastModified: string | null;
};

type HarvestSummary = {
  schoolCount?: number;
  withRwm?: number;
  withKs4?: number;
  generatedAt?: string;
  inspectionPrecisEnrichedAt?: string;
};

type IndexWithStats = {
  stats?: {
    providerCount?: number;
  };
  generatedAt?: string;
};

function readPublicJson<T>(relativePath: string): T {
  const full = join(process.cwd(), "public", relativePath);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

let cachedAreas: CoverageArea[] | null = null;

function hampshireArea(): CoverageArea {
  const harvest = readPublicJson<HarvestSummary>("data/harvest-summary.json");
  const ey = readPublicJson<IndexWithStats>("data/ey-providers-index.json");
  const childminders = readPublicJson<IndexWithStats>(
    "data/childminders-index.json",
  );

  return {
    slug: laSlug(SEED_LOCAL_AUTHORITY),
    localAuthority: SEED_LOCAL_AUTHORITY,
    isSeed: true,
    schoolCount: harvest.schoolCount ?? 0,
    withRwm: harvest.withRwm ?? null,
    withKs4: harvest.withKs4 ?? null,
    eyProviderCount: ey.stats?.providerCount ?? null,
    childminderCount: childminders.stats?.providerCount ?? null,
    lastModified:
      harvest.inspectionPrecisEnrichedAt ??
      harvest.generatedAt ??
      ey.generatedAt ??
      null,
  };
}

/** All live coverage areas (seed + ready packs), A–Z. */
export function listCoverageAreas(): CoverageArea[] {
  if (cachedAreas) return cachedAreas;

  const manifest = readPublicJson<LaPackManifest>("data/packs/manifest.json");
  const packs = listReadyPacks(manifest).map(
    (pack): CoverageArea => ({
      slug: pack.slug,
      localAuthority: pack.localAuthority,
      isSeed: false,
      schoolCount: pack.schoolCount ?? 0,
      withRwm: pack.withRwm ?? null,
      withKs4: pack.withKs4 ?? null,
      eyProviderCount: pack.eyProviderCount ?? null,
      childminderCount: pack.childminderCount ?? null,
      lastModified: pack.builtAt ?? manifest.generatedAt ?? null,
    }),
  );

  cachedAreas = [hampshireArea(), ...packs].sort((a, b) =>
    a.localAuthority.localeCompare(b.localAuthority, "en-GB"),
  );
  return cachedAreas;
}

export function getCoverageArea(slug: string): CoverageArea | undefined {
  return listCoverageAreas().find((area) => area.slug === slug);
}

export function areaPath(slug: string): string {
  return `/areas/${slug}/`;
}

export function areasIndexPath(): string {
  return "/areas/";
}

export function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-GB");
}

export function areaPageTitle(area: CoverageArea): string {
  return `Compare schools in ${area.localAuthority}`;
}

export function areaPageDescription(area: CoverageArea): string {
  const schools = formatCount(area.schoolCount);
  const ey =
    area.eyProviderCount != null
      ? `${formatCount(area.eyProviderCount)} early years settings`
      : "early years settings";
  const cm =
    area.childminderCount != null
      ? ` and ${formatCount(area.childminderCount)} consented childminders`
      : "";
  return `Shortlist and compare ${schools} schools plus ${ey}${cm} in ${area.localAuthority}. DfE outcomes and Ofsted/ISI excerpts — parental compare across ${COVERAGE_REGION_LABEL}, not a league table.`;
}
