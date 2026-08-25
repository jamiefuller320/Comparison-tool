"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import { loadSeedIndexes } from "@/lib/collateIndexes";
import {
  ensureAreaCoverageForDistrict,
  ensureAreaCoverageForUrns,
} from "@/lib/ensureAreaCoverage";
import { CompareApp } from "@/components/CompareApp";
import { JourneyChapterProvider } from "@/components/JourneyChapterContext";
import { HarbourSetupPortal } from "@/components/HarbourBand";

type PackPhase = "idle" | "loading" | "ready" | "partial";

/**
 * Seed-first load only. Wider LA packs arrive geo-lazily via
 * ensureAreaCoverage (postcode district + neighbours, or share-link URNs).
 */
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
  onNote(null);
  return { packsFailed: 0, packsLoaded: 0, readyCount: 0 };
}

export function CompareLoader() {
  const [index, setIndex] = useState<SchoolsIndex | null>(null);
  const [eyIndex, setEyIndex] = useState<EyProvidersIndex | null>(null);
  const [childmindersIndex, setChildmindersIndex] =
    useState<ChildmindersIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [packPhase, setPackPhase] = useState<PackPhase>("idle");
  const [packNote, setPackNote] = useState<string | null>(null);
  const indexesRef = useRef({
    schools: null as SchoolsIndex | null,
    ey: null as EyProvidersIndex | null,
    childminders: null as ChildmindersIndex | null,
  });
  indexesRef.current = {
    schools: index,
    ey: eyIndex,
    childminders: childmindersIndex,
  };

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

  const ensureAreaCoverage = useCallback(
    async (adminDistrict?: string | null) => {
      const current = indexesRef.current;
      if (!adminDistrict?.trim() || !current.schools) return;
      try {
        setPackPhase("loading");
        const result = await ensureAreaCoverageForDistrict(
          {
            schools: current.schools,
            ey: current.ey,
            childminders: current.childminders,
          },
          adminDistrict,
          fetch,
          true,
        );
        if (!result?.loadedLabels?.length) {
          setPackPhase("ready");
          return;
        }
        const label =
          result.loadedLabels.length === 1
            ? result.loadedLabels[0]
            : `${result.loadedLabels.length} nearby areas`;
        setPackNote(`Added ${label} to the map…`);
        applySeed(result.next);
        setPackPhase("ready");
        window.setTimeout(() => {
          setPackNote((note) =>
            note?.startsWith("Added ") ? null : note,
          );
        }, 2400);
      } catch {
        setPackPhase("ready");
        /* Soft-fail — Finder still uses whatever is already collated. */
      }
    },
    [applySeed],
  );

  const ensureUrnCoverage = useCallback(
    async (urns: string[]) => {
      const current = indexesRef.current;
      if (!urns.length || !current.schools) return;
      try {
        setPackPhase("loading");
        const result = await ensureAreaCoverageForUrns(
          {
            schools: current.schools,
            ey: current.ey,
            childminders: current.childminders,
          },
          urns,
          fetch,
          true,
        );
        if (!result?.loadedLabels?.length) {
          setPackPhase("ready");
          return;
        }
        setPackNote(
          `Loaded ${result.loadedLabels.join(", ")} for your shortlist…`,
        );
        applySeed(result.next);
        setPackPhase("ready");
        window.setTimeout(() => {
          setPackNote((note) =>
            note?.startsWith("Loaded ") ? null : note,
          );
        }, 2400);
      } catch {
        setPackPhase("ready");
      }
    },
    [applySeed],
  );

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
      <HarbourSetupPortal active>
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
      </HarbourSetupPortal>
    );
  }

  if (!index) {
    return (
      <HarbourSetupPortal active>
        <div className="hero-controls">
          <div className="shell hero-inner">
            <p>Loading school and early-years data…</p>
            <p className="hint">
              First load brings Hampshire; nearby area packs load when you set a
              home postcode.
            </p>
          </div>
        </div>
      </HarbourSetupPortal>
    );
  }

  return (
    <>
      {packPhase === "loading" || packPhase === "partial" || packNote ? (
        <div className="data-load-banner" role="status" aria-live="polite">
          <div className="shell data-load-banner-inner">
            <p>
              {packNote ||
                (packPhase === "loading"
                  ? "Loading nearby area coverage…"
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
          onEnsureAreaCoverage={ensureAreaCoverage}
          onEnsureUrnCoverage={ensureUrnCoverage}
        />
      </JourneyChapterProvider>
    </>
  );
}
