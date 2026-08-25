/**
 * Build-time school + town landings for SEO.
 * Hampshire seed is always included; ready packs join via seo-coverage.json
 * so static Pages HTML grows under a page budget as data volumes increase.
 * Thin summaries only — do not embed full qualitative capture into HTML.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { areaPath, formatCount } from "@/lib/areas";
import { BRAND_HOME_URL } from "@/lib/brand";
import {
  SEED_LOCAL_AUTHORITY,
  laSlug,
  listReadyPacks,
  packDataPathBySlug,
  type LaPackManifest,
} from "@/lib/laPacks";
import type { SchoolRecord, SchoolsIndex } from "@/lib/types";

/** Fallback when seo-coverage.json is missing or incomplete. */
export const SEO_TOWN_MIN_SCHOOLS = 8;

/** Default static-export budget (school HTML pages). */
export const SEO_DEFAULT_MAX_SCHOOL_PAGES = 1500;

/** Default town-page budget across all included areas. */
export const SEO_DEFAULT_MAX_TOWN_PAGES = 80;

export type SeoCoveragePolicy = {
  seedAlwaysIncluded: boolean;
  townMinSchools: number;
};

export type SeoCoverage = {
  version: number;
  generatedAt: string | null;
  pageBudget: {
    maxSchoolPages: number;
    maxTownPages: number;
  };
  policy: SeoCoveragePolicy;
  includedAreaSlugs: string[];
  stats?: Record<string, unknown>;
};

export type SeoSchoolSummary = {
  urn: string;
  name: string;
  localAuthority: string;
  areaSlug: string;
  town: string | null;
  postcode: string | null;
  address: string | null;
  phase: string | null;
  phases: NonNullable<SchoolRecord["phases"]> | null;
  sector: SchoolRecord["sector"];
  schoolTypeLabel: string | null;
  ageRange: string | null;
  ofstedOverall: string | null;
  ofstedPublicationDate: string | null;
  ofstedReportUrl: string | null;
  rwmExpected: number | null;
  att8Average: number | null;
  engMath94Percent: number | null;
  schoolWebsite: string | null;
  giasUrl: string | null;
  compareUrl: string | null;
  /** Short verbatim précis for unique crawlable copy (truncated). */
  inspectionPrecis: string | null;
  inspectionReportFileUrl: string | null;
  inspectionReportLabel: string | null;
};

export type SeoTown = {
  slug: string;
  name: string;
  localAuthority: string;
  areaSlug: string;
  schoolCount: number;
  withOfsted: number;
  withRwm: number;
  withKs4: number;
};

