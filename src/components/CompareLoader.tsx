"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import { loadSeedIndexes, type SeedIndexes } from "@/lib/collateIndexes";
import {
  ensureAreaCoverageForDistrict,
  ensureAreaCoverageForUrns,
} from "@/lib/ensureAreaCoverage";
import { homepageSearchNeedsSeed } from "@/lib/homepageSeed";
import { CompareApp } from "@/components/CompareApp";
import { JourneyChapterProvider } from "@/components/JourneyChapterContext";

type PackPhase = "idle" | "loading" | "ready" | "partial";

/**
 * Lets the setup form paint before Hampshire / early years / childminder
 * indexes are downloaded. Not stored as the live index.
 */
const PENDING_INDEX: SchoolsIndex = {
  generatedAt: "",
  period: "",
  source: { api: "", datasets: {}, primarySite: "", note: "" },
  benchmarks: { england: {}, localAuthorities: {} },
  schools: [],
  stats: { schoolCount: 0, withRwm: 0, localAuthorityCount: 0 },
};

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
  const seedPromiseRef = useRef<Promise<SeedIndexes> | null>(null);
  indexesRef.current = {
    schools: index,
    ey: eyIndex,
    childminders: childmindersIndex,
  };

  const applySeed = useCallback((seed: SeedIndexes) => {
    indexesRef.current = {
      schools: seed.schools,
      ey: seed.ey,
      childminders: seed.childminders,
    };
    setIndex(seed.schools);
    setEyIndex(seed.ey);
    setChildmindersIndex(seed.childminders);
    setError(null);
  }, []);

  const ensureSeed = useCallback(
    (cacheBust: boolean) => {
      if (seedPromiseRef.current && !cacheBust) return seedPromiseRef.current;
      setPackPhase("loading");
      setPackNote(
        cacheBust ? "Refreshing school data…" : "Loading Hampshire seed…",
      );
      const promise = loadSeedIndexes(fetch, cacheBust)
        .then((seed) => {
          applySeed(seed);
          setPackPhase("ready");
          setPackNote(null);
          return seed;
        })
        .catch((err: unknown) => {
          seedPromiseRef.current = null;
          setError(
            err instanceof Error ? err.message : "Could not load school data",
          );
          setPackPhase("idle");
          setPackNote(null);
          throw err;
        });
      seedPromiseRef.current = promise;
      return promise;
    },
    [applySeed],
  );

  const reloadIndex = useCallback(async () => {
    seedPromiseRef.current = null;
    await ensureSeed(true);
  }, [ensureSeed]);

  const ensureAreaCoverage = useCallback(
    async (adminDistrict?: string | null) => {
      let seed: SeedIndexes;
      try {
        seed = await ensureSeed(false);
      } catch {
        return;
      }
      const current = indexesRef.current.schools ? indexesRef.current : seed;
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
          setPackNote((note) => (note?.startsWith("Added ") ? null : note));
        }, 2400);
      } catch {
        setPackPhase("ready");
        /* Soft-fail — Finder still uses whatever is already collated. */
      }
    },
    [applySeed, ensureSeed],
  );

  const ensureUrnCoverage = useCallback(
    async (urns: string[]) => {
      if (!urns.length) return;
      let seed: SeedIndexes;
      try {
        seed = await ensureSeed(false);
      } catch {
        return;
      }
      const current = indexesRef.current.schools ? indexesRef.current : seed;
      if (!current.schools) return;
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
          setPackNote((note) => (note?.startsWith("Loaded ") ? null : note));
        }, 2400);
      } catch {
        setPackPhase("ready");
      }
    },
    [applySeed, ensureSeed],
  );

  useEffect(() => {
    const cacheBust = reloadToken > 0;
    if (!cacheBust && !homepageSearchNeedsSeed(window.location.search)) return;
    void ensureSeed(cacheBust).catch(() => {
      /* error state set inside ensureSeed */
    });
  }, [reloadToken, ensureSeed]);

  const showBanner =
    Boolean(error) ||
    packPhase === "loading" ||
    packPhase === "partial" ||
    Boolean(packNote);

  return (
    <>
      {showBanner ? (
        <div className="data-load-banner" role="status" aria-live="polite">
          <div className="shell data-load-banner-inner">
            <p>
              {error ||
                packNote ||
                (packPhase === "loading"
                  ? "Loading nearby area coverage…"
                  : "Some area packs did not finish loading.")}
            </p>
            {error || packPhase === "partial" ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setError(null);
                  void reloadIndex().catch(() => {
                    /* error state set inside ensureSeed */
                  });
                }}
              >
                {error ? "Retry loading data" : "Retry packs"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <JourneyChapterProvider>
        <CompareApp
          index={index ?? PENDING_INDEX}
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
