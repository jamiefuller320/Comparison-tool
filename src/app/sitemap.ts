import type { MetadataRoute } from "next";
import { areaPath, areasIndexPath, listCoverageAreas } from "@/lib/areas";
import { BRAND_HOME_URL } from "@/lib/brand";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const areas = listCoverageAreas();

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
    ...areas.map((area) => ({
      url: `${BRAND_HOME_URL}${areaPath(area.slug)}`,
      lastModified: area.lastModified ? new Date(area.lastModified) : lastModified,
      changeFrequency: "weekly" as const,
      priority: area.isSeed ? 0.85 : 0.8,
    })),
  ];
}
