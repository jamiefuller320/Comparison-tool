/**
 * Topics for the Understand journey chapter — merges general “how to read”
 * copy with every parent guide (and a data-sources card).
 */

import { BRAND_NAME } from "@/lib/brand";
import {
  DECISION_GUIDANCE,
  type DecisionGuidanceContent,
  type DecisionGuidanceSection,
} from "@/lib/decisionGuidance";
import { GUIDE_PAGES, type GuideFaq, type GuideSlug } from "@/lib/guides";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";

export type UnderstandTopicId = GuideSlug | "data";

export type UnderstandTopicLink = {
  label: string;
  href: string;
};

export type UnderstandTopic = {
  id: UnderstandTopicId;
  label: string;
  shortLabel: string;
  title: string;
  lead: string;
  /** Guidance sections when the topic maps to decision-guidance copy. */
  sections?: DecisionGuidanceSection[];
  faqs?: GuideFaq[];
  /** Free-form paragraphs for topics without guidance sections (e.g. data). */
  paragraphs?: string[];
  /** Optional outbound links shown under the card body. */
  links?: UnderstandTopicLink[];
};

function fromGuidance(
  id: UnderstandTopicId,
  label: string,
  shortLabel: string,
  content: DecisionGuidanceContent,
  description?: string,
): UnderstandTopic {
  return {
    id,
    label,
    shortLabel,
    title: content.heading,
    lead: description || content.lead,
    sections: content.sections,
  };
}

/** Same “Where the numbers come from” copy that used to live on the home page. */
export const DATA_TOPIC: UnderstandTopic = {
  id: "data",
  label: "Data sources",
  shortLabel: "Data",
  title: "Where the numbers come from",
  lead: `${BRAND_NAME} harvests published figures from the DfE Explore Education Statistics API (KS2 and KS4), Ofsted independent-school management information, school coordinates from postcodes.io, and road distances from OSRM — so parents can compare like with like before they visit.`,
  paragraphs: [
    "Early years: Ofsted childcare day-care inspections; Ofsted grades for state nursery / infant / primary settings with an early-years intake; consented childminder names/addresses (Ofsted quarterly file); plus EYFSP England and local-authority area context (provider-level EYFSP is not published — Ofsted grades and EYFSP area figures answer different questions). State schools: institution-level Key Stage 2 attainment plus local-authority phonics for KS1. Independents: Key Stage 4 tables plus Ofsted non-association inspections. Progress measures are sparse for 2024/25 because of missing KS1 baselines.",
    `Coverage today centres on ${COVERAGE_REGION_LABEL}. Official school pages stay on the DfE compare-school-performance site and Ofsted reports — open those for the full record.`,
  ],
  links: [
    {
      label: "compare-school-performance.service.gov.uk",
      href: "https://www.compare-school-performance.service.gov.uk/",
    },
    {
      label: "reports.ofsted.gov.uk",
      href: "https://reports.ofsted.gov.uk/",
    },
  ],
};

/** Ordered topics shown as one-at-a-time cards in Understand. */
export const UNDERSTAND_TOPICS: UnderstandTopic[] = GUIDE_PAGES.map((guide) => {
  if (guide.faqs?.length) {
    return {
      id: guide.slug,
      label: "FAQ",
      shortLabel: "FAQ",
      title: guide.title,
      lead: guide.description,
      faqs: guide.faqs,
    };
  }
  const body = guide.guidancePath
    ? DECISION_GUIDANCE[guide.guidancePath]
    : null;
  if (!body) {
    return {
      id: guide.slug,
      label: guide.title,
      shortLabel: guide.title,
      title: guide.title,
      lead: guide.description,
    };
  }
  const short =
    guide.slug === "how-to-read"
      ? "Basics"
      : guide.slug === "early-years"
        ? "Early years"
        : guide.slug === "childminders"
          ? "Childminders"
          : guide.slug === "ks1-phonics"
            ? "KS1"
            : guide.slug === "primary-ks2"
              ? "KS2"
              : guide.slug === "secondary-ks4"
                ? "KS4"
                : guide.title;
  const label =
    guide.slug === "how-to-read"
      ? "Getting started"
      : short;
  return fromGuidance(guide.slug, label, short, body, guide.description);
}).concat(DATA_TOPIC);

export function getUnderstandTopic(
  id: UnderstandTopicId,
): UnderstandTopic | undefined {
  return UNDERSTAND_TOPICS.find((topic) => topic.id === id);
}
