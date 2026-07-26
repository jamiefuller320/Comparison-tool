/** Side-by-side “paths” — one care/school stage surface at a time. */

export type ComparePathId =
  | "early-years"
  | "childminders"
  | "ks1"
  | "ks2"
  | "ks4";

export interface ComparePathOption {
  id: ComparePathId;
  label: string;
  shortLabel: string;
}

export const COMPARE_PATH_OPTIONS: ComparePathOption[] = [
  { id: "early-years", label: "Early years", shortLabel: "Early years" },
  { id: "childminders", label: "Childminders", shortLabel: "Childminders" },
  { id: "ks1", label: "KS1 phonics", shortLabel: "KS1" },
  { id: "ks2", label: "Key Stage 2", shortLabel: "KS2" },
  { id: "ks4", label: "KS4 / 16–18", shortLabel: "KS4" },
];

export function comparePathLabel(id: ComparePathId): string {
  return COMPARE_PATH_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

/** Paths the current stage chips + data build can show. */
export function listAvailableComparePaths(flags: {
  showEyNurseryBoards: boolean;
  showChildminderBoards: boolean;
  showKs1: boolean;
  showKs2: boolean;
  showKs4: boolean;
}): ComparePathId[] {
  const out: ComparePathId[] = [];
  if (flags.showEyNurseryBoards) out.push("early-years");
  if (flags.showChildminderBoards) out.push("childminders");
  if (flags.showKs1) out.push("ks1");
  if (flags.showKs2) out.push("ks2");
  if (flags.showKs4) out.push("ks4");
  return out;
}

/** Prefer a path that already has shortlisted settings. */
export function pickDefaultComparePath(
  available: ComparePathId[],
  withShortlist: ComparePathId[],
): ComparePathId | null {
  if (!available.length) return null;
  for (const id of withShortlist) {
    if (available.includes(id)) return id;
  }
  return available[0] ?? null;
}

export function pathsWithShortlistItems(flags: {
  hasEyShortlist: boolean;
  hasChildminderShortlist: boolean;
  hasKs1Shortlist: boolean;
  hasKs2Shortlist: boolean;
  hasKs4Shortlist: boolean;
}): ComparePathId[] {
  const out: ComparePathId[] = [];
  if (flags.hasEyShortlist) out.push("early-years");
  if (flags.hasChildminderShortlist) out.push("childminders");
  if (flags.hasKs1Shortlist) out.push("ks1");
  if (flags.hasKs2Shortlist) out.push("ks2");
  if (flags.hasKs4Shortlist) out.push("ks4");
  return out;
}
