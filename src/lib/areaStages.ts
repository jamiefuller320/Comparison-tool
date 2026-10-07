/**
 * SEO stage landings nested under each coverage area.
 * Slugs are parental labels; pathId maps into decision guidance / compare URL.
 */

import type { CoverageArea } from "@/lib/areas";
import { areaPath, formatCount } from "@/lib/areas";
import { type GuidancePathId } from "@/lib/decisionGuidance";

export type AreaStageSlug =
  | "early-years"
  | "childminders"
  | "ks1"
  | "primary"
  | "secondary";

export type AreaStageLanding = {
  slug: AreaStageSlug;
  /** Compare-tool stages query value(s). */
  stagesQuery: string;
  guidancePath: GuidancePathId;
  label: string;
  shortLabel: string;
  headline: (la: string) => string;
  lead: (area: CoverageArea) => string;
  countLabel: (area: CoverageArea) => string;
};

export const AREA_STAGE_LANDINGS: AreaStageLanding[] = [
  {
    slug: "early-years",
    stagesQuery: "early-years",
    guidancePath: "early-years",
    label: "Early years",
    shortLabel: "EY",
    headline: (la) => `Compare early years in ${la}`,
    lead: (area) =>
      `Shortlist nurseries and school early-years settings in ${area.localAuthority}, compare Ofsted grades and inspection excerpts, then visit. EYFSP area figures are context — not a provider league table.`,
    countLabel: (area) =>
      `${formatCount(area.eyProviderCount)} early years settings in the live set`,
  },
  {
    slug: "childminders",
    stagesQuery: "childminders",
    guidancePath: "childminders",
    label: "Childminders",
    shortLabel: "CM",
    headline: (la) => `Find childminders in ${la}`,
    lead: (area) =>
      `Browse consented childminders in ${area.localAuthority} with Ofsted grades where published, then use the vetting checklist before you visit. A directory for wrap-around care — not a ranked list.`,
    countLabel: (area) =>
      `${formatCount(area.childminderCount)} consented childminders in the live set`,
  },
  {
    slug: "ks1",
    stagesQuery: "ks1",
    guidancePath: "ks1",
    label: "KS1 / phonics",
    shortLabel: "KS1",
    headline: (la) => `Compare infant and KS1 schools in ${la}`,
    lead: (area) =>
      `Map infant and primary settings in ${area.localAuthority} for Years 1–2. School-level phonics scores are not published — use LA phonics context, inspection excerpts, and visits.`,
    countLabel: (area) =>
      `${formatCount(area.schoolCount)} schools in the ${area.localAuthority} set`,
  },
  {
    slug: "primary",
    stagesQuery: "ks2",
    guidancePath: "ks2",
    label: "Primary (KS2)",
    shortLabel: "KS2",
    headline: (la) => `Compare primary schools in ${la}`,
    lead: (area) =>
      `Shortlist primary schools in ${area.localAuthority}, compare Key Stage 2 published figures and Ofsted/ISI excerpts, then print a visit pack. Patterns to visit on — not a league table.`,
    countLabel: (area) =>
      `${formatCount(area.withRwm)} schools with published KS2 RWM in the live set`,
  },
  {
    slug: "secondary",
    stagesQuery: "ks3,ks4",
    guidancePath: "ks4",
    label: "Secondary (KS4)",
    shortLabel: "KS4",
    headline: (la) => `Compare secondary schools in ${la}`,
    lead: (area) =>
      `Shortlist secondaries in ${area.localAuthority}, compare published KS4 / 16–18 figures and Ofsted/ISI excerpts, then visit. KS3 has no school-level attainment table — outcomes appear at KS4.`,
    countLabel: (area) =>
      `${formatCount(area.withKs4)} schools with published KS4 in the live set`,
  },
];

export function getAreaStage(slug: string): AreaStageLanding | undefined {
  return AREA_STAGE_LANDINGS.find((stage) => stage.slug === slug);
}

export function areaStagePath(areaSlug: string, stageSlug: string): string {
  return `${areaPath(areaSlug)}${stageSlug}/`;
}

export function areaStageCompareHref(stage: AreaStageLanding): string {
  return `/?stages=${encodeURIComponent(stage.stagesQuery)}#top`;
}

/**
 * ~155-char meta description. Page body still uses stage.lead + guidance;
 * do not concatenate those into the snippet (was 350–430 chars live).
 */
export function areaStageDescription(
  area: CoverageArea,
  stage: AreaStageLanding,
): string {
  const la = area.localAuthority;
  const bySlug: Record<AreaStageSlug, string> = {
    "early-years": `Shortlist nurseries and early years in ${la}. Compare Ofsted grades and inspection excerpts, then visit.`,
    childminders: `Browse consented childminders in ${la} with Ofsted grades where published, then use the vetting checklist.`,
    ks1: `Map infant and KS1 schools in ${la}. Use LA phonics context, inspection excerpts, and visits.`,
    primary: `Shortlist primary schools in ${la}. Compare KS2 figures and Ofsted/ISI excerpts, then print a visit pack.`,
    secondary: `Shortlist secondaries in ${la}. Compare published KS4 / 16–18 figures and Ofsted/ISI excerpts, then visit.`,
  };
  return bySlug[stage.slug] ?? stage.lead(area);
}
