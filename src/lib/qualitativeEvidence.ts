import type {
  DocumentInventoryItem,
  QualitativeCaptureRecord,
  QualitativeSignal,
  QualitativeSubjectArea,
  SchoolRecord,
  SubjectAreaAssessment,
} from "@/lib/types";

export const CORE_AREA_LABELS: Record<QualitativeSubjectArea, string> = {
  curriculum: "Curriculum",
  enrichment: "Enrichment & clubs",
  ethos: "Ethos & values",
  behaviour: "Behaviour & pastoral care",
  send: "SEND & inclusion",
  community: "Community & parents",
};

export const SOURCE_LABELS: Record<string, string> = {
  "school-website": "School website",
  "school-document": "School document",
  "local-news": "Local news",
  "social-media": "Social media",
  other: "Other",
};

export type CoverageLevelId = "none" | "thin" | "some" | "rich";

export interface CoverageLevel {
  id: CoverageLevelId;
  label: string;
  className: string;
}

export function schoolHasQualitativeCapture(
  school: SchoolRecord,
): school is SchoolRecord & { qualitativeCapture: QualitativeCaptureRecord } {
  return Boolean(school.qualitativeCapture?.areas?.length);
}

export function coverageLevel(area: SubjectAreaAssessment): CoverageLevel {
  const signals = area.signals || [];
  const offerings = area.offerings || [];
  const confidence = area.confidence ?? 0;
  if (!signals.length && !offerings.length) {
    return { id: "none", label: "Not found in scan", className: "cov-none" };
  }
  if (signals.length >= 3 && confidence >= 0.55) {
    return { id: "rich", label: "Well documented", className: "cov-rich" };
  }
  if (signals.length >= 1 || offerings.length) {
    return { id: "some", label: "Some detail", className: "cov-some" };
  }
  return { id: "thin", label: "Thin", className: "cov-thin" };
}

function countDistinctUrls(signals: QualitativeSignal[]): number {
  return new Set(signals.map((s) => s.sourceUrl)).size;
}

export function parentParagraph(area: SubjectAreaAssessment): string {
  if (area.narrativeSummary?.trim()) {
    return area.narrativeSummary.trim();
  }

  const offerings = area.offerings || [];
  const signals = area.signals || [];
  const label = CORE_AREA_LABELS[area.area] || area.area;
  const cov = coverageLevel(area);

  if (cov.id === "none") {
    return `We did not find much about ${label.toLowerCase()} on the pages and documents scanned for this school. Worth asking on a visit or checking the school's website directly.`;
  }

  if (offerings.length >= 2) {
    // Prefer shorter labels in the compare cell; long club/curriculum names
    // previously produced one unbroken line that overflowed the table.
    const shown = offerings
      .slice(0, 6)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
    const extra = offerings.length > 6 ? ` and ${offerings.length - 6} more` : "";
    const distinct = countDistinctUrls(signals);
    const corroboration =
      distinct >= 2
        ? ` Information appears across ${distinct} page${distinct === 1 ? "" : "s"}.`
        : "";
    return `The school website lists ${shown}${extra}.${corroboration}`;
  }

  if (signals.length === 1 && signals[0].text.length < 120) {
    const text = signals[0].text;
    const mention = text.toLowerCase().startsWith("the ")
      ? text
      : text.charAt(0).toLowerCase() + text.slice(1);
    return `The school mentions ${mention}. See the source link below for the original page.`;
  }

  const best = signals.find((s) => s.text.length > 60) || signals[0];
  if (best) return best.text;

  return (
    area.summary ||
    `Some material related to ${label.toLowerCase()} was found on the school site.`
  );
}

export type SourceGroupKey =
  | "school-website"
  | "school-document"
  | "local-news"
  | "other";

export interface GroupedSource extends QualitativeSignal {
  meta?: string;
}

