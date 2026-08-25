import type { MetadataRoute } from "next";
import { areaPath, areasIndexPath, listCoverageAreas } from "@/lib/areas";
import { AREA_STAGE_LANDINGS, areaStagePath } from "@/lib/areaStages";
import { BRAND_HOME_URL } from "@/lib/brand";
import { GUIDE_PAGES, guidePath, guidesIndexPath } from "@/lib/guides";
import {
  listSeoAreasWithTowns,
  listSeoSchools,
  listSeoTowns,
  schoolPath,
  townPath,
  townsIndexPath,
} from "@/lib/seoSchools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const areas = listCoverageAreas();
  const areaBySlug = new Map(areas.map((area) => [area.slug, area]));
  const towns = listSeoTowns();
  const schools = listSeoSchools();
  const townHubSlugs = listSeoAreasWithTowns();

  return [
    {
      url: `${BRAND_HOME_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BRAND_HOME_URL}${areasIndexPath()}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BRAND_HOME_URL}${guidesIndexPath()}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    ...GUIDE_PAGES.map((guide) => ({
      url: `${BRAND_HOME_URL}${guidePath(guide.slug)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: guide.slug === "faq" ? 0.8 : 0.75,
    })),
    ...areas.flatMap((area) => {
      const areaLast = area.lastModified
        ? new Date(area.lastModified)
        : lastModified;
      return [
        {
          url: `${BRAND_HOME_URL}${areaPath(area.slug)}`,
          lastModified: areaLast,
          changeFrequency: "weekly" as const,
          priority: area.isSeed ? 0.85 : 0.8,
        },
        ...AREA_STAGE_LANDINGS.map((stage) => ({
          url: `${BRAND_HOME_URL}${areaStagePath(area.slug, stage.slug)}`,
          lastModified: areaLast,
          changeFrequency: "weekly" as const,
          priority: area.isSeed ? 0.75 : 0.7,
        })),
      ];
    }),
    ...townHubSlugs.map((slug) => {
      const area = areaBySlug.get(slug);
      return {
        url: `${BRAND_HOME_URL}${townsIndexPath(slug)}`,
        lastModified: area?.lastModified
          ? new Date(area.lastModified)
          : lastModified,
        changeFrequency: "weekly" as const,
        priority: area?.isSeed ? 0.82 : 0.8,
      };
    }),
    ...towns.map((town) => {
      const area = areaBySlug.get(town.areaSlug);
      return {
        url: `${BRAND_HOME_URL}${townPath(town.slug, town.areaSlug)}`,
        lastModified: area?.lastModified
          ? new Date(area.lastModified)
          : lastModified,
        changeFrequency: "weekly" as const,
        priority: area?.isSeed ? 0.78 : 0.74,
      };
    }),
    ...schools.map((school) => {
      const area = areaBySlug.get(school.areaSlug);
      return {
        url: `${BRAND_HOME_URL}${schoolPath(school.urn)}`,
        lastModified: area?.lastModified
          ? new Date(area.lastModified)
          : lastModified,
        changeFrequency: "weekly" as const,
        priority: area?.isSeed ? 0.65 : 0.6,
      };
    }),
  ];
}
