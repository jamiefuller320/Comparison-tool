/**
 * Parent-facing guide pages built from decision-guidance copy + FAQs.
 */

import {
  DECISION_GUIDANCE,
  type GuidancePathId,
} from "@/lib/decisionGuidance";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";

export type GuideSlug =
  | "how-to-read"
  | "early-years"
  | "childminders"
  | "ks1-phonics"
  | "primary-ks2"
  | "secondary-ks4"
  | "faq";

export type GuideFaq = {
  question: string;
  answer: string;
};

export type GuidePage = {
  slug: GuideSlug;
  title: string;
  description: string;
  guidancePath?: GuidancePathId;
  faqs?: GuideFaq[];
};

export const GUIDE_PAGES: GuidePage[] = [
  {
    slug: "how-to-read",
    title: "How to read school compare figures as a parent",
    description: `Use published DfE tables and Ofsted/ISI excerpts to shortlist schools across ${COVERAGE_REGION_LABEL} — without treating them as a league table.`,
    guidancePath: "general",
  },
  {
    slug: "early-years",
    title: "How to compare early years Ofsted and EYFSP",
    description:
      "Ofsted grades and EYFSP area context answer different questions. Learn what to shortlist on before you visit a nursery.",
    guidancePath: "early-years",
  },
  {
    slug: "childminders",
    title: "How to use the childminder directory",
    description:
      "Consented Ofsted listings, grades where published, and a vetting checklist for wrap-around care — not a ranked list.",
    guidancePath: "childminders",
  },
  {
    slug: "ks1-phonics",
    title: "How to read KS1 phonics context",
    description:
      "School-level phonics scores are not published. Use LA benchmarks, location, and inspection excerpts when choosing infant schools.",
    guidancePath: "ks1",
  },
  {
    slug: "primary-ks2",
    title: "How to read Key Stage 2 figures",
    description:
      "End-of-primary tables help you spot patterns across a shortlist. Combine them with inspection excerpts and a visit.",
    guidancePath: "ks2",
  },
  {
    slug: "secondary-ks4",
    title: "How to read Key Stage 4 and 16–18 figures",
    description:
      "GCSE and 16–18 tables help compare secondaries. Understand gaps, special/AP cases, and what to ask on open days.",
    guidancePath: "ks4",
  },
  {
    slug: "faq",
    title: "School Compass FAQ",
    description: `Common questions about School Compass — coverage across ${COVERAGE_REGION_LABEL}, data sources, and how parental compare differs from league tables.`,
    faqs: [
      {
        question: "Is School Compass a league table?",
        answer:
          "No. It is a parental shortlist and compare tool. Published figures and inspection excerpts help you prepare visits — they are not a ranked “best school” verdict.",
      },
      {
        question: "Which areas are covered?",
        answer: `Hampshire is the deepest maintained root. Ready packs for South East England (including Dorset) merge silently into map and search. Areas outside the region can be requested from the missing-school flow.`,
      },
      {
        question: "Where do the numbers come from?",
        answer:
          "DfE Explore Education Statistics (KS2 and KS4), Ofsted independent-school and childcare management information, ISI citations where relevant, school coordinates via postcodes.io, and road distances from OSRM.",
      },
      {
        question: "Why are some cells blank or flagged?",
        answer:
          "Gaps are honest: special/AP settings, new establishments, ISI-inspected independents without Ofsted grades, middle schools without Year 11, or measures the DfE does not publish at school level (for example phonics or provider-level EYFSP).",
      },
      {
        question: "How should I use a visit pack?",
        answer:
          "Print after you shortlist a few settings. Use the prompts on open days or calls, note what you saw, and decide with fit for your child — not the tables alone.",
      },
      {
        question: "Is School Compass free?",
        answer:
          "Yes. The web compare tool is free to use in the browser. Optional account save is for shortlist convenience only.",
      },
    ],
  },
];

export function guidesIndexPath(): string {
  return "/guides/";
}

export function guidePath(slug: string): string {
  return `/guides/${slug}/`;
}

export function getGuide(slug: string): GuidePage | undefined {
  return GUIDE_PAGES.find((guide) => guide.slug === slug);
}

export function guideBody(guide: GuidePage) {
  if (guide.guidancePath) {
    return DECISION_GUIDANCE[guide.guidancePath];
  }
  return null;
}
