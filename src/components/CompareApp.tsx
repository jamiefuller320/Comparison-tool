"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  QualitativeCaptureRecord,
  SchoolRecord,
  SchoolsIndex,
} from "@/lib/types";
import {
  loadQualitativeCaptures,
  schoolHasQualitativePointer,
  withQualitativeCaptures,
} from "@/lib/qualitativeLoad";
import { SchoolSearch } from "@/components/SchoolSearch";
import { ComparisonBoard } from "@/components/ComparisonBoard";
import { IndependentComparisonBoard } from "@/components/IndependentComparisonBoard";
import { PhonicsComparisonBoard } from "@/components/PhonicsComparisonBoard";
import { EarlyYearsComparisonBoard } from "@/components/EarlyYearsComparisonBoard";
import { EyfspComparisonBoard } from "@/components/EyfspComparisonBoard";
import { ChildminderDirectoryBoard } from "@/components/ChildminderDirectoryBoard";
import { ChildminderVettingChecklist } from "@/components/ChildminderVettingChecklist";
import { CompareActionBar } from "@/components/CompareActionBar";
import { CompareVisitPack } from "@/components/CompareVisitPack";
import { DecisionGuidancePanel } from "@/components/DecisionGuidance";
import { ShortlistDock } from "@/components/ShortlistDock";
import { SaveShortlistPrompt } from "@/components/SaveShortlistPrompt";
import { RestoreShortlistBanner } from "@/components/RestoreShortlistBanner";
import { useAccount } from "@/components/AccountProvider";
import { HomePostcodeExplorer } from "@/components/HomePostcodeExplorer";
import { JourneyStageFrame } from "@/components/JourneyStageFrame";
import { useJourneyChapter } from "@/components/JourneyChapterContext";
import { UnderstandChapter } from "@/components/UnderstandChapter";
import { RESTORE_SHORTLIST_EVENT } from "@/lib/account";
import { KS2_YEAR_TREND_TIP } from "@/lib/covid-gap";
import { SelectedChips, SuggestAlternatives } from "@/components/SelectedChips";
import { ShareShortlistButton } from "@/components/ShareShortlistButton";
import { MissingSchoolButton } from "@/components/MissingSchoolButton";
import {
  ACTIVE_PACK_STORAGE_KEY,
  type SchoolsIndexWithPack,
} from "@/lib/laPacks";
import { ProductTour } from "@/components/ProductTour";
import { ProductFeedbackPrompt } from "@/components/ProductFeedbackPrompt";
import { contextHeadlineForParents, suggestAlternatives } from "@/lib/compare";
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
          {contextHeadlineForParents(school, englandRwm, indieBench, {
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
  onEnsureAreaCoverage,
  onEnsureUrnCoverage,
}: {
  /** Hampshire seed with any geo-lazy area packs already merged in. */
  index: SchoolsIndex | SchoolsIndexWithPack;
  eyIndex?: EyProvidersIndex | null;
  childmindersIndex?: ChildmindersIndex | null;
  onIndexReload: () => Promise<void>;
  /** Fetch + merge ready LA packs for the home district (+ neighbours). */
  onEnsureAreaCoverage?: (adminDistrict?: string | null) => Promise<void>;
  /** Fetch packs needed to resolve shared shortlist URNs. */
  onEnsureUrnCoverage?: (urns: string[]) => Promise<void>;
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
  /** On-demand qualitative shards keyed by URN. */
  const [qualByUrn, setQualByUrn] = useState<
    Record<string, QualitativeCaptureRecord | null>
  >({});
  const [pendingShareUrns, setPendingShareUrns] = useState<string[]>([]);

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
      const requested = raw
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, 4);
      const known = requested.filter((u) => byUrn.has(u));
      const missing = requested.filter((u) => !byUrn.has(u));
      if (known.length) setSelected(known);
      if (missing.length) {
        setPendingShareUrns(missing);
        void onEnsureUrnCoverage?.(missing);
      }
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
    // Re-run when collated index gains pack schools for share-link URNs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnsureUrnCoverage stable from loader
  }, [byUrn]);

  useEffect(() => {
    if (!pendingShareUrns.length) return;
    const resolved = pendingShareUrns.filter((urn) => byUrn.has(urn));
    if (!resolved.length) return;
    setSelected((prev) =>
      [...new Set([...prev, ...resolved])].slice(0, 4),
    );
    setPendingShareUrns((prev) => prev.filter((urn) => !byUrn.has(urn)));
  }, [byUrn, pendingShareUrns]);

  useEffect(() => {
    const need = selected.filter((urn) => {
      const school = byUrn.get(urn);
      if (!school) return false;
      if (school.qualitativeCapture?.areas?.length) return false;
      if (qualByUrn[urn] !== undefined) return false;
      return schoolHasQualitativePointer(school);
    });
    if (!need.length) return;
    let cancelled = false;
    void loadQualitativeCaptures(need, fetch, false).then((loaded) => {
      if (cancelled) return;
      setQualByUrn((prev) => ({ ...prev, ...loaded }));
    });
    return () => {
      cancelled = true;
    };
  }, [selected, byUrn, qualByUrn]);

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

  const selectedSchools: SchoolRecord[] = withQualitativeCaptures(
    selected
      .map((urn) => byUrn.get(urn))
      .filter((s): s is SchoolRecord => Boolean(s)),
    qualByUrn,
  );

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

  const guidancePanelProps = {
    paths: shortlistPaths.length > 1 ? shortlistPaths : undefined,
    defaultOpen: shortlistPaths.length === 1,
  };

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

  const canPrintComparePack = useMemo(() => {
    if (!activePath || selectedSchools.length === 0) return false;
    switch (activePath) {
      case "early-years":
        return eySelected.length > 0;
      case "childminders":
        return childminderSelected.length > 0;
      case "ks1":
        return ks1Selected.length > 0;
      case "ks2":
        return ks2Selected.length > 0;
      case "ks4":
        return ks4Selected.length > 0;
      default:
        return false;
    }
  }, [
    activePath,
    selectedSchools.length,
    eySelected.length,
    childminderSelected.length,
    ks1Selected.length,
    ks2Selected.length,
    ks4Selected.length,
  ]);

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
      const eyContext = (
        <>
          <DecisionGuidancePanel path="early-years" {...guidancePanelProps} />
          {showEarlyNotice ? (
            <div className="empty-compare" role="status">
              Early years data isn’t available in this build yet. Try another
              category, or check back after the next data refresh.
            </div>
          ) : null}
          {hasEyData ? (
            <EyfspComparisonBoard
              eyfsp={eyIndex?.benchmarks.eyfsp}
              sourceStamp={eyfspSourceStamp}
            />
          ) : null}
          {eySelected.length === 0 && selectedSchools.length > 0 ? (
            <div className="empty-compare" role="status">
              Your shortlist is schools without an early-years Ofsted row here
              (for example junior or secondary only). Add a nursery, or a school
              with nursery / reception, to compare inspection grades — the EYFSP
              area table above still gives local context.
            </div>
          ) : eySelected.length === 0 ? (
            <div className="empty-compare">
              Add a nursery or school nursery / reception setting from the map
              or search to compare Ofsted grades. Childminders use their own
              category.
            </div>
          ) : null}
        </>
      );

      return (
        <div data-tour="boards-early-years">
          <EarlyYearsComparisonBoard
            providers={eySelected}
            childcareOfstedAsAt={eyIndex?.ofstedAsAt}
            stateOfstedAsAt={index.stats.ofstedStateAsAt}
            childcareSourcePage={eyIndex?.source.ofstedChildcareMiPage}
            stateSourcePage={index.source.datasets.ofstedStateSchoolsMi}
            childcareStamp={childcareOfstedStamp}
            stateStamp={stateOfstedStamp}
            contextSlot={eyContext}
            summarySlot={
              <PathSummaries schools={eySelected} {...summaryOpts} />
            }
          />
        </div>
      );
    }

    if (activePath === "childminders") {
      return (
        <div data-tour="childminders">
          <DecisionGuidancePanel path="childminders" {...guidancePanelProps} />
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
            </>
          ) : null}
        </div>
      );
    }

    if (activePath === "ks1") {
      const ks1Context = (
        <>
          <DecisionGuidancePanel path="ks1" {...guidancePanelProps} />
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
          ) : null}
        </>
      );

      const ks1Summary = (
        <PathSummaries schools={ks1Selected} {...summaryOpts} />
      );

      return (
        <div>
          {showPhonicsBoard ? (
            <PhonicsComparisonBoard
              schools={ks1Selected}
              phonics={index.benchmarks.phonics}
              sourceStamp={phonicsSourceStamp}
              contextSlot={ks1Context}
              summarySlot={ks1Summary}
            />
          ) : (
            <>
              {ks1Summary}
              {ks1Context}
            </>
          )}
        </div>
      );
    }

    if (activePath === "ks2") {
      const ks2Context = (
        <>
          <DecisionGuidancePanel path="ks2" {...guidancePanelProps} />
          {ks2Selected.length > 0 ? (
            <aside className="year-trend-tip" data-tour="year-trend">
              <strong>Year trends &amp; COVID years:</strong> {KS2_YEAR_TREND_TIP}
            </aside>
          ) : null}
          {ks2Selected.length === 0 ? (
            <div className="empty-compare" role="status">
              Add a state primary or junior with Year 6 tables to compare reading,
              writing and maths. Independent prep schools usually have no
              comparable KS2 table figures here.
            </div>
          ) : null}
        </>
      );

      return (
        <div>
          <ComparisonBoard
            schools={ks2Selected}
            england={index.benchmarks.england}
            sourceStamp={ks2Stamp}
            contextSlot={ks2Context}
            summarySlot={
              <PathSummaries schools={ks2Selected} {...summaryOpts} />
            }
          />
        </div>
      );
    }

    const ks4Context = (
      <>
        <DecisionGuidancePanel path="ks4" {...guidancePanelProps} />
        {ks4Selected.length === 0 ? (
          <div className="empty-compare" role="status">
            Add a secondary or 16–18 setting for GCSE / A-level tables. Selecting
            KS3 shortlists schools that offer Years 7–9; published school-level
            attainment still appears at KS4.
          </div>
        ) : null}
      </>
    );

    return (
      <div>
        <IndependentComparisonBoard
          schools={ks4Selected}
          benchmark={ks4Bench}
          benchmarkLabel={ks4BenchLabel}
          sourceStamp={ks4Stamp}
          ofstedStateAsAt={index.stats.ofstedStateAsAt}
          contextSlot={ks4Context}
          summarySlot={
            <PathSummaries
              schools={ks4Selected}
              {...summaryOpts}
              preferKs4
            />
          }
        />
      </div>
    );
  }

  const sawVisitPack =
    selectedSchools.length > 0 ||
    /* path boards mount VisitPack when the shortlist has items */
    Boolean(activePath && selected.length > 0);

  const shortlistLas = useMemo(() => {
    const labels: string[] = [];
    const seen = new Set<string>();
    for (const school of selectedSchools) {
      const la = (school.localAuthority || "").trim();
      if (!la) continue;
      const key = la.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push(la);
      if (labels.length >= 8) break;
    }
    return labels;
  }, [selectedSchools]);

  return (
    <>
      <ProductTour />
      <ProductFeedbackPrompt
        shortlistCount={selected.length}
        shortlistLas={shortlistLas}
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
        onEnsureAreaCoverage={onEnsureAreaCoverage}
      >
        {({ setupSheet, nearbySheet }) => {
          const compareSheet = (
            <>
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
            </>
          );

          const sideBySideSheet = (
            <>
              <div className="section-head">
                <h2>Side by side</h2>
                <p>
                  One path at a time — patterns to visit on, not a final verdict.
                  Use the tabs for context, summary, Ofsted, website evidence,
                  places, and stats. Switch Side by side / By school when you
                  want to focus on one setting.
                </p>
              </div>

              <CompareActionBar
                schoolNames={selectedSchools.map((s) => s.name)}
                availablePaths={availablePaths}
                activePath={activePath}
                onPathChange={setActivePath}
                shortlistPaths={shortlistPaths}
                canPrint={canPrintComparePack}
              />

              {renderActivePath()}

              <CompareVisitPack
                activePath={activePath}
                eySelected={eySelected}
                childminderSelected={childminderSelected}
                ks1Selected={ks1Selected}
                ks2Selected={ks2Selected}
                ks4Selected={ks4Selected}
                stages={stages}
                sectors={sectors}
              />
            </>
          );

          const howSheet = <UnderstandChapter />;

          const sheet =
            chapter === "setup"
              ? setupSheet
              : chapter === "nearby"
                ? nearbySheet
                : chapter === "compare"
                  ? compareSheet
                  : chapter === "side-by-side"
                    ? sideBySideSheet
                    : howSheet;

          return <JourneyStageFrame sheet={sheet} />;
        }}
      </HomePostcodeExplorer>

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
