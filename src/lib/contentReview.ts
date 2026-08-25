import type { SchoolRecord } from "@/lib/types";
import { schoolHasInspectionPrecis } from "@/lib/inspectionHighlights";
import { schoolHasQualitativeCapture } from "@/lib/qualitativeEvidence";
import { schoolHasQualitativePointer } from "@/lib/qualitativeLoad";

export type ContentReviewFilter =
  | "any"
  | "both"
  | "precis"
  | "website"
  | "junk";

export type ContentReviewSort =
  | "ingest-desc"
  | "ingest-asc"
  | "name"
  | "website-coverage";

/** Mid-word heading slice — treat as a global ingest defect, not a one-off. */
export function looksLikeMidSentenceFragment(
  text: string | null | undefined,
): boolean {
  const clean = (text || "").trim();
  if (!clean) return false;
  if (/^[a-z]/.test(clean)) return true;
  return /^(s|ing|ed|ly|tion|ments?|ness|ies)\b/i.test(clean);
}

/** Parent View / letterhead chrome — same family of checks as the précis engine. */
export function looksLikePrecisJunk(text: string | null | undefined): boolean {
  const clean = (text || "").trim();
  if (!clean) return false;
  if (looksLikeMidSentenceFragment(clean)) return true;
  const low = clean.toLowerCase();
  if (low.includes("piccadilly gate")) return true;
  if (low.includes("store street") && low.includes("manchester")) return true;
  if (low.includes("how can i feed back my views")) return true;
  if (
    low.includes("ofsted parent view") &&
    (low.includes("give ofsted your opinion") ||
      low.includes("other parents and carers think") ||
      low.includes("when deciding which schools to inspect"))
  ) {
    return true;
  }
  if (low.includes("school and pupil context") || low.includes("this data is from")) {
    return true;
  }
  return false;
}

/** Latest ingest / enrich timestamp for sorting (ISO date or datetime). */
export function contentIngestAt(school: SchoolRecord): string | null {
  const candidates = [
    school.qualitativeCapture?.assessedAt,
    school.qualitativeCaptureEnrichedAt,
    school.inspectionPrecisEnrichedAt,
  ].filter((v): v is string => Boolean(v && String(v).trim()));
  if (!candidates.length) return null;
  return candidates.sort().at(-1) || null;
}

export function documentedWebsiteAreas(school: SchoolRecord): number {
  const areas = school.qualitativeCapture?.areas || [];
  return areas.filter((a) => {
    const signals = a.signals?.length || 0;
    const offerings = a.offerings?.length || 0;
    return signals > 0 || offerings > 0;
  }).length;
}

/** True when there is any précis field worth reviewing — including junk chrome. */
export function schoolHasPrecisForReview(school: SchoolRecord): boolean {
  return (
    schoolHasInspectionPrecis(school) ||
    Boolean(school.inspectionPrecis?.trim()) ||
    looksLikePrecisJunk(school.inspectionPrecis)
  );
}

export function schoolHasReviewContent(school: SchoolRecord): boolean {
  return (
    schoolHasPrecisForReview(school) || schoolHasQualitativePointer(school)
  );
}

export function matchesContentReviewFilter(
  school: SchoolRecord,
  filter: ContentReviewFilter,
): boolean {
  const hasPrecis = schoolHasPrecisForReview(school);
  const hasWebsite =
    schoolHasQualitativePointer(school) || schoolHasQualitativeCapture(school);
  const junk = looksLikePrecisJunk(school.inspectionPrecis);
  switch (filter) {
    case "both":
      return hasPrecis && hasWebsite;
    case "precis":
      return hasPrecis;
    case "website":
      return hasWebsite;
    case "junk":
      return junk;
    case "any":
    default:
      return hasPrecis || hasWebsite;
  }
}

export function matchesContentReviewQuery(
  school: SchoolRecord,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    school.name.toLowerCase().includes(q) ||
    String(school.urn).includes(q) ||
    (school.localAuthority || "").toLowerCase().includes(q) ||
    (school.postcode || "").toLowerCase().includes(q)
  );
}

export function compareContentReviewSort(
  a: SchoolRecord,
  b: SchoolRecord,
  sort: ContentReviewSort,
): number {
  if (sort === "name") {
    return a.name.localeCompare(b.name, "en-GB");
  }
  if (sort === "website-coverage") {
    const diff = documentedWebsiteAreas(b) - documentedWebsiteAreas(a);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "en-GB");
  }
  const aAt = contentIngestAt(a);
  const bAt = contentIngestAt(b);
  if (aAt && bAt && aAt !== bAt) {
    return sort === "ingest-asc"
      ? aAt.localeCompare(bAt)
      : bAt.localeCompare(aAt);
  }
  if (aAt && !bAt) return -1;
  if (!aAt && bAt) return 1;
  return a.name.localeCompare(b.name, "en-GB");
}

export function filterAndSortReviewSchools(
  schools: SchoolRecord[],
  opts: {
    filter?: ContentReviewFilter;
    sort?: ContentReviewSort;
    query?: string;
  } = {},
): SchoolRecord[] {
  const filter = opts.filter || "any";
  const sort = opts.sort || "ingest-desc";
  const query = opts.query || "";
  return schools
    .filter(
      (s) =>
        matchesContentReviewFilter(s, filter) &&
        matchesContentReviewQuery(s, query),
    )
    .sort((a, b) => compareContentReviewSort(a, b, sort));
}

export function formatIngestLabel(iso: string | null | undefined): string {
  if (!iso) return "No ingest date";
  // Prefer calendar date for list density; keep full string in title attributes.
  const day = iso.slice(0, 10);
  return day.length === 10 ? day : iso;
}
