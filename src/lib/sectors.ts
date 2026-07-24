/** State-funded vs independent (private / “public school”) sector. */

export const SECTOR_OPTIONS = [
  {
    id: "state",
    label: "State",
    short: "State",
    hint: "State-funded schools that usually appear in DfE performance tables",
  },
  {
    id: "independent",
    label: "Independent",
    short: "Indep.",
    hint: "Independent / private schools (sometimes called public schools) — often little or no published KS2 table data",
  },
] as const;

export type SectorId = (typeof SECTOR_OPTIONS)[number]["id"];

export const DEFAULT_SECTORS: SectorId[] = ["state"];

const SECTOR_IDS = new Set<string>(SECTOR_OPTIONS.map((o) => o.id));

const INDEPENDENT_TYPE_FRAGMENTS = [
  "independent",
  "non-maintained special",
  "british schools overseas",
  "offshore schools",
];

export function normalizeSectorIds(raw: string[]): SectorId[] {
  const seen = new Set<SectorId>();
  const out: SectorId[] = [];
  for (const item of raw) {
    const id = item.trim().toLowerCase();
    if (!SECTOR_IDS.has(id) || seen.has(id as SectorId)) continue;
    seen.add(id as SectorId);
    out.push(id as SectorId);
  }
  return out;
}

export function parseSectorsParam(raw: string | null | undefined): SectorId[] {
  if (!raw) return DEFAULT_SECTORS;
  const parsed = normalizeSectorIds(raw.split(","));
  return parsed.length ? parsed : DEFAULT_SECTORS;
}

/**
 * Classify a GIAS / DfE establishment type as state or independent.
 * “Public school” in UK parental language usually means independent.
 */
export function sectorFromSchoolType(
  schoolTypeLabel?: string | null,
  schoolType?: string | null,
): SectorId {
  const text = `${schoolTypeLabel || ""} ${schoolType || ""}`.toLowerCase();
  if (!text.trim()) return "state"; // KS2 performance harvest is overwhelmingly state-funded
  if (INDEPENDENT_TYPE_FRAGMENTS.some((frag) => text.includes(frag))) {
    return "independent";
  }
  return "state";
}

export function resolveSchoolSector(school: {
  sector?: SectorId | string | null;
  schoolTypeLabel?: string | null;
  schoolType?: string | null;
}): SectorId {
  if (school.sector === "state" || school.sector === "independent") {
    return school.sector;
  }
  return sectorFromSchoolType(school.schoolTypeLabel, school.schoolType);
}

export function schoolMatchesSectors(
  school: {
    sector?: SectorId | string | null;
    schoolTypeLabel?: string | null;
    schoolType?: string | null;
  },
  selected: SectorId[],
): boolean {
  if (!selected.length) return true;
  return selected.includes(resolveSchoolSector(school));
}

export function formatSector(sector?: SectorId | string | null): string {
  if (sector === "independent") return "Independent";
  if (sector === "state") return "State";
  return "";
}
