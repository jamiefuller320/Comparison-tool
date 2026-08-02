/** Shared SEO copy and structured-data helpers for School Compass. */

import {
  BRAND_DOMAIN,
  BRAND_HOME_URL,
  BRAND_NAME,
  BRAND_TAGLINE,
} from "@/lib/brand";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";

export const SEO_TITLE =
  `${BRAND_NAME} — compare nearby schools before you visit`;

export const SEO_TITLE_TEMPLATE = `%s · ${BRAND_NAME}`;

/** ~155 chars — search-result friendly. */
export const SEO_DESCRIPTION =
  `Shortlist nearby schools and early years across ${COVERAGE_REGION_LABEL}, compare DfE outcomes and Ofsted/ISI excerpts, then print a visit pack. Parental compare — not a league table.`;

export const SEO_KEYWORDS = [
  "school comparison",
  "compare schools UK",
  "school shortlist",
  "Ofsted reports",
  "ISI reports",
  "Key Stage 2",
  "Key Stage 4",
  "early years",
  "childminders",
  "Hampshire schools",
  "South East schools",
  "school open day",
  "parental school choice",
  BRAND_NAME,
  BRAND_DOMAIN,
] as const;

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${BRAND_HOME_URL}/#website`,
        url: `${BRAND_HOME_URL}/`,
        name: BRAND_NAME,
        description: SEO_DESCRIPTION,
        inLanguage: "en-GB",
        publisher: { "@id": `${BRAND_HOME_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${BRAND_HOME_URL}/#organization`,
        name: BRAND_NAME,
        url: `${BRAND_HOME_URL}/`,
        description: BRAND_TAGLINE,
      },
      {
        "@type": "WebApplication",
        "@id": `${BRAND_HOME_URL}/#app`,
        name: BRAND_NAME,
        url: `${BRAND_HOME_URL}/`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        description: SEO_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP",
        },
        areaServed: {
          "@type": "AdministrativeArea",
          name: COVERAGE_REGION_LABEL,
        },
        inLanguage: "en-GB",
      },
    ],
  };
}
