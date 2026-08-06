import type { MetadataRoute } from "next";
import { BRAND_HOME_URL } from "@/lib/brand";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/lab/"],
    },
    sitemap: `${BRAND_HOME_URL}/sitemap.xml`,
    host: BRAND_HOME_URL,
  };
}
