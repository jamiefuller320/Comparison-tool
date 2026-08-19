/**
 * Build-time school + Hampshire town landings for SEO.
 * Thin summaries only — do not embed full qualitative capture into HTML.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { areaPath, formatCount } from "@/lib/areas";
import { BRAND_HOME_URL } from "@/lib/brand";
import { SEED_LOCAL_AUTHORITY, laSlug } from "@/lib/laPacks";
import type { SchoolRecord, SchoolsIndex } from "@/lib/types";

/** Minimum schools in a postal town before we publish a town landing. */
export const SEO_TOWN_MIN_SCHOOLS = 8;

export type SeoSchoolSummary = {
  urn: string;
  name: string;
  localAuthority: string;
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

function truncatePrecis(text: string | null | undefined, max = 420): string | null {
  const t = text?.trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
  if (lastStop > max * 0.55) return cut.slice(0, lastStop + 1).trim();
  return `${cut.replace(/\s+\S*$/, "").trim()}…`;
}

function toSummary(school: SchoolRecord): SeoSchoolSummary | null {
  if (school.closed) return null;
  const urn = String(school.urn ?? "").trim();
  const name = school.name?.trim();
  if (!urn || !name) return null;

  return {
    urn,
    name,
    localAuthority: school.localAuthority?.trim() || SEED_LOCAL_AUTHORITY,
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

let cachedHampshire: SeoSchoolSummary[] | null = null;
let cachedByUrn: Map<string, SeoSchoolSummary> | null = null;
let cachedTowns: SeoTown[] | null = null;

/** Hampshire maintained-root schools for SEO landings. */
export function listSeoHampshireSchools(): SeoSchoolSummary[] {
  if (cachedHampshire) return cachedHampshire;
  const index = readPublicJson<SchoolsIndex>("data/schools-index.json");
  cachedHampshire = index.schools
    .map(toSummary)
    .filter((row): row is SeoSchoolSummary => row != null)
    .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  return cachedHampshire;
}

export function getSeoSchool(urn: string): SeoSchoolSummary | undefined {
  if (!cachedByUrn) {
    cachedByUrn = new Map(
      listSeoHampshireSchools().map((school) => [school.urn, school]),
    );
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

/** Hampshire postal towns with enough schools for a useful landing. */
export function listSeoHampshireTowns(): SeoTown[] {
  if (cachedTowns) return cachedTowns;
  const areaSlug = laSlug(SEED_LOCAL_AUTHORITY);
  const byTown = new Map<string, SeoSchoolSummary[]>();

  for (const school of listSeoHampshireSchools()) {
    const town = school.town?.trim();
    if (!town) continue;
    const list = byTown.get(town) ?? [];
    list.push(school);
    byTown.set(town, list);
  }

  cachedTowns = [...byTown.entries()]
    .map(([name, schools]): SeoTown => ({
      slug: slugifyTown(name),
      name,
      localAuthority: SEED_LOCAL_AUTHORITY,
      areaSlug,
      schoolCount: schools.length,
      withOfsted: schools.filter((s) => s.ofstedOverall).length,
      withRwm: schools.filter((s) => s.rwmExpected != null).length,
      withKs4: schools.filter((s) => s.att8Average != null).length,
    }))
    .filter((town) => town.schoolCount >= SEO_TOWN_MIN_SCHOOLS && town.slug)
    .sort(
      (a, b) =>
        b.schoolCount - a.schoolCount ||
        a.name.localeCompare(b.name, "en-GB"),
    );

  // Guard against slug collisions (rare with postal towns).
  const seen = new Set<string>();
  cachedTowns = cachedTowns.filter((town) => {
    if (seen.has(town.slug)) return false;
    seen.add(town.slug);
    return true;
  });

  return cachedTowns;
}

export function getSeoTown(townSlug: string): SeoTown | undefined {
  return listSeoHampshireTowns().find((town) => town.slug === townSlug);
}

export function listSeoSchoolsInTown(town: SeoTown): SeoSchoolSummary[] {
  return listSeoHampshireSchools().filter(
    (school) =>
      school.town?.trim() === town.name &&
      school.localAuthority === town.localAuthority,
  );
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
          item: `${BRAND_HOME_URL}${areaPath(laSlug(school.localAuthority))}`,
        },
        ...(school.town
          ? [
              {
                "@type": "ListItem",
                position: 4,
                name: school.town,
                item: `${BRAND_HOME_URL}${townPath(slugifyTown(school.town))}`,
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
