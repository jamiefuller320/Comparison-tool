/**
 * Build-time gates for publishing bounded qualitative snippets on SEO landings.
 * Only substantive, source-backed themes ship in crawlable HTML — not compare-tool
 * placeholders or deterministic listing boilerplate.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { CORE_AREA_LABELS } from "@/lib/qualitativeEvidence";
import type {
  QualitativeCaptureRecord,
  QualitativeSubjectArea,
  SubjectAreaAssessment,
} from "@/lib/types";

export type SeoQualitativeTheme = {
  area: QualitativeSubjectArea;
  label: string;
  /** Parent-facing paragraph — verbatim from synthesis or best signal. */
  text: string;
  sourceUrl: string | null;
  assessedAt: string | null;
};

const BOILERPLATE_RE = [
  /^we did not find much about/i,
  /^the school website lists/i,
  /^little public evidence/i,
  /worth asking on a visit/i,
  /^some material related to/i,
];

const MIN_PUBLISH_SCORE = 50;
const MIN_PUBLISH_CONFIDENCE = 0.6;
const MIN_NARRATIVE_CHARS = 80;
const MAX_PUBLISHED_THEMES = 2;

function publicQualitativePath(urn: string): string {
  return join(process.cwd(), "public", "data", "qualitative", `${urn}.json`);
}

export function isBoilerplateQualitativeText(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length < MIN_NARRATIVE_CHARS) return true;
  return BOILERPLATE_RE.some((re) => re.test(t));
}

export function isPublishableQualitativeArea(
  area: SubjectAreaAssessment,
): boolean {
  if ((area.score ?? 0) < MIN_PUBLISH_SCORE) return false;
  if ((area.confidence ?? 0) < MIN_PUBLISH_CONFIDENCE) return false;
  const signals = area.signals ?? [];
  if (!signals.length) return false;

  const narrative = area.narrativeSummary?.trim();
  if (!narrative || isBoilerplateQualitativeText(narrative)) return false;

  const substantive = signals.some((s) => (s.text?.trim().length ?? 0) >= 60);
  if (!substantive) return false;

  return true;
}

function bestSourceUrl(area: SubjectAreaAssessment): string | null {
  const signals = area.signals ?? [];
  const ranked = [...signals].sort(
    (a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0),
  );
  return ranked.find((s) => s.sourceUrl?.trim())?.sourceUrl?.trim() ?? null;
}

export function publishableQualitativeThemes(
  record: QualitativeCaptureRecord,
): SeoQualitativeTheme[] {
  const ranked = (record.areas ?? [])
    .filter(isPublishableQualitativeArea)
    .sort(
      (a, b) =>
        (b.score ?? 0) * (b.confidence ?? 0) -
        (a.score ?? 0) * (a.confidence ?? 0),
    )
    .slice(0, MAX_PUBLISHED_THEMES);

  return ranked.map((area) => ({
    area: area.area,
    label: CORE_AREA_LABELS[area.area] ?? area.area,
    text: area.narrativeSummary!.trim(),
    sourceUrl: bestSourceUrl(area),
    assessedAt: record.assessedAt ?? null,
  }));
}

export function loadSeoQualitativeThemes(urn: string): SeoQualitativeTheme[] {
  const path = publicQualitativePath(urn);
  if (!existsSync(path)) return [];
  try {
    const record = JSON.parse(
      readFileSync(path, "utf8"),
    ) as QualitativeCaptureRecord;
    return publishableQualitativeThemes(record);
  } catch {
    return [];
  }
}
