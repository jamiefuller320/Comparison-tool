/**
 * On-demand qualitative capture shards (per URN).
 * Full captures live under /data/qualitative/{urn}.json — not in schools-index.
 */

import type { QualitativeCaptureRecord, SchoolRecord } from "@/lib/types";
import { dataUrl } from "@/lib/data";
import { fetchWithRetry } from "@/lib/resilientFetch";

export function qualitativeShardUrl(urn: string): string {
  return dataUrl(`/data/qualitative/${encodeURIComponent(urn)}.json`);
}

/** True when a shard is published (pointer) or already attached in memory. */
export function schoolHasQualitativePointer(school: SchoolRecord): boolean {
  return Boolean(
    school.qualitativeCaptureEnrichedAt ||
      school.qualitativeCapture?.areas?.length,
  );
}

const captureCache = new Map<string, QualitativeCaptureRecord | null>();
const inflight = new Map<string, Promise<QualitativeCaptureRecord | null>>();

export function clearQualitativeCaptureCache(): void {
  captureCache.clear();
  inflight.clear();
}

export async function loadQualitativeCapture(
  urn: string,
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<QualitativeCaptureRecord | null> {
  const key = String(urn || "").trim();
  if (!key) return null;
  if (!cacheBust && captureCache.has(key)) {
    return captureCache.get(key) ?? null;
  }
  const existing = inflight.get(key);
  if (existing && !cacheBust) return existing;

  const url = cacheBust
    ? `${qualitativeShardUrl(key)}?t=${Date.now()}`
    : qualitativeShardUrl(key);

  const task = (async () => {
    try {
      const res = await fetchWithRetry(
        url,
        { cache: cacheBust ? "no-store" : "default" },
        fetchImpl,
      );
      if (res.status === 404) {
        captureCache.set(key, null);
        return null;
      }
      if (!res.ok) {
        captureCache.set(key, null);
        return null;
      }
      const record = (await res.json()) as QualitativeCaptureRecord;
      captureCache.set(key, record);
      return record;
    } catch {
      captureCache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

export async function loadQualitativeCaptures(
  urns: string[],
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<Record<string, QualitativeCaptureRecord | null>> {
  const unique = [...new Set(urns.map((u) => String(u || "").trim()).filter(Boolean))];
  const rows = await Promise.all(
    unique.map(async (urn) => {
      const record = await loadQualitativeCapture(urn, fetchImpl, cacheBust);
      return [urn, record] as const;
    }),
  );
  const out: Record<string, QualitativeCaptureRecord | null> = {};
  for (const [urn, record] of rows) out[urn] = record;
  return out;
}

/** Attach loaded captures onto school records (does not mutate inputs). */
export function withQualitativeCaptures(
  schools: SchoolRecord[],
  byUrn: Record<string, QualitativeCaptureRecord | null | undefined>,
): SchoolRecord[] {
  return schools.map((school) => {
    if (school.qualitativeCapture?.areas?.length) return school;
    const capture = byUrn[school.urn];
    if (!capture) return school;
    return {
      ...school,
      qualitativeCapture: capture,
      qualitativeCaptureEnrichedAt:
        school.qualitativeCaptureEnrichedAt ?? capture.assessedAt ?? null,
    };
  });
}
