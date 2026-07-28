"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolRecord,
  SchoolsIndex,
} from "@/lib/types";
import { SchoolSearch } from "@/components/SchoolSearch";
import { ComparisonBoard } from "@/components/ComparisonBoard";
import { IndependentComparisonBoard } from "@/components/IndependentComparisonBoard";
import { PhonicsComparisonBoard } from "@/components/PhonicsComparisonBoard";
import { EarlyYearsComparisonBoard } from "@/components/EarlyYearsComparisonBoard";
import { EyfspComparisonBoard } from "@/components/EyfspComparisonBoard";
import { ChildminderDirectoryBoard } from "@/components/ChildminderDirectoryBoard";
import { ChildminderVettingChecklist } from "@/components/ChildminderVettingChecklist";
import { VisitPack } from "@/components/VisitPack";
import { SelectedChips, SuggestAlternatives } from "@/components/SelectedChips";
import { HomePostcodeExplorer } from "@/components/HomePostcodeExplorer";
import { ComparePathTabs } from "@/components/ComparePathTabs";
import { MissingSchoolButton } from "@/components/MissingSchoolButton";
import {
  ACTIVE_PACK_STORAGE_KEY,
  type SchoolsIndexWithPack,
} from "@/lib/laPacks";
import { ProductTour } from "@/components/ProductTour";
import { headlineForParents, suggestAlternatives } from "@/lib/compare";
import {
  listAvailableComparePaths,
  pathsWithShortlistItems,
  pickDefaultComparePath,
  type ComparePathId,
} from "@/lib/comparePaths";
import {
  isChildminder,
  isEyComparable,
  isEyProvider,
} from "@/lib/eyMetrics";
import { SEED_GEOGRAPHY_LABEL } from "@/lib/seedScope";
import {
  DEFAULT_PHASES,
  defaultPhasesForSectors,
  migrateStagesFromLegacyEySettings,
  normalizePhaseIds,
  schoolMatchesPhases,
  schoolOffersKs1,
  schoolOffersKs2,
  schoolOffersSecondary,
  schoolStageIds,
  wantsChildminders,
  wantsEarlyYearsOnlyNotice,
  wantsEyMetrics,
  wantsKs1Metrics,
  wantsKs2Metrics,
  wantsKs4Metrics,
  type PhaseId,
} from "@/lib/phases";
import {
  DEFAULT_SECTORS,
  normalizeSectorIds,
  resolveSchoolSector,
  schoolMatchesSectors,
  type SectorId,
} from "@/lib/sectors";
import {
  childminderConsentStamp,
  eyfspStamp,
  ks2TablesStamp,
  ks4TablesStamp,
  ofstedChildcareStamp,
  ofstedStateStamp,
  phonicsStamp,
} from "@/lib/sourceStamp";

function parseStagesParam(raw: string | null): PhaseId[] {
  if (!raw) return DEFAULT_PHASES;
  const parsed = normalizePhaseIds(raw.split(","));
  return parsed.length ? parsed : DEFAULT_PHASES;
}

function parseSectorsParam(raw: string | null): SectorId[] {
  if (!raw) return DEFAULT_SECTORS;
  const parsed = normalizeSectorIds(raw.split(","));
  return parsed.length ? parsed : DEFAULT_SECTORS;
}

function PathSummaries({
  schools,
  englandRwm,
  indieBench,
  stateKs4Bench,
  preferKs4,
  pending,
}: {
  schools: SchoolRecord[];
  englandRwm?: number | null;
  indieBench?: SchoolsIndex["benchmarks"]["independent"];
  stateKs4Bench?: SchoolsIndex["benchmarks"]["stateKs4"];
  preferKs4?: boolean;
  pending?: boolean;
}) {
  if (!schools.length) return null;
  return (
    <div className="shortlist-summaries path-summaries" aria-live="polite">
      {schools.map((school, i) => (
        <p className="footnote shortlist-summary" key={school.urn}>
          <strong>{school.name}:</strong>{" "}
          {headlineForParents(school, englandRwm, indieBench, {
            preferKs4,
            stateKs4Bench,
          })}
          {pending && i === 0 ? " Updating…" : null}
        </p>
      ))}
    </div>
  );
}

