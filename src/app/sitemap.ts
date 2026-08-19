import type { MetadataRoute } from "next";
import { areaPath, areasIndexPath, listCoverageAreas } from "@/lib/areas";
import { AREA_STAGE_LANDINGS, areaStagePath } from "@/lib/areaStages";
import { BRAND_HOME_URL } from "@/lib/brand";
import { GUIDE_PAGES, guidePath, guidesIndexPath } from "@/lib/guides";
import {
  listSeoHampshireSchools,
  listSeoHampshireTowns,
  schoolPath,
  townPath,
  townsIndexPath,
} from "@/lib/seoSchools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const areas = listCoverageAreas();
  const hampshire = areas.find((area) => area.isSeed);
  const towns = listSeoHampshireTowns();
  const schools = listSeoHampshireSchools();

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
    ...(hampshire
      ? [
          {
            url: `${BRAND_HOME_URL}${townsIndexPath(hampshire.slug)}`,
            lastModified: hampshire.lastModified
              ? new Date(hampshire.lastModified)
              : lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.82,
          },
          ...towns.map((town) => ({
            url: `${BRAND_HOME_URL}${townPath(town.slug, town.areaSlug)}`,
            lastModified: hampshire.lastModified
              ? new Date(hampshire.lastModified)
              : lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.78,
          })),
          ...schools.map((school) => ({
            url: `${BRAND_HOME_URL}${schoolPath(school.urn)}`,
            lastModified: hampshire.lastModified
              ? new Date(hampshire.lastModified)
              : lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.65,
          })),
        ]
      : []),
  ];
}