export function groupSources(
  area: SubjectAreaAssessment,
  record: QualitativeCaptureRecord,
): Record<SourceGroupKey, GroupedSource[]> {
  const groups: Record<SourceGroupKey, GroupedSource[]> = {
    "school-website": [],
    "school-document": [],
    "local-news": [],
    other: [],
  };

  for (const signal of area.signals || []) {
    const key: SourceGroupKey =
      signal.sourceType === "school-website"
        ? "school-website"
        : signal.sourceType === "school-document"
          ? "school-document"
          : signal.sourceType === "local-news"
            ? "local-news"
            : "other";
    groups[key].push(signal);
  }

  const docs = (record.documentInventory || []).filter(
    (d) => d.status === "extracted" || d.status === "discovered",
  );
  for (const doc of docs) {
    if (documentRelevantToArea(doc, area.area)) {
      groups["school-document"].push({
        text: doc.label || "Document",
        sourceUrl: doc.url,
        sourceType: "school-document",
        capturedAt: record.assessedAt,
        pageTitle: doc.label,
        meta: doc.status,
      });
    }
  }

  return groups;
}

function documentRelevantToArea(
  doc: DocumentInventoryItem,
  area: QualitativeSubjectArea,
): boolean {
  const blob = `${doc.label} ${doc.url}`.toLowerCase();
  switch (area) {
    case "curriculum":
      return /curriculum|subject|overview|prospectus/.test(blob);
    case "enrichment":
      return /club|sport|extra/.test(blob);
    case "send":
      return /send|sen|inclusion|senco/.test(blob);
    case "behaviour":
      return /safeguard|behav|pastoral/.test(blob);
    case "ethos":
      return /ethos|value|welcome/.test(blob);
    case "community":
      return /parent|community|pta/.test(blob);
    default:
      return false;
  }
}

export function evidenceCount(
  area: SubjectAreaAssessment,
  record: QualitativeCaptureRecord,
): number {
  const groups = groupSources(area, record);
  return Object.values(groups).reduce((n, arr) => n + arr.length, 0);
}

export function documentedAreaCount(record: QualitativeCaptureRecord): number {
  return (record.areas || []).filter((a) => coverageLevel(a).id !== "none").length;
}

const CITATION_RE = /\[(\d+)\]/g;

/**
 * Numbered citation list matching synthesis `_numbered_sources`:
 * signal order, dedupe by URL (or text prefix), cap 8.
 * Footnotes must use this — not `groupSources` flatten (which regroups by
 * type and injects documentInventory, shifting [n] targets).
 */
export function numberedCitationSources(
  area: SubjectAreaAssessment,
): GroupedSource[] {
  const sources: GroupedSource[] = [];
  const seen = new Set<string>();
  for (const signal of area.signals || []) {
    const key = signal.sourceUrl || signal.text.slice(0, 80);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    sources.push(signal);
    if (sources.length >= 8) break;
  }
  return sources;
}

export function citationFootnotes(
  text: string,
  sources: GroupedSource[],
): Array<{ n: number; href: string; label: string }> {
  const refs = new Set<number>();
  for (const match of text.matchAll(CITATION_RE)) {
    refs.add(Number(match[1]));
  }
  return [...refs]
    .sort((a, b) => a - b)
    .map((n) => {
      const src = sources[n - 1];
      return {
        n,
        href: src?.sourceUrl || "#",
        label: src?.pageTitle || src?.sourceUrl || `Source ${n}`,
      };
    });
}

/** Split narrative text into plain runs and citation markers for inline links. */
export function citationSegments(
  text: string,
): Array<{ kind: "text"; value: string } | { kind: "cite"; n: number }> {
  const segments: Array<
    { kind: "text"; value: string } | { kind: "cite"; n: number }
  > = [];
  let last = 0;
  for (const match of text.matchAll(CITATION_RE)) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({ kind: "text", value: text.slice(last, start) });
    }
    segments.push({ kind: "cite", n: Number(match[1]) });
    last = start + match[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }
  return segments;
}

export function shortQualitativeSummary(school: SchoolRecord): string | null {
  const capture = school.qualitativeCapture;
  if (!capture?.areas?.length) return null;
  const documented = documentedAreaCount(capture);
  if (!documented) {
    return "Website scan found little structured detail — worth checking the school site directly.";
  }
  const top = capture.areas
    .filter((a) => coverageLevel(a).id !== "none")
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  if (!top) return null;
  const label = CORE_AREA_LABELS[top.area];
  const snippet = parentParagraph(top);
  const trimmed =
    snippet.length > 140 ? `${snippet.slice(0, 137).trim()}…` : snippet;
  return `${label}: ${trimmed}`;
}
