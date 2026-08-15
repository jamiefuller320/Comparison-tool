"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import {
  loadReadyPackEntries,
  loadSeedIndexes,
  mergePacksIntoIndexes,
} from "@/lib/collateIndexes";
import { CompareApp } from "@/components/CompareApp";
import { JourneyChapterProvider } from "@/components/JourneyChapterContext";

type PackPhase = "idle" | "loading" | "ready" | "partial";

async function progressiveLoad(
  fetchImpl: typeof fetch,
  cacheBust: boolean,
  onSeed: (seed: {
    schools: SchoolsIndex;
    ey: EyProvidersIndex | null;
    childminders: ChildmindersIndex | null;
  }) => void,
  onNote: (note: string | null) => void,
): Promise<{ packsFailed: number; packsLoaded: number; readyCount: number }> {
  onNote("Loading Hampshire seed…");
  const seed = await loadSeedIndexes(fetchImpl, cacheBust);
  onSeed(seed);
  onNote("Loading wider South East coverage…");

  const ready = await loadReadyPackEntries(fetchImpl, cacheBust);
  if (!ready.length) {
    onNote(null);
    return { packsFailed: 0, packsLoaded: 0, readyCount: 0 };
  }

  const merged = await mergePacksIntoIndexes(
    seed,
    ready,
    fetchImpl,
    cacheBust,
  );
  onSeed({
    schools: merged.schools,
    ey: merged.ey,
    childminders: merged.childminders,
  });
  return {
    packsFailed: merged.packsFailed,
    packsLoaded: merged.packsLoaded,
    readyCount: ready.length,
  };
}

export function CompareLoader({ intro }: { intro?: ReactNode }) {
  const [index, setIndex] = useState<SchoolsIndex | null>(null);
  const [eyIndex, setEyIndex] = useState<EyProvidersIndex | null>(null);
  const [childmindersIndex, setChildmindersIndex] =
    useState<ChildmindersIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [packPhase, setPackPhase] = useState<PackPhase>("idle");
  const [packNote, setPackNote] = useState<string | null>(null);

  const applySeed = useCallback(
    (seed: {
      schools: SchoolsIndex;
      ey: EyProvidersIndex | null;
      childminders: ChildmindersIndex | null;
    }) => {
      setIndex(seed.schools);
      setEyIndex(seed.ey);
      setChildmindersIndex(seed.childminders);
      setError(null);
    },
    [],
  );

  const finishPacks = useCallback(
    (result: {
      packsFailed: number;
      packsLoaded: number;
      readyCount: number;
    }) => {
      if (result.readyCount === 0) {
        setPackPhase("ready");
        setPackNote(null);
        return;
      }
      if (result.packsFailed > 0) {
        setPackPhase("partial");
        setPackNote(
          `Loaded ${result.packsLoaded} of ${result.readyCount} area packs. Retry if your area is missing.`,
        );
        return;
      }
      setPackPhase("ready");
      setPackNote(null);
    },
    [],
  );

  const reloadIndex = useCallback(async () => {
    setPackPhase("loading");
    setPackNote("Refreshing school data…");
    try {
      const result = await progressiveLoad(
        fetch,
        true,
        applySeed,
        setPackNote,
      );
      finishPacks(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load school data",
      );
      setPackPhase("idle");
      setPackNote(null);
      throw err;
    }
  }, [applySeed, finishPacks]);

  useEffect(() => {
    let cancelled = false;
    const cacheBust = reloadToken > 0;

    setPackPhase("loading");
    progressiveLoad(
      fetch,
      cacheBust,
      (seed) => {
        if (!cancelled) applySeed(seed);
      },
      (note) => {
        if (!cancelled) setPackNote(note);
      },
    )
      .then((result) => {
        if (!cancelled) finishPacks(result);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Could not load school data");
          setPackPhase("idle");
          setPackNote(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken, applySeed, finishPacks]);

  if (error && !index) {
    return (
      <div className="harbour-band">
        {intro}
        <div className="hero-controls">
          <div className="shell hero-inner">
            <p className="postcode-error" role="alert">
              {error}
            </p>
            <p className="hint">
              On a slow connection this can time out before the first file
              finishes. Wait a moment and try again — Hampshire data alone is
              enough to start.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setError(null);
                setReloadToken((n) => n + 1);
              }}
            >
              Retry loading data
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="harbour-band">
        {intro}
        <div className="hero-controls">
          <div className="shell hero-inner">
            <p>Loading school and early-years data…</p>
            <p className="hint">
              First load brings Hampshire; other areas follow in the background.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {packPhase === "loading" || packPhase === "partial" ? (
        <div className="data-load-banner" role="status" aria-live="polite">
          <div className="shell data-load-banner-inner">
            <p>
              {packNote ||
                (packPhase === "loading"
                  ? "Loading wider area coverage…"
                  : "Some area packs did not finish loading.")}
            </p>
            {packPhase === "partial" ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  void reloadIndex().catch(() => {
                    /* error state set inside reloadIndex */
                  });
                }}
              >
                Retry packs
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <JourneyChapterProvider>
        <CompareApp
          index={index}
          eyIndex={eyIndex}
          childmindersIndex={childmindersIndex}
          onIndexReload={reloadIndex}
          intro={intro}
        />
      </JourneyChapterProvider>
    </>
  );
}
