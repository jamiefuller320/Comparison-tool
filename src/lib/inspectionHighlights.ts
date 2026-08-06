import type { InspectionQuote, SchoolRecord } from "@/lib/types";

const IMPROVE_HINT =
  /\b(need to|needs to|should|must|ought to|improve|improving|not yet|inconsistent|less well|further work|develop further|address|tackle|weakness|gap)\b/i;

/** Ofsted PDF end-matter / address chrome that must never be shown as a précis. */
const PROSE_HINT =
  /\b(pupils?|child|children|school|staff|leaders?|parents?|curriculum|safeguard(?:ing)?|learning|behaviour|attendance|reading|maths|teachers?)\b/i;

export function looksLikeInspectionPrecisJunk(text: string | null | undefined): boolean {
  const clean = (text || "").trim();
  if (!clean) return false;
  const letters = [...clean].filter((ch) => /\p{L}/u.test(ch)).length;
  if (clean.length < 40 && !(PROSE_HINT.test(clean) && letters >= 20)) {
    return true;
  }
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
  // Reject date/page crumbs with almost no letters; keep short pupil sentences.
  if (letters < 18) return true;
  return false;
}

export function shortInspectionSummary(
  school: SchoolRecord,
  maxChars = 160,
): string | null {
  const precis = school.inspectionPrecis?.trim();
  if (precis && !looksLikeInspectionPrecisJunk(precis)) {
    return truncateSummary(precis, maxChars);
  }
  // Strengths/quotes are curated extract lines — do not apply PDF junk filters.
  const first =
    school.inspectionStrengths?.[0]?.text ||
    school.inspectionQuotes?.[0]?.text;
  if (first?.trim()) {
    return truncateSummary(first.trim(), maxChars);
  }
  return null;
}

function truncateSummary(text: string, maxChars: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars + 1);
  const sentence = cut.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentence && sentence[1].length >= maxChars / 2) return sentence[1];
  const sp = cut.lastIndexOf(" ");
  if (sp > maxChars / 2) return `${cut.slice(0, sp).replace(/[,;]$/, "")}…`;
  return `${cut.slice(0, maxChars)}…`;
}

export function schoolHasInspectionPrecis(school: SchoolRecord): boolean {
  const precis = school.inspectionPrecis?.trim();
  const usablePrecis = Boolean(precis && !looksLikeInspectionPrecisJunk(precis));
  return Boolean(
    usablePrecis ||
      (school.inspectionQuotes && school.inspectionQuotes.length) ||
      (school.inspectionStrengths && school.inspectionStrengths.length) ||
      (school.inspectionImprovements && school.inspectionImprovements.length),
  );
}

/**
 * Prefer harvested strength/improvement buckets; otherwise classify existing
 * quotes so older indexes still expand usefully before re-enrich.
 */
export function inspectionHighlights(school: SchoolRecord): {
  strengths: InspectionQuote[];
  improvements: InspectionQuote[];
} {
  const strengths = [...(school.inspectionStrengths || [])].filter((q) =>
    q?.text?.trim(),
  );
  const improvements = [...(school.inspectionImprovements || [])].filter((q) =>
    q?.text?.trim(),
  );
  if (strengths.length || improvements.length) {
    return { strengths, improvements };
  }

  const quotes = [...(school.inspectionQuotes || [])].filter((q) =>
    q?.text?.trim(),
  );
  const derivedStrengths: InspectionQuote[] = [];
  const derivedImprovements: InspectionQuote[] = [];
  for (const quote of quotes) {
    if (IMPROVE_HINT.test(quote.text)) derivedImprovements.push(quote);
    else derivedStrengths.push(quote);
  }
  // If everything classified as one side, keep quotes as strengths and leave
  // improvements empty rather than inventing text.
  if (!derivedStrengths.length && derivedImprovements.length) {
    return { strengths: [], improvements: derivedImprovements };
  }
  return { strengths: derivedStrengths, improvements: derivedImprovements };
}

export function inspectionSourceLabel(source?: string | null): string {
  if (source === "isi") return "ISI";
  return "Ofsted";
}

export function inspectionReportHref(school: SchoolRecord): string {
  return (
    school.inspectionReportFileUrl ||
    school.isiLatestReportUrl ||
    school.ofstedReportUrl ||
    school.isiProfileUrl ||
    school.isiReportsUrl ||
    "#"
  );
}
