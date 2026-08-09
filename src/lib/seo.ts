/** Shared SEO copy and structured-data helpers for School Compass. */

import {
  areaPageDescription,
  areaPageTitle,
  areaPath,
  areasIndexPath,
  type CoverageArea,
} from "@/lib/areas";
import {
  areaStageDescription,
  areaStagePath,
  type AreaStageLanding,
} from "@/lib/areaStages";
import {
  BRAND_DOMAIN,
  BRAND_HOME_URL,
  BRAND_NAME,
  BRAND_TAGLINE,
} from "@/lib/brand";
import {
  guidePath,
  guidesIndexPath,
  type GuideFaq,
  type GuidePage,
} from "@/lib/guides";
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
        // Homepage chrome is server-rendered; do not tell crawlers the site
        // "Requires JavaScript" (that can discourage indexing of SSR content).
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

export function areasHubJsonLd(areas: CoverageArea[]): Record<string, unknown> {
  const url = `${BRAND_HOME_URL}${areasIndexPath()}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: `School areas across ${COVERAGE_REGION_LABEL}`,
        description: `Browse local-authority school compare pages across ${COVERAGE_REGION_LABEL}.`,
        isPartOf: { "@id": `${BRAND_HOME_URL}/#website` },
        inLanguage: "en-GB",
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: areas.length,
          itemListElement: areas.map((area, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: area.localAuthority,
            url: `${BRAND_HOME_URL}${areaPath(area.slug)}`,
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
            item: url,
          },
        ],
      },
    ],
  };
}

export function areaLandingJsonLd(area: CoverageArea): Record<string, unknown> {
  const url = `${BRAND_HOME_URL}${areaPath(area.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name: areaPageTitle(area),
        description: areaPageDescription(area),
        isPartOf: { "@id": `${BRAND_HOME_URL}/#website` },
        about: {
          "@type": "AdministrativeArea",
          name: area.localAuthority,
        },
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
            item: `${BRAND_HOME_URL}${areasIndexPath()}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: area.localAuthority,
            item: url,
          },
        ],
      },
    ],
  };
}

export function areaStageLandingJsonLd(
  area: CoverageArea,
  stage: AreaStageLanding,
): Record<string, unknown> {
  const url = `${BRAND_HOME_URL}${areaStagePath(area.slug, stage.slug)}`;
  const name = stage.headline(area.localAuthority);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name,
        description: areaStageDescription(area, stage),
        isPartOf: { "@id": `${BRAND_HOME_URL}/#website` },
        about: {
          "@type": "AdministrativeArea",
          name: area.localAuthority,
        },
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
            item: `${BRAND_HOME_URL}${areasIndexPath()}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: area.localAuthority,
            item: `${BRAND_HOME_URL}${areaPath(area.slug)}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: stage.label,
            item: url,
          },
        ],
      },
    ],
  };
}

export function guidesHubJsonLd(guides: GuidePage[]): Record<string, unknown> {
  const url = `${BRAND_HOME_URL}${guidesIndexPath()}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: "Guides for parents comparing schools",
        description: `How to read published figures and inspection excerpts on ${BRAND_NAME}.`,
        isPartOf: { "@id": `${BRAND_HOME_URL}/#website` },
        inLanguage: "en-GB",
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: guides.length,
          itemListElement: guides.map((guide, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: guide.title,
            url: `${BRAND_HOME_URL}${guidePath(guide.slug)}`,
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
            name: "Guides",
            item: url,
          },
        ],
      },
    ],
  };
}

export function guidePageJsonLd(guide: GuidePage): Record<string, unknown> {
  const url = `${BRAND_HOME_URL}${guidePath(guide.slug)}`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Article",
      "@id": `${url}#page`,
      url,
      headline: guide.title,
      description: guide.description,
      isPartOf: { "@id": `${BRAND_HOME_URL}/#website` },
      inLanguage: "en-GB",
      author: { "@id": `${BRAND_HOME_URL}/#organization` },
      publisher: { "@id": `${BRAND_HOME_URL}/#organization` },
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
          name: "Guides",
          item: `${BRAND_HOME_URL}${guidesIndexPath()}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: guide.title,
          item: url,
        },
      ],
    },
  ];
  if (guide.faqs?.length) {
    graph.push(faqPageJsonLd(guide.faqs, url));
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function faqPageJsonLd(
  faqs: GuideFaq[],
  pageUrl: string,
): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
