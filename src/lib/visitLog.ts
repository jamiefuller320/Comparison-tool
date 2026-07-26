/** Lightweight per-setting visit / contact status (browser localStorage). */

export const VISIT_STATUS_OPTIONS = [
  { id: "none", label: "Not contacted" },
  { id: "phoned", label: "Phoned" },
  { id: "visited", label: "Visited" },
  { id: "waiting", label: "Waiting list" },
  { id: "no-places", label: "No places" },
] as const;

export type VisitStatusId = (typeof VISIT_STATUS_OPTIONS)[number]["id"];

export interface VisitLogEntry {
  status: VisitStatusId;
  note?: string;
  updatedAt?: string;
}

const STORAGE_KEY = "schoolside.visitLog.v1";

export function isVisitStatusId(value: string): value is VisitStatusId {
  return VISIT_STATUS_OPTIONS.some((o) => o.id === value);
}

export function visitStatusLabel(status: VisitStatusId): string {
  return (
    VISIT_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? "Not contacted"
  );
}

export function loadVisitLog(): Record<string, VisitLogEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, VisitLogEntry>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, VisitLogEntry> = {};
    for (const [urn, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== "object") continue;
      const status = String(entry.status || "none");
      if (!isVisitStatusId(status)) continue;
      out[urn] = {
        status,
        note: typeof entry.note === "string" ? entry.note : undefined,
        updatedAt:
          typeof entry.updatedAt === "string" ? entry.updatedAt : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveVisitLog(log: Record<string, VisitLogEntry>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Private mode / quota — ignore.
  }
}

export function upsertVisitLogEntry(
  log: Record<string, VisitLogEntry>,
  urn: string,
  patch: Partial<VisitLogEntry>,
): Record<string, VisitLogEntry> {
  const prev = log[urn] ?? { status: "none" as VisitStatusId };
  const next: VisitLogEntry = {
    status: patch.status ?? prev.status,
    note: patch.note !== undefined ? patch.note : prev.note,
    updatedAt: new Date().toISOString(),
  };
  if (!next.note) delete next.note;
  return { ...log, [urn]: next };
}
