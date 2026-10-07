/**
 * Answer-engine Q&A blocks for school / town / area SEO landings and guides.
 */

import type { CoverageArea } from "@/lib/areas";
import { formatCount } from "@/lib/areas";
import type { GuideFaq } from "@/lib/guides";
import {
  formatAtt8,
  formatOutcomePercent,
  schoolPlaceLabel,
  townPlaceLabel,
  type SeoSchoolSummary,
  type SeoTown,
} from "@/lib/seoSchools";

export function schoolPageFaqs(school: SeoSchoolSummary): GuideFaq[] {
  const faqs: GuideFaq[] = [];

  if (school.ofstedOverall) {
    const date = school.ofstedPublicationDate
      ? ` (published ${school.ofstedPublicationDate})`
      : "";
    faqs.push({
      question: `What is ${school.name}'s Ofsted rating?`,
      answer: `${school.name} has an overall Ofsted grade of ${school.ofstedOverall}${date}. Open the full report for context — a single grade is not a verdict on fit for your child.`,
    });
  }

  // Match meta: skip non-positive RWM (often special/AP) that misleads in snippets.
  if (school.rwmExpected != null && school.rwmExpected > 0) {
    faqs.push({
      question: `What are ${school.name}'s Key Stage 2 results?`,
      answer: `Published DfE figures show ${formatOutcomePercent(school.rwmExpected)} of pupils meeting the expected standard in reading, writing and maths (RWM) at the end of primary. Compare with neighbours in School Compass — not as a league table.`,
    });
  } else if (school.att8Average != null && school.att8Average > 0) {
    faqs.push({
      question: `What are ${school.name}'s GCSE outcomes?`,
      answer: `Published Attainment 8 is ${formatAtt8(school.att8Average)}. English and maths 9–4: ${formatOutcomePercent(school.engMath94Percent)}. Use alongside inspection excerpts and visits — tables alone do not show everyday teaching.`,
    });
  }

  const place = schoolPlaceLabel(school);
  faqs.push({
    question: `Where is ${school.name}?`,
    answer: `${school.name} is in ${place}${school.postcode ? ` (${school.postcode})` : ""}${
      place !== school.localAuthority ? `, ${school.localAuthority}` : ""
    }. URN ${school.urn}.`,
  });

  faqs.push({
    question: `How do I compare ${school.name} with nearby schools?`,
    answer: `Open School Compass with ${school.name} shortlisted, enter your home postcode, tick two to four neighbours, then compare side by side and print a visit pack. School Compass is parental compare — patterns to visit on, not a ranked verdict.`,
  });

  return faqs;
}

export function townPageFaqs(town: SeoTown): GuideFaq[] {
  const place = townPlaceLabel(town);
  return [
    {
      question: `How many schools are listed in ${place}?`,
      answer: `School Compass lists ${formatCount(town.schoolCount)} open schools with a ${town.name} postal town in the ${town.localAuthority} set (${formatCount(town.withOfsted)} with an Ofsted grade in the index). Counts follow the live pack — not a ranking.`,
    },
    {
      question: `How do I compare schools in ${place}?`,
      answer: `Open a school snapshot from the ${place} list, or jump into the compare tool with a home postcode in ${town.localAuthority}. Shortlist two to four neighbours, compare DfE outcomes and Ofsted/ISI excerpts, then print a visit pack.`,
    },
    {
      question: `Is the ${place} school list a league table?`,
      answer: `No. School Compass is parental compare — published figures and inspection excerpts to visit on, not a ranked “best school” list for ${town.localAuthority}.`,
    },
  ];
}

export function areaPageFaqs(area: CoverageArea): GuideFaq[] {
  const la = area.localAuthority;
  const ey =
    area.eyProviderCount != null
      ? ` and ${formatCount(area.eyProviderCount)} early years settings`
      : "";
  return [
    {
      question: `How many schools can I compare in ${la}?`,
      answer: `The live ${la} set includes ${formatCount(area.schoolCount)} schools${ey}. Open the compare tool with a home postcode in ${la}, or browse stage and town pages from this area landing.`,
    },
    {
      question: `How do I compare primary or secondary schools in ${la}?`,
      answer: `Use the stage links on this page (primary KS2, secondary KS4, early years, childminders), or start from a postcode in the compare tool with the matching stage filters. Side-by-side boards show published outcomes and inspection excerpts.`,
    },
    {
      question: `Does School Compass rank the best schools in ${la}?`,
      answer: `No. Coverage for ${la} supports parental shortlisting — patterns to visit on — not a league table or final verdict for your child.`,
    },
  ];
}
