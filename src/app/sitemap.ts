import type { MetadataRoute } from "next";
import { BRAND_HOME_URL } from "@/lib/brand";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${BRAND_HOME_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