function readPublicJson<T>(relativePath: string): T {
  const full = join(process.cwd(), "public", relativePath);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

function publicPath(relativePath: string): string {
  return join(process.cwd(), "public", relativePath.replace(/^\//, ""));
}

function truncatePrecis(text: string | null | undefined, max = 420): string | null {
  const t = text?.trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
  if (lastStop > max * 0.55) return cut.slice(0, lastStop + 1).trim();
  return `${cut.replace(/\s+\S*$/, "").trim()}…`;
}

function toSummary(
  school: SchoolRecord,
  areaSlug: string,
): SeoSchoolSummary | null {
  if (school.closed) return null;
  const urn = String(school.urn ?? "").trim();
  const name = school.name?.trim();
  if (!urn || !name) return null;

  return {
    urn,
    name,
    localAuthority: school.localAuthority?.trim() || SEED_LOCAL_AUTHORITY,
    areaSlug,
    town: school.town?.trim() || null,
    postcode: school.postcode?.trim() || null,
    address: school.address?.trim() || null,
    phase: school.phase?.trim() || null,
    phases: school.phases ?? null,
    sector: school.sector ?? null,
    schoolTypeLabel: school.schoolTypeLabel?.trim() || null,
    ageRange: school.ageRange?.trim() || null,
    ofstedOverall: school.ofstedOverall?.trim() || null,
    ofstedPublicationDate: school.ofstedPublicationDate?.trim() || null,
    ofstedReportUrl: school.ofstedReportUrl?.trim() || null,
    rwmExpected: school.rwmExpected ?? null,
    att8Average: school.att8Average ?? null,
    engMath94Percent: school.engMath94Percent ?? null,
    schoolWebsite: school.schoolWebsite?.trim() || null,
    giasUrl: school.giasUrl?.trim() || null,
    compareUrl: school.compareUrl?.trim() || null,
    inspectionPrecis: truncatePrecis(school.inspectionPrecis),
    inspectionReportFileUrl: school.inspectionReportFileUrl?.trim() || null,
    inspectionReportLabel: school.inspectionReportLabel?.trim() || null,
  };
}

let cachedCoverage: SeoCoverage | null = null;
let cachedSchools: SeoSchoolSummary[] | null = null;
let cachedByUrn: Map<string, SeoSchoolSummary> | null = null;
let cachedTowns: SeoTown[] | null = null;
let cachedTownsByArea: Map<string, SeoTown[]> | null = null;

function defaultCoverage(): SeoCoverage {
  return {
    version: 1,
    generatedAt: null,
    pageBudget: {
      maxSchoolPages: SEO_DEFAULT_MAX_SCHOOL_PAGES,
      maxTownPages: SEO_DEFAULT_MAX_TOWN_PAGES,
    },
    policy: {
      seedAlwaysIncluded: true,
      townMinSchools: SEO_TOWN_MIN_SCHOOLS,
    },
    includedAreaSlugs: [laSlug(SEED_LOCAL_AUTHORITY)],
  };
}

/** Load the SEO coverage manifest (which LAs get school/town landings). */
export function readSeoCoverage(): SeoCoverage {
  if (cachedCoverage) return cachedCoverage;
  const path = publicPath("data/seo-coverage.json");
  if (!existsSync(path)) {
    cachedCoverage = defaultCoverage();
    return cachedCoverage;
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<SeoCoverage>;
    const seedSlug = laSlug(SEED_LOCAL_AUTHORITY);
    const slugs = Array.isArray(raw.includedAreaSlugs)
      ? [...raw.includedAreaSlugs]
      : [seedSlug];
    if (
      (raw.policy?.seedAlwaysIncluded ?? true) &&
      !slugs.includes(seedSlug)
    ) {
      slugs.unshift(seedSlug);
    }
    cachedCoverage = {
      version: typeof raw.version === "number" ? raw.version : 1,
      generatedAt: raw.generatedAt ?? null,
      pageBudget: {
        maxSchoolPages:
          raw.pageBudget?.maxSchoolPages ?? SEO_DEFAULT_MAX_SCHOOL_PAGES,
        maxTownPages:
          raw.pageBudget?.maxTownPages ?? SEO_DEFAULT_MAX_TOWN_PAGES,
      },
      policy: {
        seedAlwaysIncluded: raw.policy?.seedAlwaysIncluded ?? true,
        townMinSchools:
          raw.policy?.townMinSchools ?? SEO_TOWN_MIN_SCHOOLS,
      },
      includedAreaSlugs: [...new Set(slugs.map((s) => String(s).trim()).filter(Boolean))],
      stats: raw.stats,
    };
  } catch {
    cachedCoverage = defaultCoverage();
  }
  return cachedCoverage;
}

export function listSeoCoverageAreaSlugs(): string[] {
  return readSeoCoverage().includedAreaSlugs;
}

export function isSeoAreaIncluded(areaSlug: string): boolean {
  return listSeoCoverageAreaSlugs().includes(areaSlug);
}

export function seoTownMinSchools(): number {
  return readSeoCoverage().policy.townMinSchools;
}

function loadAreaSchools(areaSlug: string): SeoSchoolSummary[] {
  const seedSlug = laSlug(SEED_LOCAL_AUTHORITY);
  if (areaSlug === seedSlug) {
    const index = readPublicJson<SchoolsIndex>("data/schools-index.json");
    return index.schools
      .map((school) => toSummary(school, seedSlug))
      .filter((row): row is SeoSchoolSummary => row != null);
  }

  const rel = packDataPathBySlug(areaSlug, "schools-index.json").replace(
    /^\//,
    "",
  );
  if (!existsSync(publicPath(rel))) return [];
  const index = readPublicJson<SchoolsIndex>(rel);
  return index.schools
    .map((school) => toSummary(school, areaSlug))
    .filter((row): row is SeoSchoolSummary => row != null);
}

/**
 * Schools with SEO landing pages for every included coverage area.
 * Dedupes by URN (seed wins over pack if both somehow appear).
 */
export function listSeoSchools(): SeoSchoolSummary[] {
  if (cachedSchools) return cachedSchools;
  const byUrn = new Map<string, SeoSchoolSummary>();
  for (const areaSlug of listSeoCoverageAreaSlugs()) {
    for (const school of loadAreaSchools(areaSlug)) {
      if (!byUrn.has(school.urn)) byUrn.set(school.urn, school);
    }
  }
  cachedSchools = [...byUrn.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en-GB"),
  );
  return cachedSchools;
}

/** @deprecated Prefer listSeoSchools — kept for older call sites. */
export function listSeoHampshireSchools(): SeoSchoolSummary[] {
  const seed = laSlug(SEED_LOCAL_AUTHORITY);
  return listSeoSchools().filter((s) => s.areaSlug === seed);
}

export function getSeoSchool(urn: string): SeoSchoolSummary | undefined {
  if (!cachedByUrn) {
    cachedByUrn = new Map(listSeoSchools().map((school) => [school.urn, school]));
  }
  return cachedByUrn.get(String(urn));
}

export function schoolPath(urn: string): string {
  return `/schools/${encodeURIComponent(String(urn))}/`;
}

export function slugifyTown(town: string): string {
  return town
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function townsIndexPath(areaSlug = laSlug(SEED_LOCAL_AUTHORITY)): string {
  return `${areaPath(areaSlug)}towns/`;
}

export function townPath(
  townSlug: string,
  areaSlug = laSlug(SEED_LOCAL_AUTHORITY),
): string {
  return `${townsIndexPath(areaSlug)}${encodeURIComponent(townSlug)}/`;
}

function buildTowns(schools: SeoSchoolSummary[], minSchools: number): SeoTown[] {
  const byKey = new Map<string, SeoSchoolSummary[]>();
  for (const school of schools) {
    const town = school.town?.trim();
    if (!town) continue;
    const key = `${school.areaSlug}::${town}`;
    const list = byKey.get(key) ?? [];
    list.push(school);
    byKey.set(key, list);
  }

  const towns = [...byKey.entries()]
    .map(([, list]): SeoTown => {
      const first = list[0];
      return {
        slug: slugifyTown(first.town!),
        name: first.town!,
        localAuthority: first.localAuthority,
        areaSlug: first.areaSlug,
        schoolCount: list.length,
        withOfsted: list.filter((s) => s.ofstedOverall).length,
        withRwm: list.filter((s) => s.rwmExpected != null).length,
        withKs4: list.filter((s) => s.att8Average != null).length,
      };
    })
    .filter((town) => town.schoolCount >= minSchools && town.slug)
    .sort(
      (a, b) =>
        b.schoolCount - a.schoolCount ||
        a.name.localeCompare(b.name, "en-GB"),
    );

  // Guard against slug collisions within the same area.
  const seen = new Set<string>();
  return towns.filter((town) => {
    const key = `${town.areaSlug}::${town.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Town landings for included areas (optional filter by area slug). */
export function listSeoTowns(areaSlug?: string): SeoTown[] {
  if (!cachedTowns) {
    const min = seoTownMinSchools();
    cachedTowns = buildTowns(listSeoSchools(), min);
    cachedTownsByArea = new Map();
    for (const town of cachedTowns) {
      const list = cachedTownsByArea.get(town.areaSlug) ?? [];
      list.push(town);
      cachedTownsByArea.set(town.areaSlug, list);
    }
  }
  if (!areaSlug) return cachedTowns;
  return cachedTownsByArea?.get(areaSlug) ?? [];
}

/** @deprecated Prefer listSeoTowns(areaSlug) */
export function listSeoHampshireTowns(): SeoTown[] {
  return listSeoTowns(laSlug(SEED_LOCAL_AUTHORITY));
}

export function getSeoTown(
  townSlug: string,
  areaSlug = laSlug(SEED_LOCAL_AUTHORITY),
): SeoTown | undefined {
  return listSeoTowns(areaSlug).find((town) => town.slug === townSlug);
}

export function listSeoSchoolsInTown(town: SeoTown): SeoSchoolSummary[] {
  return listSeoSchools().filter(
    (school) =>
      school.areaSlug === town.areaSlug &&
      school.town?.trim() === town.name,
  );
}

/** Areas that have at least one town landing under current coverage. */
export function listSeoAreasWithTowns(): string[] {
  return [...new Set(listSeoTowns().map((t) => t.areaSlug))];
}

/**
 * Ready pack slugs that could be added to SEO coverage (excludes seed).
 * Used by docs / tooling; the Python loop owns selection.
 */
export function listSeoCandidatePackSlugs(): string[] {
  const included = new Set(listSeoCoverageAreaSlugs());
  const seed = laSlug(SEED_LOCAL_AUTHORITY);
  const manifest = readPublicJson<LaPackManifest>("data/packs/manifest.json");
  return listReadyPacks(manifest)
    .map((p) => p.slug)
    .filter((slug) => slug !== seed && !included.has(slug));
}

export function stagesQueryForSchool(school: SeoSchoolSummary): string | null {
  const phases = school.phases ?? [];
  if (phases.includes("ks2")) return "ks2";
  if (phases.includes("ks4") || phases.includes("ks3")) {
    return phases.includes("ks3") && phases.includes("ks4")
      ? "ks3,ks4"
      : phases.includes("ks4")
        ? "ks4"
        : "ks3";
  }
  if (phases.includes("ks1")) return "ks1";
  if (phases.includes("early-years")) return "early-years";
  return null;
}

/** Deep-link into the compare tool with this school shortlisted. */
export function schoolCompareHref(school: SeoSchoolSummary): string {
  const params = new URLSearchParams();
  params.set("schools", school.urn);
  const stages = stagesQueryForSchool(school);
  if (stages) params.set("stages", stages);
  return `/?${params.toString()}#side-by-side`;
}

export function formatOutcomePercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const n = value <= 1 ? value * 100 : value;
  return `${Math.round(n)}%`;
}

export function formatAtt8(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-GB", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

export function schoolPageTitle(school: SeoSchoolSummary): string {
  const place = school.town || school.localAuthority;
  return `${school.name}, ${place}`;
}

export function schoolPageDescription(school: SeoSchoolSummary): string {
  const bits: string[] = [
    `Compare ${school.name} with nearby ${school.localAuthority} schools`,
  ];
  if (school.ofstedOverall) bits.push(`Ofsted: ${school.ofstedOverall}`);
  if (school.rwmExpected != null) {
    bits.push(`KS2 RWM ${formatOutcomePercent(school.rwmExpected)}`);
  } else if (school.att8Average != null) {
    bits.push(`Attainment 8 ${formatAtt8(school.att8Average)}`);
  }
  bits.push("published figures and inspection excerpts — not a league table");
  return `${bits.join(". ")}.`;
}

export function townPageTitle(town: SeoTown): string {
  return `Schools in ${town.name}, ${town.localAuthority}`;
}

export function townPageDescription(town: SeoTown): string {
  return `Browse ${formatCount(town.schoolCount)} schools in ${town.name} (${town.localAuthority}): Ofsted grades and published outcomes, then shortlist in School Compass — parental compare, not a league table.`;
}

export function schoolJsonLd(school: SeoSchoolSummary): Record<string, unknown> {
  const url = `${BRAND_HOME_URL}${schoolPath(school.urn)}`;
  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressCountry: "GB",
    addressRegion: school.localAuthority,
  };
  if (school.address) address.streetAddress = school.address;
  if (school.town) address.addressLocality = school.town;
  if (school.postcode) address.postalCode = school.postcode;

  const townSlug = school.town ? slugifyTown(school.town) : null;
  const townLanding =
    townSlug && getSeoTown(townSlug, school.areaSlug)
      ? townPath(townSlug, school.areaSlug)
      : null;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "School",
      "@id": `${url}#school`,
      name: school.name,
      url,
      address,
      ...(school.schoolWebsite
        ? { sameAs: [normalizeHttp(school.schoolWebsite)] }
        : {}),
    },
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: schoolPageTitle(school),
      description: schoolPageDescription(school),
      about: { "@id": `${url}#school` },
      isPartOf: { "@id": `${BRAND_HOME_URL}/#website` },
      inLanguage: "en-GB",
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${BRAND_HOME_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Areas",
          item: `${BRAND_HOME_URL}/areas/`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: school.localAuthority,
          item: `${BRAND_HOME_URL}${areaPath(school.areaSlug)}`,
        },
        ...(townLanding
          ? [
              {
                "@type": "ListItem",
                position: 4,
                name: school.town,
                item: `${BRAND_HOME_URL}${townLanding}`,
              },
              {
                "@type": "ListItem",
                position: 5,
                name: school.name,
                item: url,
              },
            ]
          : [
              {
                "@type": "ListItem",
                position: 4,
                name: school.name,
                item: url,
              },
            ]),
      ],
    },
  ];

  return { "@context": "https://schema.org", "@graph": graph };
}

export function townJsonLd(
  town: SeoTown,
  schools: SeoSchoolSummary[],
): Record<string, unknown> {
  const url = `${BRAND_HOME_URL}${townPath(town.slug, town.areaSlug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: townPageTitle(town),
        description: townPageDescription(town),
        isPartOf: { "@id": `${BRAND_HOME_URL}/#website` },
        inLanguage: "en-GB",
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: schools.length,
          itemListElement: schools.map((school, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: school.name,
            url: `${BRAND_HOME_URL}${schoolPath(school.urn)}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${BRAND_HOME_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Areas",
            item: `${BRAND_HOME_URL}/areas/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: town.localAuthority,
            item: `${BRAND_HOME_URL}${areaPath(town.areaSlug)}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "Towns",
            item: `${BRAND_HOME_URL}${townsIndexPath(town.areaSlug)}`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: town.name,
            item: url,
          },
        ],
      },
    ],
  };
}

function normalizeHttp(url: string): string {
  const t = url.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}
