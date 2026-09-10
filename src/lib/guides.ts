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
    faqs: [
      {
        question: "Is School Compass a league table?",
        answer:
          "No. It helps you shortlist and compare nearby settings using the same published figures and inspection excerpts — patterns to visit on, not a ranked verdict.",
      },
      {
        question: "Why are some figures blank?",
        answer:
          "Gaps are honest: special/AP settings, new schools, ISI-inspected independents without Ofsted grades, or measures the DfE does not publish at school level. Treat blanks as prompts to ask on a visit.",
      },
      {
        question: "How should I use inspection excerpts?",
        answer:
          "Excerpts are verbatim from the latest usable Ofsted or ISI report PDF. They show what inspectors wrote — not our summary. Read the full report for context before deciding.",
      },
    ],
  },
  {
    slug: "early-years",
    title: "How to compare early years Ofsted and EYFSP",
    description:
      "Ofsted grades and EYFSP area context answer different questions. Learn what to shortlist on before you visit a nursery.",
    guidancePath: "early-years",
    faqs: [
      {
        question: "What does an early years Ofsted grade tell me?",
        answer:
          "It reflects what inspectors saw on their visit — care, learning, and leadership at that point. It does not guarantee your child will thrive, but it is a useful shortlist filter alongside location and visits.",
      },
      {
        question: "What is EYFSP and can I compare nurseries on it?",
        answer:
          "EYFSP measures how children reach early learning goals at the end of Reception. School-level EYFSP is not published for every provider; School Compass shows LA context where available, not a nursery league table.",
      },
    ],
  },
  {
    slug: "childminders",
    title: "How to use the childminder directory",
    description:
      "Consented Ofsted listings, grades where published, and a vetting checklist for wrap-around care — not a ranked list.",
    guidancePath: "childminders",
    faqs: [
      {
        question: "Why are only some childminders listed?",
        answer:
          "Only childminders who have consented to appear in the Ofsted public register data we harvest are shown. Absence from the directory does not mean a childminder is unsuitable.",
      },
      {
        question: "How do I choose between nearby childminders?",
        answer:
          "Use distance and published Ofsted grades as a first filter, then meet the childminder, ask about routines and ratios, and check references — the directory is a starting point, not a ranking.",
      },
    ],
  },
  {
    slug: "ks1-phonics",
    title: "How to read KS1 phonics context",
    description:
      "School-level phonics scores are not published. Use LA benchmarks, location, and inspection excerpts when choosing infant schools.",
    guidancePath: "ks1",
    faqs: [
      {
        question: "Why can't I see phonics scores for each school?",
        answer:
          "The DfE publishes phonics at local-authority level, not for individual schools. School Compass shows LA benchmarks and inspection excerpts instead of inventing school-level numbers.",
      },
      {
        question: "How do I compare infant schools without phonics tables?",
        answer:
          "Shortlist on location, Ofsted/ISI excerpts, and what you learn on visits. Ask how reading is taught and how progress is checked — tables alone will not answer that.",
      },
    ],
  },
  {
    slug: "primary-ks2",
    title: "How to read Key Stage 2 figures",
    description:
      "End-of-primary tables help you spot patterns across a shortlist. Combine them with inspection excerpts and a visit.",
    guidancePath: "ks2",
    faqs: [
      {
        question: "What is KS2 RWM expected standard?",
        answer:
          "The percentage of pupils meeting the expected standard in reading, writing and maths at the end of Year 6. It helps compare schools on the same published measure — not whether your child will succeed there.",
      },
      {
        question: "Should I pick the school with the highest KS2 score?",
        answer:
          "No — a high score can reflect intake as well as teaching. Shortlist a few plausible schools, read inspection excerpts, visit, and weigh fit for your child rather than ranking on one number.",
      },
    ],
  },
  {
    slug: "secondary-ks4",
    title: "How to read Key Stage 4 and 16–18 figures",
    description:
      "GCSE and 16–18 tables help compare secondaries. Understand gaps, special/AP cases, and what to ask on open days.",
    guidancePath: "ks4",
    faqs: [
      {
        question: "What is Attainment 8?",
        answer:
          "A DfE summary of GCSE attainment across eight qualifications. It helps compare secondaries on a common scale — alongside Progress 8 and inspection excerpts, not instead of visiting.",
      },
      {
        question: "Why is Attainment 8 missing for some secondaries?",
        answer:
          "Special schools, alternative provision, new schools, or settings without a published Year 11 cohort may not have comparable figures. School Compass flags these honestly rather than filling gaps.",
      },
    ],
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
        answer: `Hampshire is the deepest maintained root. Ready packs for South East England, London, and Dorset merge silently into map and search. Areas outside the region can be requested from the missing-school flow.`,
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
