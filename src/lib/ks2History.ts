import type { MetricKey } from "@/lib/types";
import { dataUrl } from "@/lib/data";
import { periodShortLabel } from "@/lib/covid-gap";

export type HistoryMetricKey = MetricKey;

export interface Ks2HistoryMeta {
  generatedAt: string;
  periods: string[];
  metrics: string[];
  england: Partial<Record<HistoryMetricKey, Array<number | null>>>;
  schoolCount: number;
  shardCount?: number;
  source: {
    name: string;
    url: string;
    note: string;
    years: string[];
  };
}

export type SchoolHistorySeries = Partial<
  Record<HistoryMetricKey, Array<number | null>>
>;

export type HistoryShard = Record<string, SchoolHistorySeries>;

/** Last two digits of the numeric URN → shard file stem (u42.json). */
export function historyShardKey(urn: string): string {
  const digits = urn.replace(/\D/g, "");
  if (digits.length >= 2) return digits.slice(-2);
  return digits.padStart(2, "0");
}

export function historyShardUrl(urn: string): string {
  return dataUrl(`/data/ks2-history/u${historyShardKey(urn)}.json`);
}

export function historyMetaUrl(): string {
  return dataUrl("/data/ks2-history/meta.json");
}

let metaCache: Ks2HistoryMeta | null = null;
const shardCache = new Map<string, HistoryShard>();

export async function loadKs2HistoryMeta(
  fetchImpl: typeof fetch = fetch,
): Promise<Ks2HistoryMeta> {
  if (metaCache) return metaCache;
  const res = await fetchImpl(historyMetaUrl());
  if (!res.ok) {
    throw new Error(`Failed to load KS2 history meta (${res.status})`);
  }
  metaCache = (await res.json()) as Ks2HistoryMeta;
  return metaCache;
}

export async function loadHistoryShard(
  urn: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HistoryShard> {
  const key = historyShardKey(urn);
  const cached = shardCache.get(key);
  if (cached) return cached;
  const res = await fetchImpl(historyShardUrl(urn));
  if (!res.ok) {
    throw new Error(`Failed to load KS2 history shard u${key} (${res.status})`);
  }
  const shard = (await res.json()) as HistoryShard;
  shardCache.set(key, shard);
  return shard;
}

export async function loadSchoolHistorySeries(
  urns: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, SchoolHistorySeries | null>> {
  const unique = [...new Set(urns.filter(Boolean))];
  await Promise.all(unique.map((urn) => loadHistoryShard(urn, fetchImpl)));
  const out: Record<string, SchoolHistorySeries | null> = {};
  for (const urn of unique) {
    const shard = shardCache.get(historyShardKey(urn));
    out[urn] = shard?.[urn] ?? null;
  }
  return out;
}

export type MetricHistoryPoint = {
  year: string;
  period: string;
  england: number | null;
  gap?: boolean;
  [urn: string]: string | number | boolean | null | undefined;
};

/** Build chart rows for one metric across selected schools + England. */
export function buildMetricHistoryPoints(
  meta: Ks2HistoryMeta,
  metric: HistoryMetricKey,
  schoolSeries: Record<string, SchoolHistorySeries | null>,
  urns: string[],
): MetricHistoryPoint[] {
  const englandSeries = meta.england[metric] ?? [];
  const points: MetricHistoryPoint[] = [];

  for (let i = 0; i < meta.periods.length; i += 1) {
    const period = meta.periods[i];
    const point: MetricHistoryPoint = {
      year: periodShortLabel(period),
      period,
      england: englandSeries[i] ?? null,
    };
    let any = point.england != null;
    for (const urn of urns) {
      const value = schoolSeries[urn]?.[metric]?.[i] ?? null;
      point[urn] = value;
      if (value != null) any = true;
    }
    if (any) points.push(point);
  }
  return points;
}

export function seriesHasHistory(
  series: SchoolHistorySeries | null | undefined,
  metric: HistoryMetricKey,
): boolean {
  const values = series?.[metric];
  return Boolean(values?.some((v) => v != null));
}