export function CompareApp({
  index,
  eyIndex = null,
  childmindersIndex = null,
  onIndexReload,
}: {
  /** Hampshire seed with any ready area packs already merged in. */
  index: SchoolsIndex | SchoolsIndexWithPack;
  eyIndex?: EyProvidersIndex | null;
  childmindersIndex?: ChildmindersIndex | null;
  onIndexReload: () => Promise<void>;
}) {
  const collatedPackLabels =
    (index as SchoolsIndexWithPack).collatedPackLabels ?? [];

  const byUrn = useMemo(() => {
    const map = new Map(index.schools.map((s) => [s.urn, s]));
    for (const provider of eyIndex?.providers ?? []) {
      map.set(provider.urn, provider);
    }
    for (const provider of childmindersIndex?.providers ?? []) {
      map.set(provider.urn, provider);
    }
    return map;
  }, [index.schools, eyIndex, childmindersIndex]);

  const [selected, setSelected] = useState<string[]>([]);
  const [stages, setStages] = useState<PhaseId[]>(DEFAULT_PHASES);
  const [sectors, setSectors] = useState<SectorId[]>(DEFAULT_SECTORS);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  const [sectorNote, setSectorNote] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<ComparePathId | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("schools") || params.get("urns");
    if (raw) {
      const urns = raw
        .split(",")
        .map((u) => u.trim())
        .filter((u) => byUrn.has(u))
        .slice(0, 4);
      if (urns.length) setSelected(urns);
    }
    const baseStages = parseStagesParam(
      params.get("stages") || params.get("phase"),
    );
    setStages(
      migrateStagesFromLegacyEySettings(
        baseStages,
        params.get("eySettings") || params.get("ey"),
      ),
    );
    setSectors(
      parseSectorsParam(params.get("sectors") || params.get("sector")),
    );
    setHydrated(true);
  }, [byUrn]);

  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (selected.length) url.searchParams.set("schools", selected.join(","));
    else url.searchParams.delete("schools");
    url.searchParams.set("stages", stages.join(","));
    if (
      sectors.length === DEFAULT_SECTORS.length &&
      sectors[0] === DEFAULT_SECTORS[0]
    ) {
      url.searchParams.delete("sectors");
    } else {
      url.searchParams.set("sectors", sectors.join(","));
    }
    // Legacy ?pack= from older builds — packs are no longer a user mode.
    url.searchParams.delete("pack");
    url.searchParams.delete("eySettings");
    url.searchParams.delete("ey");
    window.history.replaceState({}, "", url.toString());
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_PACK_STORAGE_KEY);
    }
  }, [selected, stages, sectors, hydrated]);

  const selectedSchools: SchoolRecord[] = selected
    .map((urn) => byUrn.get(urn))
    .filter((s): s is SchoolRecord => Boolean(s));

  const showEy = wantsEyMetrics(stages);
  const showChildminderCategory = wantsChildminders(stages);
  const hasEyData = Boolean(eyIndex?.providers?.length);
  const showKs1 = wantsKs1Metrics(stages);
  const showKs2 = wantsKs2Metrics(stages);
  const showKs4 = wantsKs4Metrics(stages);
  const showEarlyNotice = wantsEarlyYearsOnlyNotice(stages, hasEyData);

  const eySelected = selectedSchools.filter(
    (s) => showEy && isEyComparable(s),
  );
  const childminderSelected = selectedSchools.filter(
    (s) => showChildminderCategory && isChildminder(s),
  );
  const ks1Selected = selectedSchools.filter(
    (s) =>
      showKs1 &&
      resolveSchoolSector(s) === "state" &&
      schoolOffersKs1(s),
  );
  const ks2Selected = selectedSchools.filter(
    (s) =>
      showKs2 &&
      resolveSchoolSector(s) === "state" &&
      schoolOffersKs2(s),
  );
  const ks4Selected = selectedSchools.filter(
    (s) => showKs4 && schoolOffersSecondary(s),
  );
  const showPhonicsBoard = showKs1 && Boolean(index.benchmarks.phonics);
  const hasChildminders = Boolean(childmindersIndex?.providers?.length);
  const hasStateEyOfsted = Boolean(index.stats.ofstedStateAsAt);
  const showEyNurseryBoards = showEy && (hasEyData || hasStateEyOfsted);
  const showChildminderBoards = showChildminderCategory && hasChildminders;

  const availablePaths = useMemo(
    () =>
      listAvailableComparePaths({
        showEyNurseryBoards,
        showChildminderBoards,
        showKs1,
        showKs2,
        showKs4,
      }),
    [showEyNurseryBoards, showChildminderBoards, showKs1, showKs2, showKs4],
  );

  const shortlistPaths = useMemo(
    () =>
      pathsWithShortlistItems({
        hasEyShortlist: eySelected.length > 0,
        hasChildminderShortlist: childminderSelected.length > 0,
        hasKs1Shortlist: ks1Selected.length > 0,
        hasKs2Shortlist: ks2Selected.length > 0,
        hasKs4Shortlist: ks4Selected.length > 0,
      }),
    [
      eySelected.length,
      childminderSelected.length,
      ks1Selected.length,
      ks2Selected.length,
      ks4Selected.length,
    ],
  );

  useEffect(() => {
    if (!availablePaths.length) {
      setActivePath(null);
      return;
    }
    setActivePath((prev) => {
      if (prev && availablePaths.includes(prev)) return prev;
      return pickDefaultComparePath(availablePaths, shortlistPaths);
    });
  }, [availablePaths, shortlistPaths]);

  const ks4AllIndie =
    ks4Selected.length > 0 &&
    ks4Selected.every((s) => resolveSchoolSector(s) === "independent");
  const ks4Bench = ks4AllIndie
    ? index.benchmarks.independent
    : (index.benchmarks.stateKs4 ?? index.benchmarks.independent);
  const ks4BenchLabel = ks4AllIndie ? "Indie mean" : "State mean";

  const focus = selectedSchools[0];
  const suggestions = useMemo(() => {
    if (!focus) return [];
    const pool = [
      ...(showEy && eyIndex ? eyIndex.providers : []),
      ...(showChildminderCategory && childmindersIndex
        ? childmindersIndex.providers
        : []),
      ...index.schools,
    ];
    return suggestAlternatives(focus, pool, 6, stages, sectors).filter(
      (s) => !selected.includes(s.urn),
    );
  }, [
    focus,
    index.schools,
    eyIndex,
    childmindersIndex,
    showEy,
    showChildminderCategory,
    selected,
    stages,
    sectors,
  ]);

  function addSchool(urn: string) {
    startTransition(() => {
      setSelected((prev) => {
        if (prev.includes(urn) || prev.length >= 4) return prev;
        return [...prev, urn];
      });
    });
  }

  function toggleSchool(urn: string) {
    startTransition(() => {
      setSelected((prev) => {
        if (prev.includes(urn)) return prev.filter((u) => u !== urn);
        if (prev.length >= 4) return prev;
        return [...prev, urn];
      });
    });
  }

  function removeSchool(urn: string) {
    startTransition(() => {
      setSelected((prev) => prev.filter((u) => u !== urn));
    });
  }

  function changeStages(next: PhaseId[]) {
    startTransition(() => setStages(next));
    setSelected((prev) => {
      const kept = prev.filter((urn) => {
        const school = byUrn.get(urn);
        if (!school) return false;
        if (isEyProvider(school) && !wantsEyMetrics(next)) return false;
        if (isChildminder(school) && !wantsChildminders(next)) return false;
        return true;
      });
      const removed = prev.length - kept.length;
      if (removed > 0) {
        setSectorNote(
          removed === 1
            ? "Removed 1 setting from your shortlist that sits outside the selected categories."
            : `Removed ${removed} settings from your shortlist that sit outside the selected categories.`,
        );
      } else {
        setSectorNote(null);
      }
      return kept;
    });
  }

  function changeSectors(next: SectorId[]) {
    setSectors(next);

    const stageDefault = defaultPhasesForSectors(next);
    if (stageDefault) setStages(stageDefault);

    setSelected((prev) => {
      const kept = prev.filter((urn) => {
        const school = byUrn.get(urn);
        if (!school) return false;
        if (isEyProvider(school) && wantsEyMetrics(stages)) return true;
        if (isChildminder(school) && wantsChildminders(stages)) return true;
        return schoolMatchesSectors(school, next);
      });
      const removed = prev.length - kept.length;
      if (removed > 0) {
        const label =
          next.length === 1 && next[0] === "independent"
            ? "independent"
            : next.length === 1 && next[0] === "state"
              ? "state"
              : "selected";
        setSectorNote(
          removed === 1
            ? `Removed 1 school from your shortlist that sits outside the ${label} filter.`
            : `Removed ${removed} schools from your shortlist that sit outside the ${label} filter.`,
        );
      } else {
        setSectorNote(null);
      }
      return kept;
    });
  }

  /** Stage + sector filter for search / shortlist building. */
  const filteredSchools = useMemo(() => {
    const schoolStages = schoolStageIds(stages);
    const fromSchools =
      schoolStages.length === 0
        ? []
        : index.schools.filter(
            (s) =>
              schoolMatchesPhases(s, stages) &&
              schoolMatchesSectors(s, sectors),
          );
    const seen = new Set(fromSchools.map((s) => s.urn));
    const extra = [
      ...(wantsEyMetrics(stages) ? (eyIndex?.providers ?? []) : []),
      ...(wantsChildminders(stages)
        ? (childmindersIndex?.providers ?? [])
        : []),
    ].filter((p) => !seen.has(p.urn));
    if (!extra.length) return fromSchools;
    return [...extra, ...fromSchools];
  }, [index.schools, eyIndex, childmindersIndex, stages, sectors]);

  /**
   * Map shows the full collated school option set for the selected sector(s),
   * across stages — packs are already merged into `index`. Directory categories
   * (EY / childminders) still follow the stage chips.
   */
  const mapSchools = useMemo(() => {
    const fromSchools = index.schools.filter((s) =>
      schoolMatchesSectors(s, sectors),
    );
    const seen = new Set(fromSchools.map((s) => s.urn));
    const extra = [
      ...(wantsEyMetrics(stages) ? (eyIndex?.providers ?? []) : []),
      ...(wantsChildminders(stages)
        ? (childmindersIndex?.providers ?? [])
        : []),
    ].filter((p) => !seen.has(p.urn));
    if (!extra.length) return fromSchools;
    return [...extra, ...fromSchools];
  }, [index.schools, eyIndex, childmindersIndex, stages, sectors]);

  const summaryOpts = {
    englandRwm: index.benchmarks.england.rwmExpected,
    indieBench: index.benchmarks.independent,
    stateKs4Bench: index.benchmarks.stateKs4,
    preferKs4: showKs4 && !showKs2,
    pending,
  };

  const ks2Stamp = ks2TablesStamp({
    period: index.period,
    primarySite: index.source.primarySite,
    generatedAt: index.generatedAt,
  });
  const ks4Stamp = ks4TablesStamp({
    period: index.stats.ks4Period || index.benchmarks.stateKs4?.period || index.period,
    ks5Period: index.stats.ks5Period || index.benchmarks.stateKs4?.ks5Period,
    datasetId: index.source.datasets.ks4SchoolPerformance,
    generatedAt: index.generatedAt,
  });
  const phonicsSourceStamp = phonicsStamp({
    period: index.benchmarks.phonics?.period || index.stats.phonicsPeriod,
    datasetId: index.source.datasets.phonicsByRegionAndLa,
  });
  const eyfspSourceStamp = eyfspStamp({
    period: eyIndex?.benchmarks.eyfsp?.period,
    sourceUrl: eyIndex?.benchmarks.eyfsp?.sourceUrl,
  });
  const childcareOfstedStamp = ofstedChildcareStamp({
    asAt: eyIndex?.ofstedAsAt,
    sourcePage: eyIndex?.source.ofstedChildcareMiPage,
  });
  const stateOfstedStamp = ofstedStateStamp({
    asAt: index.stats.ofstedStateAsAt,
    sourcePage: index.source.datasets.ofstedStateSchoolsMi,
  });
  const childminderStamp = childminderConsentStamp({
    consentedAsAt: childmindersIndex?.consentedAsAt,
    ofstedAsAt: childmindersIndex?.ofstedAsAt,
    sourcePage: childmindersIndex?.source.consentedAddressesPage,
  });

  function renderActivePath() {
    if (!activePath) {
      if (selectedSchools.length === 0) {
        return (
          <div className="empty-compare">
            Add two to four settings from the map or search to compare.
          </div>
        );
      }
      return (
        <div className="empty-compare" role="status">
          Turn on a category above (Early years, Childminders, or a school
          stage) to see the matching comparison.
        </div>
      );
    }

    if (activePath === "early-years") {
      return (
        <div data-tour="boards-early-years">
          {showEarlyNotice ? (
            <div className="empty-compare" role="status">
              Early years pack missing from this build. Re-run{" "}
              <code>npm run harvest:ey</code> and{" "}
              <code>npm run enrich:ey-schools</code>, or pick another category.
            </div>
          ) : null}
          <PathSummaries schools={eySelected} {...summaryOpts} />
          {hasEyData ? (
            <EyfspComparisonBoard
              eyfsp={eyIndex?.benchmarks.eyfsp}
              sourceStamp={eyfspSourceStamp}
            />
          ) : null}
          {eySelected.length > 0 ? (
            <div style={{ marginTop: hasEyData ? "1.5rem" : 0 }}>
              <h3 className="compare-subhead">Ofsted comparison</h3>
              <EarlyYearsComparisonBoard
                providers={eySelected}
                childcareOfstedAsAt={eyIndex?.ofstedAsAt}
                stateOfstedAsAt={index.stats.ofstedStateAsAt}
                childcareSourcePage={eyIndex?.source.ofstedChildcareMiPage}
                stateSourcePage={index.source.datasets.ofstedStateSchoolsMi}
                childcareStamp={childcareOfstedStamp}
                stateStamp={stateOfstedStamp}
              />
            </div>
          ) : selectedSchools.length > 0 ? (
            <div
              className="empty-compare"
              role="status"
              style={{ marginTop: "1rem" }}
            >
              Shortlist a {SEED_GEOGRAPHY_LABEL} nursery or school early-years
              setting to compare Ofsted grades here.
            </div>
          ) : (
            <div className="empty-compare">
              Add a nursery from the map or search to compare Ofsted grades.
            </div>
          )}
          {eySelected.length > 0 ? (
            <div style={{ marginTop: "1.75rem" }}>
              <VisitPack nurseries={eySelected} childminders={[]} />
            </div>
          ) : null}
        </div>
      );
    }

    if (activePath === "childminders") {
      return (
        <div data-tour="childminders">
          <PathSummaries schools={childminderSelected} {...summaryOpts} />
          <p className="footnote" style={{ marginBottom: "1rem" }}>
            Wrap-around and home-based care — directory and checklist, not the
            nursery Ofsted table.
          </p>
          {childminderSelected.length > 0 ? (
            <ChildminderDirectoryBoard
              providers={childminderSelected}
              consentedAsAt={childmindersIndex?.consentedAsAt}
              sourceStamp={childminderStamp}
            />
          ) : (
            <div className="empty-compare" role="status">
              Shortlist a consented {SEED_GEOGRAPHY_LABEL} childminder to pin
              their address and Ofsted report here.
            </div>
          )}
          {childminderSelected.length > 0 ? (
            <>
              <div style={{ marginTop: "1.5rem" }}>
                <ChildminderVettingChecklist
                  consentedAsAt={childmindersIndex?.consentedAsAt}
                  sourcePage={
                    childmindersIndex?.source.consentedAddressesPage
                  }
                  providerCount={childmindersIndex?.stats.providerCount}
                />
              </div>
              <div style={{ marginTop: "1.75rem" }}>
                <VisitPack nurseries={[]} childminders={childminderSelected} />
              </div>
            </>
          ) : null}
        </div>
      );
    }

    if (activePath === "ks1") {
      return (
        <div>
          <PathSummaries schools={ks1Selected} {...summaryOpts} />
          {!showPhonicsBoard ? (
            <div className="empty-compare" role="status">
              Phonics benchmarks missing. Re-run{" "}
              <code>npm run enrich:phonics</code>, or open another path.
            </div>
          ) : ks1Selected.length === 0 ? (
            <div className="empty-compare" role="status">
              Add a state infant or primary for local-authority phonics context.
            </div>
          ) : (
            <PhonicsComparisonBoard
              schools={ks1Selected}
              phonics={index.benchmarks.phonics}
              sourceStamp={phonicsSourceStamp}
            />
          )}
        </div>
      );
    }

    if (activePath === "ks2") {
      return (
        <div>
          {ks2Selected.length > 0 ? (
            <aside className="year-trend-tip" data-tour="year-trend">
              <strong>Year trends:</strong> click a measure name (or{" "}
              <em>Year trend</em>) for a year-by-year graph — schools and
              England, with a hatched band for COVID years when tables were
              unpublished.
            </aside>
          ) : null}
          <PathSummaries schools={ks2Selected} {...summaryOpts} />
          {ks2Selected.length === 0 ? (
            <div className="empty-compare" role="status">
              Add a state primary or junior with Year 6 tables to compare KS2.
            </div>
          ) : (
            <ComparisonBoard
              schools={ks2Selected}
              england={index.benchmarks.england}
              sourceStamp={ks2Stamp}
            />
          )}
        </div>
      );
    }

    // ks4
    return (
      <div>
        <PathSummaries
          schools={ks4Selected}
          {...summaryOpts}
          preferKs4
        />
        {ks4Selected.length === 0 ? (
          <div className="empty-compare" role="status">
            Add a secondary or 16–18 setting for GCSE / A-level tables.
          </div>
        ) : (
          <IndependentComparisonBoard
            schools={ks4Selected}
            benchmark={ks4Bench}
            benchmarkLabel={ks4BenchLabel}
            sourceStamp={ks4Stamp}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <ProductTour />
      <HomePostcodeExplorer
        schools={mapSchools}
        selectedUrns={selected}
        onToggle={toggleSchool}
        stageFilter={stages}
        onStageFilterChange={changeStages}
        sectorFilter={sectors}
        onSectorFilterChange={changeSectors}
        mapIgnoresStageFilter
      />

      <section className="section" id="compare">
        <div className="shell">
          <div className="section-head">
            <h2>Build your shortlist</h2>
            <p>
              Tick settings on the map, or search below. Stages and school type
              stay in the hero above.
            </p>
            <p className="footnote data-slim-line">
              {SEED_GEOGRAPHY_LABEL} maintained set
              {collatedPackLabels.length
                ? ` · also collated: ${collatedPackLabels.join(", ")}`
                : ""}{" "}
              · {index.period} · refreshed {index.generatedAt}
            </p>
          </div>

          <MissingSchoolButton
            schools={index.schools}
            onIndexReload={onIndexReload}
          />

          <SchoolSearch
            key={`search-${stages.join("-")}-${sectors.join("-")}`}
            schools={filteredSchools}
            selectedUrns={selected}
            onAdd={addSchool}
            stageFilter={stages}
            sectorFilter={sectors}
          />
          <SelectedChips schools={selectedSchools} onRemove={removeSchool} />

          {sectorNote ? (
            <p className="footnote sector-prune-note" role="status">
              {sectorNote}
            </p>
          ) : null}
        </div>
      </section>

      <section
        className="section"
        id="side-by-side"
        data-tour="boards"
        style={{ paddingTop: 0 }}
      >
        <div className="shell">
          <div className="section-head">
            <h2>Side by side</h2>
            <p>
              One path at a time
              {availablePaths.length > 1
                ? " — switch tabs when several categories are on"
                : null}
              . Patterns to visit on, not a final verdict.
            </p>
          </div>

          {activePath ? (
            <ComparePathTabs
              available={availablePaths}
              active={activePath}
              onChange={setActivePath}
              withShortlist={shortlistPaths}
            />
          ) : null}

          {renderActivePath()}
        </div>
      </section>

      {suggestions.length > 0 ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="shell">
            <div className="section-head">
              <h2>Other schools you might weigh</h2>
              <p>
                Same area or authority, overlapping stages, similar cohort —
                ordered toward stronger published outcomes.
              </p>
            </div>
            <SuggestAlternatives suggestions={suggestions} onAdd={addSchool} />
          </div>
        </section>
      ) : null}
    </>
  );
}
