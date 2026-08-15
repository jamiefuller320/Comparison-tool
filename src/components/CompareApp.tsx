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
import { DecisionGuidancePanel } from "@/components/DecisionGuidance";
import { SelectedChips, SuggestAlternatives } from "@/components/SelectedChips";
import { ShareShortlistButton } from "@/components/ShareShortlistButton";
import { ShortlistDock } from "@/components/ShortlistDock";
import { SaveShortlistPrompt } from "@/components/SaveShortlistPrompt";
import { RestoreShortlistBanner } from "@/components/RestoreShortlistBanner";
import { useAccount } from "@/components/AccountProvider";
import { HomePostcodeExplorer } from "@/components/HomePostcodeExplorer";
import { useJourneyChapter } from "@/components/JourneyChapterContext";
import { RESTORE_SHORTLIST_EVENT } from "@/lib/account";
import { DECISION_GUIDANCE } from "@/lib/decisionGuidance";
import { ComparePathTabs } from "@/components/ComparePathTabs";
import { MissingSchoolButton } from "@/components/MissingSchoolButton";
import {
  ACTIVE_PACK_STORAGE_KEY,
  type SchoolsIndexWithPack,
} from "@/lib/laPacks";
import { ProductTour } from "@/components/ProductTour";
import { ProductFeedbackPrompt } from "@/components/ProductFeedbackPrompt";
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
import { passesComparableKs4Filter } from "@/lib/dataGaps";
import {
  DEFAULT_PHASES,
  DEFAULT_STAGE_MATCH,
  defaultPhasesForSectors,
  migrateStagesFromLegacyEySettings,
  normalizePhaseIds,
  normalizeStageMatchMode,
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
  type StageMatchMode,
} from "@/lib/phases";
import {
  DEFAULT_SECTORS,
  normalizeSectorIds,
  resolveSchoolSector,
  schoolMatchesSectors,
  type SectorId,
} from "@/lib/sectors";
import {
  DEFAULT_PROVISION,
  normalizeProvisionFilter,
  schoolMatchesProvision,
  type ProvisionFilterId,
} from "@/lib/provisionFilter";
import { scrollToHomeSection } from "@/lib/inPageNav";
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
  const { chapter, setChapter } = useJourneyChapter();
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

  const account = useAccount();
  const [selected, setSelected] = useState<string[]>([]);
  const [stages, setStages] = useState<PhaseId[]>(DEFAULT_PHASES);
  const [stageMatch, setStageMatch] =
    useState<StageMatchMode>(DEFAULT_STAGE_MATCH);
  const [sectors, setSectors] = useState<SectorId[]>(DEFAULT_SECTORS);
  const [provision, setProvision] =
    useState<ProvisionFilterId>(DEFAULT_PROVISION);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  const [sectorNote, setSectorNote] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<ComparePathId | null>(null);
  /** When KS3/KS4 selected: hide secondaries without published Att8 from discovery. */
  const [comparableKs4Only, setComparableKs4Only] = useState(true);

  function applyRestoredShortlist(
    schools: string[],
    nextStages: string[],
    nextSectors: string[],
  ) {
    const urns = schools.filter((u) => byUrn.has(u)).slice(0, 4);
    setSelected(urns);
    const restoredStages = normalizePhaseIds(nextStages);
    if (restoredStages.length) setStages(restoredStages);
    const restoredSectors = normalizeSectorIds(nextSectors);
    if (restoredSectors.length) setSectors(restoredSectors);
  }

  useEffect(() => {
    function onRestoreRequest() {
      const pending = account.saved[0];
      if (!pending?.schools?.length) return;
      applyRestoredShortlist(
        pending.schools,
        pending.stages?.length ? pending.stages : [],
        pending.sectors?.length ? pending.sectors : [],
      );
    }
    window.addEventListener(RESTORE_SHORTLIST_EVENT, onRestoreRequest);
    return () => {
      window.removeEventListener(RESTORE_SHORTLIST_EVENT, onRestoreRequest);
    };
  }, [account.saved, byUrn]);

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
    setStageMatch(
      normalizeStageMatchMode(
        params.get("stagesMatch") || params.get("stageMatch"),
      ),
    );
    setProvision(
      normalizeProvisionFilter(
        params.get("provision") || params.get("specialist"),
      ),
    );
    setHydrated(true);
  }, [byUrn]);

  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (selected.length) url.searchParams.set("schools", selected.join(","));
    else url.searchParams.delete("schools");
    url.searchParams.set("stages", stages.join(","));
    if (stageMatch === DEFAULT_STAGE_MATCH) {
      url.searchParams.delete("stagesMatch");
    } else {
      url.searchParams.set("stagesMatch", stageMatch);
    }
    if (provision === DEFAULT_PROVISION) {
      url.searchParams.delete("provision");
    } else {
      url.searchParams.set("provision", provision);
    }
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
    url.searchParams.delete("stageMatch");
    url.searchParams.delete("specialist");
    window.history.replaceState({}, "", url.toString());
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_PACK_STORAGE_KEY);
    }
  }, [selected, stages, sectors, stageMatch, provision, hydrated]);

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
    return suggestAlternatives(focus, pool, 6, stages, sectors, stageMatch).filter(
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
    stageMatch,
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
    if (schoolStageIds(next).length < 2 && stageMatch !== DEFAULT_STAGE_MATCH) {
      setStageMatch(DEFAULT_STAGE_MATCH);
    }
    setSelected((prev) => {
      const matchMode =
        schoolStageIds(next).length < 2 ? DEFAULT_STAGE_MATCH : stageMatch;
      const kept = prev.filter((urn) => {
        const school = byUrn.get(urn);
        if (!school) return false;
        if (isEyProvider(school)) return wantsEyMetrics(next);
        if (isChildminder(school)) return wantsChildminders(next);
        if (!schoolStageIds(next).length) return false;
        return (
          schoolMatchesPhases(school, next, matchMode) &&
          schoolMatchesProvision(school, provision)
        );
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

  function changeStageMatch(next: StageMatchMode) {
    startTransition(() => setStageMatch(next));
    setSelected((prev) => {
      const kept = prev.filter((urn) => {
        const school = byUrn.get(urn);
        if (!school) return false;
        if (isEyProvider(school) || isChildminder(school)) return true;
        return schoolMatchesPhases(school, stages, next);
      });
      const removed = prev.length - kept.length;
      if (removed > 0) {
        setSectorNote(
          next === "all"
            ? removed === 1
              ? "Removed 1 school that does not cover every selected stage."
              : `Removed ${removed} schools that do not cover every selected stage.`
            : removed === 1
              ? "Removed 1 school outside the updated stage match."
              : `Removed ${removed} schools outside the updated stage match.`,
        );
      } else {
        setSectorNote(null);
      }
      return kept;
    });
  }

  function changeProvision(next: ProvisionFilterId) {
    startTransition(() => setProvision(next));
    setSelected((prev) => {
      const kept = prev.filter((urn) => {
        const school = byUrn.get(urn);
        if (!school) return false;
        if (isEyProvider(school) || isChildminder(school)) {
          return next !== "specialist";
        }
        return schoolMatchesProvision(school, next);
      });
      const removed = prev.length - kept.length;
      if (removed > 0) {
        setSectorNote(
          removed === 1
            ? "Removed 1 school from your shortlist that sits outside the specialist filter."
            : `Removed ${removed} schools from your shortlist that sit outside the specialist filter.`,
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

  /** Stage + sector + KS4 gates for discovery (provision applied in the map). */
  const discoveryPool = useMemo(() => {
    const schoolStages = schoolStageIds(stages);
    const secondaryStagesActive = wantsKs4Metrics(stages);
    const fromSchools =
      schoolStages.length === 0
        ? []
        : index.schools.filter(
            (s) =>
              schoolMatchesPhases(s, stages, stageMatch) &&
              schoolMatchesSectors(s, sectors) &&
              passesComparableKs4Filter(s, {
                comparableOnly: comparableKs4Only,
                secondaryStagesActive,
              }),
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
  }, [
    index.schools,
    eyIndex,
    childmindersIndex,
    stages,
    stageMatch,
    sectors,
    comparableKs4Only,
  ]);

  /** Search / shortlist pool — discovery plus provision filter. */
  const filteredSchools = useMemo(() => {
    return discoveryPool.filter((s) => {
      if (isEyProvider(s) || isChildminder(s)) {
        return provision !== "specialist";
      }
      return schoolMatchesProvision(s, provision);
    });
  }, [discoveryPool, provision]);

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
            Shortlist two to four nearby settings from the map or search, then
            turn on a category to compare published figures side by side.
          </div>
        );
      }
      return (
        <div className="empty-compare" role="status">
          You have a shortlist — turn on Early years, Childminders, or a school
          stage above to open the matching comparison board.
        </div>
      );
    }

    if (activePath === "early-years") {
      return (
        <div data-tour="boards-early-years">
          {showEarlyNotice ? (
            <div className="empty-compare" role="status">
              Early years data isn’t available in this build yet. Try another
              category, or check back after the next data refresh.
            </div>
          ) : null}
          <DecisionGuidancePanel path="early-years" />
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
              Your shortlist is schools without an early-years Ofsted row here
              (for example junior or secondary only). Add a nursery, or a school
              with nursery / reception, to compare inspection grades — the EYFSP
              area table above still gives local context.
            </div>
          ) : (
            <div className="empty-compare">
              Add a nursery or school nursery / reception setting from the map
              or search to compare Ofsted grades. Childminders use their own
              category.
            </div>
          )}
          {eySelected.length > 0 ? (
            <div style={{ marginTop: "1.75rem" }}>
              <VisitPack
                nurseries={eySelected}
                childminders={[]}
                stages={stages}
                sectors={sectors}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (activePath === "childminders") {
      return (
        <div data-tour="childminders">
          <DecisionGuidancePanel path="childminders" />
          <PathSummaries schools={childminderSelected} {...summaryOpts} />
          <p className="footnote" style={{ marginBottom: "1rem" }}>
            Wrap-around and home-based care — directory and checklist, not the
            nursery Ofsted table.
          </p>
          {childminderSelected.length > 0 ? (
            <ChildminderDirectoryBoard
              providers={childminderSelected}
              consentedAsAt={childmindersIndex?.consentedAsAt}
              ofstedAsAt={childmindersIndex?.ofstedAsAt}
              sourceStamp={childminderStamp}
            />
          ) : (
            <div className="empty-compare" role="status">
              Shortlist a consented childminder from the map or search to pin
              their published address and Ofsted report here. Coverage is not
              every registered childminder — only those who agreed to publish.
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
                <VisitPack
                  nurseries={[]}
                  childminders={childminderSelected}
                  stages={stages}
                  sectors={sectors}
                />
              </div>
            </>
          ) : null}
        </div>
      );
    }

    if (activePath === "ks1") {
      return (
        <div>
          <DecisionGuidancePanel path="ks1" />
          <PathSummaries schools={ks1Selected} {...summaryOpts} />
          {!showPhonicsBoard ? (
            <div className="empty-compare" role="status">
              Phonics benchmarks missing. Re-run{" "}
              <code>npm run enrich:phonics</code>, or open another path.
            </div>
          ) : ks1Selected.length === 0 ? (
            <div className="empty-compare" role="status">
              Add a state infant or primary to see local-authority phonics
              context. School-level phonics scores are not published — this board
              is area background for Year 1 choice, not a school league table.
            </div>
          ) : (
            <PhonicsComparisonBoard
              schools={ks1Selected}
              phonics={index.benchmarks.phonics}
              sourceStamp={phonicsSourceStamp}
            />
          )}
          {ks1Selected.length > 0 ? (
            <div style={{ marginTop: "1.75rem" }}>
              <VisitPack
                schools={ks1Selected}
                preferPath="ks1"
                stages={stages}
                sectors={sectors}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (activePath === "ks2") {
      return (
        <div>
          <DecisionGuidancePanel path="ks2" />
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
              Add a state primary or junior with Year 6 tables to compare reading,
              writing and maths. Independent prep schools usually have no
              comparable KS2 table figures here.
            </div>
          ) : (
            <ComparisonBoard
              schools={ks2Selected}
              england={index.benchmarks.england}
              sourceStamp={ks2Stamp}
            />
          )}
          {ks2Selected.length > 0 ? (
            <div style={{ marginTop: "1.75rem" }}>
              <VisitPack
                schools={ks2Selected}
                preferPath="ks2"
                stages={stages}
                sectors={sectors}
              />
            </div>
          ) : null}
        </div>
      );
    }

    // ks4
    return (
      <div>
        <DecisionGuidancePanel path="ks4" />
        <PathSummaries
          schools={ks4Selected}
          {...summaryOpts}
          preferKs4
        />
        {ks4Selected.length === 0 ? (
          <div className="empty-compare" role="status">
            Add a secondary or 16–18 setting for GCSE / A-level tables. Selecting
            KS3 shortlists schools that offer Years 7–9; published school-level
            attainment still appears at KS4. If the map looks empty, try turning
            off “Comparable KS4 only” to see special / alternative provision with
            a reason chip.
          </div>
        ) : (
          <IndependentComparisonBoard
            schools={ks4Selected}
            benchmark={ks4Bench}
            benchmarkLabel={ks4BenchLabel}
            sourceStamp={ks4Stamp}
            ofstedStateAsAt={index.stats.ofstedStateAsAt}
          />
        )}
        {ks4Selected.length > 0 ? (
          <div style={{ marginTop: "1.75rem" }}>
            <VisitPack
              schools={ks4Selected}
              preferPath="ks4"
              stages={stages}
              sectors={sectors}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const sawVisitPack =
    selectedSchools.length > 0 ||
    /* path boards mount VisitPack when the shortlist has items */
    Boolean(activePath && selected.length > 0);

  return (
    <>
      <ProductTour />
      <ProductFeedbackPrompt
        shortlistCount={selected.length}
        openedSideBySide={Boolean(activePath && selected.length > 0)}
        sawVisitPack={sawVisitPack}
        stages={stages}
        sectors={sectors}
      />
      <HomePostcodeExplorer
        schools={discoveryPool}
        selectedUrns={selected}
        onToggle={toggleSchool}
        stageFilter={stages}
        onStageFilterChange={changeStages}
        stageMatch={stageMatch}
        onStageMatchChange={changeStageMatch}
        sectorFilter={sectors}
        onSectorFilterChange={changeSectors}
        provisionFilter={provision}
        onProvisionFilterChange={changeProvision}
        showComparableKs4Toggle={showKs4}
        comparableKs4Only={comparableKs4Only}
        onComparableKs4OnlyChange={setComparableKs4Only}
      />

      {chapter === "compare" ? (
      <section className="section page-chapter journey-page" id="compare">
        <div className="shell">
          <div className="page-chapter-sheet">
          <div className="section-head">
            <h2>Shortlist</h2>
            <p>
              Tick settings on the map or search below — two to four is plenty.
              Stages and school type live under Setup.
            </p>
            <p className="footnote data-slim-line">
              {index.period} · refreshed {index.generatedAt}
            </p>
          </div>

          <MissingSchoolButton
            schools={index.schools}
            onIndexReload={onIndexReload}
          />

          <SchoolSearch
            key={`search-${stages.join("-")}-${stageMatch}-${sectors.join("-")}-${provision}`}
            schools={filteredSchools}
            selectedUrns={selected}
            onAdd={addSchool}
            stageFilter={stages}
            stageMatch={stageMatch}
            sectorFilter={sectors}
            provisionFilter={provision}
          />
          <SelectedChips schools={selectedSchools} onRemove={removeSchool} />
          {selectedSchools.length > 0 ? (
            <div className="shortlist-inline-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setChapter("side-by-side")}
              >
                Compare side by side
              </button>
              <ShareShortlistButton
                schoolNames={selectedSchools.map((s) => s.name)}
              />
            </div>
          ) : null}
          <SaveShortlistPrompt
            schools={selected}
            stages={stages}
            sectors={sectors}
            variant="shortlist"
          />
          <RestoreShortlistBanner
            ready={hydrated}
            currentCount={selected.length}
            onRestore={applyRestoredShortlist}
          />

          {sectorNote ? (
            <p className="footnote sector-prune-note" role="status">
              {sectorNote}
            </p>
          ) : null}
          </div>
        </div>
      </section>
      ) : null}

      {chapter === "side-by-side" ? (
      <section
        className="section page-chapter journey-page"
        id="side-by-side"
        data-tour="boards"
      >
        <div className="shell">
          <div className="page-chapter-sheet">
          <div className="section-head">
            <h2>Side by side</h2>
            <p>
              One path at a time
              {availablePaths.length > 1
                ? " — switch tabs when several categories are on"
                : null}
              . Patterns to visit on, not a final verdict.
            </p>
            {selectedSchools.length > 0 ? (
              <div className="shortlist-inline-actions section-head-actions">
                <ShareShortlistButton
                  schoolNames={selectedSchools.map((s) => s.name)}
                  label="Share this comparison"
                />
              </div>
            ) : null}
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
        </div>
      </section>
      ) : null}

      {chapter === "how" ? (
        <section
          className="section page-chapter journey-page"
          id="how"
          data-tour="how"
        >
          <div className="shell">
            <div className="page-chapter-sheet">
              <div className="section-head">
                <h2>{DECISION_GUIDANCE.general.heading}</h2>
                <p>{DECISION_GUIDANCE.general.lead}</p>
              </div>
              <div className="decision-guidance-grid page-how-grid">
                {DECISION_GUIDANCE.general.sections
                  .filter((s) => s.id !== "precis")
                  .map((section) => (
                    <section
                      key={section.id}
                      className="decision-guidance-block"
                    >
                      <h3>{section.title}</h3>
                      <ul>
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {chapter === "side-by-side" && suggestions.length > 0 ? (
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

      <ShortlistDock
        count={selectedSchools.length}
        schoolNames={selectedSchools.map((s) => s.name)}
      />
    </>
  );
}
