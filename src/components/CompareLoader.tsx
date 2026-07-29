"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import {
  loadChildmindersIndex,
  loadEyProvidersIndex,
  loadLaPackChildmindersIndex,
  loadLaPackEyProvidersIndex,
  loadLaPackManifest,
  loadLaPackSchoolsIndex,
  loadSchoolsIndex,
} from "@/lib/data";
import {
  listReadyPacks,
  mergeChildmindersWithPacks,
  mergeEyProvidersWithPacks,
  mergeSchoolsIndexWithPacks,
  type LaPackManifestEntry,
} from "@/lib/laPacks";
import { CompareApp } from "@/components/CompareApp";

async function loadReadyPackEntries(
  fetchImpl: typeof fetch,
  cacheBust: boolean,
): Promise<LaPackManifestEntry[]> {
  const manifest = await loadLaPackManifest(fetchImpl, cacheBust);
  return listReadyPacks(manifest);
}

async function loadMergedSchoolsIndex(
  fetchImpl: typeof fetch,
  cacheBust: boolean,
  ready: LaPackManifestEntry[],
): Promise<SchoolsIndex> {
  const seed = await loadSchoolsIndex(fetchImpl, cacheBust);
  if (!ready.length) return seed;

  const loaded = await Promise.all(
    ready.map(async (entry) => {
      const index = await loadLaPackSchoolsIndex(entry.slug, fetchImpl, cacheBust);
      return index ? { index, meta: entry } : null;
    }),
  );
  const packs = loaded.filter(
    (row): row is { index: SchoolsIndex; meta: LaPackManifestEntry } =>
      Boolean(row),
  );
  if (!packs.length) return seed;
  return mergeSchoolsIndexWithPacks(seed, packs);
}

async function loadMergedEyProvidersIndex(
  fetchImpl: typeof fetch,
  cacheBust: boolean,
  ready: LaPackManifestEntry[],
): Promise<EyProvidersIndex | null> {
  const seed = await loadEyProvidersIndex(fetchImpl, cacheBust);
  if (!seed || !ready.length) return seed;

  const loaded = await Promise.all(
    ready.map(async (entry) => {
      const index = await loadLaPackEyProvidersIndex(
        entry.slug,
        fetchImpl,
        cacheBust,
      );
      return index ? { index, meta: entry } : null;
    }),
  );
  const packs = loaded.filter(
    (row): row is { index: EyProvidersIndex; meta: LaPackManifestEntry } =>
      Boolean(row),
  );
  if (!packs.length) return seed;
  return mergeEyProvidersWithPacks(seed, packs);
}

async function loadMergedChildmindersIndex(
  fetchImpl: typeof fetch,
  cacheBust: boolean,
  ready: LaPackManifestEntry[],
): Promise<ChildmindersIndex | null> {
  const seed = await loadChildmindersIndex(fetchImpl, cacheBust);
  if (!seed || !ready.length) return seed;

  const loaded = await Promise.all(
    ready.map(async (entry) => {
      const index = await loadLaPackChildmindersIndex(
        entry.slug,
        fetchImpl,
        cacheBust,
      );
      return index ? { index, meta: entry } : null;
    }),
  );
  const packs = loaded.filter(
    (row): row is { index: ChildmindersIndex; meta: LaPackManifestEntry } =>
      Boolean(row),
  );
  if (!packs.length) return seed;
  return mergeChildmindersWithPacks(seed, packs);
}

async function loadCollatedIndexes(fetchImpl: typeof fetch, cacheBust: boolean) {
  const ready = await loadReadyPackEntries(fetchImpl, cacheBust);
  const [data, ey, childminders] = await Promise.all([
    loadMergedSchoolsIndex(fetchImpl, cacheBust, ready),
    loadMergedEyProvidersIndex(fetchImpl, cacheBust, ready),
    loadMergedChildmindersIndex(fetchImpl, cacheBust, ready),
  ]);
  return { data, ey, childminders };
}

export function CompareLoader() {
  const [index, setIndex] = useState<SchoolsIndex | null>(null);
  const [eyIndex, setEyIndex] = useState<EyProvidersIndex | null>(null);
  const [childmindersIndex, setChildmindersIndex] =
    useState<ChildmindersIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reloadIndex = useCallback(async () => {
    const { data, ey, childminders } = await loadCollatedIndexes(fetch, true);
    setIndex(data);
    setEyIndex(ey);
    setChildmindersIndex(childminders);
    setError(null);
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCollatedIndexes(fetch, reloadToken > 0)
      .then(({ data, ey, childminders }) => {
        if (!cancelled) {
          setIndex(data);
          setEyIndex(ey);
          setChildmindersIndex(childminders);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Could not load school data");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (error && !index) {
    return (
      <section className="hero">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School<em>side</em>
          </p>
          <h1>Compare English schools side by side when you are choosing.</h1>
          <p className="postcode-error">{error}</p>
        </div>
      </section>
    );
  }

  if (!index) {
    return (
      <section className="hero">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School<em>side</em>
          </p>
          <h1>Compare English schools side by side when you are choosing.</h1>
          <p>Loading English school performance data…</p>
        </div>
      </section>
    );
  }

  return (
    <CompareApp
      index={index}
      eyIndex={eyIndex}
      childmindersIndex={childmindersIndex}
      onIndexReload={reloadIndex}
    />
  );
}
