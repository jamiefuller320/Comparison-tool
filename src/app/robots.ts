import type { MetadataRoute } from "next";
import { BRAND_DOMAIN, BRAND_HOME_URL } from "@/lib/brand";

export const dynamic = "force-static";

const SHARED_RULES = {
  allow: "/",
  disallow: ["/lab/"],
};

/** AI / answer-engine crawlers — same indexable surface as general crawlers. */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "Applebot-Extended",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", ...SHARED_RULES },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, ...SHARED_RULES })),
    ],
    sitemap: `${BRAND_HOME_URL}/sitemap.xml`,
    // Host is hostname-only (no scheme). Google ignores this directive;
    // keep it valid for crawlers that still read it.
    host: BRAND_DOMAIN,
  };
}
