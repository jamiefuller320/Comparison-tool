import type { ShortlistSnapshot } from "@/lib/account/types";
import { loadVisitLog } from "@/lib/visitLog";

const MAX_SCHOOLS = 4;

function postcodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("postcode") || params.get("home");
  } catch {
    return null;
  }
}

export function buildShortlistSnapshot(input: {
  schools: string[];
  stages: string[];
  sectors: string[];
  postcode?: string | null;
  includeVisitLog?: boolean;
  label?: string;
}): ShortlistSnapshot {
  const schools = [...new Set(input.schools.map(String).filter(Boolean))].slice(
    0,
    MAX_SCHOOLS,
  );
  const visitLog = input.includeVisitLog ? loadVisitLog() : undefined;
  const trimmedLog =
    visitLog && schools.length
      ? Object.fromEntries(
          Object.entries(visitLog).filter(([urn]) => schools.includes(urn)),
        )
      : undefined;
  const postcode =
    (input.postcode !== undefined ? input.postcode : postcodeFromUrl())?.trim() ||
    null;

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    label: input.label?.trim() || undefined,
    schools,
    stages: [...input.stages],
    sectors: [...input.sectors],
    postcode,
    visitLog:
      trimmedLog && Object.keys(trimmedLog).length > 0 ? trimmedLog : undefined,
  };
}

export function isValidEmail(email: string): boolean {
  const t = email.trim();
  // Practical parent email check — not full RFC.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
