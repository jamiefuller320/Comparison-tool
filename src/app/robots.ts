import type { MetadataRoute } from "next";
import { BRAND_DOMAIN, BRAND_HOME_URL } from "@/lib/brand";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/lab/"],
    },
    sitemap: `${BRAND_HOME_URL}/sitemap.xml`,
    // Host is hostname-only (no scheme). Google ignores this directive;
    // keep it valid for crawlers that still read it.
    host: BRAND_DOMAIN,
  };
}
