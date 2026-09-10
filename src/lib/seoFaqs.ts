/**
 * Answer-engine Q&A blocks for school SEO landings and guide pages.
 */

import type { GuideFaq } from "@/lib/guides";
import {
  formatAtt8,
  formatOutcomePercent,
  type SeoSchoolSummary,
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

  if (school.rwmExpected != null) {
    faqs.push({
      question: `What are ${school.name}'s Key Stage 2 results?`,
      answer: `Published DfE figures show ${formatOutcomePercent(school.rwmExpected)} of pupils meeting the expected standard in reading, writing and maths (RWM) at the end of primary. Compare with neighbours in School Compass — not as a league table.`,
    });
  } else if (school.att8Average != null) {
    faqs.push({
      question: `What are ${school.name}'s GCSE outcomes?`,
      answer: `Published Attainment 8 is ${formatAtt8(school.att8Average)}. English and maths 9–4: ${formatOutcomePercent(school.engMath94Percent)}. Use alongside inspection excerpts and visits — tables alone do not show everyday teaching.`,
    });
  }

  const place = school.town || school.localAuthority;
  faqs.push({
    question: `Where is ${school.name}?`,
    answer: `${school.name} is in ${place}${school.postcode ? ` (${school.postcode})` : ""}, ${school.localAuthority}. URN ${school.urn}.`,
  });

  faqs.push({
    question: `How do I compare ${school.name} with nearby schools?`,
    answer: `Open School Compass with ${school.name} shortlisted, enter your home postcode, tick two to four neighbours, then compare side by side and print a visit pack. School Compass is parental compare — patterns to visit on, not a ranked verdict.`,
  });

  return faqs;
}
