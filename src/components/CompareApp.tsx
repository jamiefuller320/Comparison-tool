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
import { SelectedChips, SuggestAlternatives } from "@/components/SelectedChips";
import { HomePostcodeExplorer } from "@/components/HomePostcodeExplorer";
import { PhaseSelector } from "@/components/PhaseSelector";
import { SectorSelector } from "@/components/SectorSelector";
import { MissingSchoolButton } from "@/components/MissingSchoolButton";
import { ProductTour } from "@/components/ProductTour";
import { headlineForParents, suggestAlternatives } from "@/lib/compare";
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

export function CompareApp({
  index,
  eyIndex = null,
  childmindersIndex = null,
  onIndexReload,
}: {
  index: SchoolsIndex;
  eyIndex?: EyProvidersIndex | null;
  childmindersIndex?: ChildmindersIndex | null;
  onIndexReload: () => Promise<void>;
}) {
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
    // Legacy nested EY toggles retired — Childminders is its own stage chip.
    url.searchParams.delete("eySettings");
    url.searchParams.delete("ey");
    window.history.replaceState({}, "", url.toString());
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
  const showEyNurseryBoards =
    showEy && (hasEyData || hasStateEyOfsted);
  const showChildminderBoards =
    showChildminderCategory && hasChildminders;
  const hasAnyCompareBoard =
    eySelected.length > 0 ||
    childminderSelected.length > 0 ||
    ks1Selected.length > 0 ||
    ks2Selected.length > 0 ||
    ks4Selected.length > 0 ||
    (showEy && hasEyData && Boolean(eyIndex?.benchmarks.eyfsp)) ||
    showChildminderBoards;
  const ks4AllIndie =
    ks4Selected.length > 0 &&
    ks4Selected.every((s) => resolveSchoolSector(s) === "independent");
  const ks4Bench = ks4AllIndie
    ? index.benchmarks.independent
    : index.benchmarks.stateKs4 ?? index.benchmarks.independent;
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
    // Apply immediately so map / nearby / search refresh without deferred lag.
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

  return (
    <>
      <ProductTour />
      <HomePostcodeExplorer
        schools={filteredSchools}
        selectedUrns={selected}
        onToggle={toggleSchool}
        stageFilter={stages}
        onStageFilterChange={changeStages}
        sectorFilter={sectors}
        onSectorFilterChange={changeSectors}
      />

      <section className="section" id="compare">
        <div className="shell">
          <div className="section-head">
            <h2>Build your shortlist</h2>
            <p>
              Choose categories above: <strong>Early years</strong> for
              nurseries and school reception settings,{" "}
              <strong>Childminders</strong> for wrap-around and home-based care
              (separate from the school path), then KS1–KS4 for school tables.
              Search and map follow those chips.
            </p>
            <div className="stats-line">
              {showEy && eyIndex?.stats.providerCount != null ? (
                <span>
                  <strong>
                    {eyIndex.stats.providerCount.toLocaleString("en-GB")}
                  </strong>{" "}
                  {SEED_GEOGRAPHY_LABEL} EY day-care
                </span>
              ) : null}
              {showChildminderCategory &&
              childmindersIndex?.stats.providerCount != null ? (
                <span>
                  <strong>
                    {childmindersIndex.stats.providerCount.toLocaleString(
                      "en-GB",
                    )}
                  </strong>{" "}
                  consented childminders
                </span>
              ) : null}
              <span>
                <strong>{index.stats.schoolCount.toLocaleString("en-GB")}</strong>{" "}
                schools indexed
              </span>
              {index.stats.stateCount != null ? (
                <span>
                  <strong>
                    {index.stats.stateCount.toLocaleString("en-GB")}
                  </strong>{" "}
                  state
                </span>
              ) : null}
              {index.stats.independentCount != null ? (
                <span>
                  <strong>
                    {index.stats.independentCount.toLocaleString("en-GB")}
                  </strong>{" "}
                  independent
                </span>
              ) : null}
              {index.stats.independentWithKs4 != null ? (
                <span>
                  <strong>
                    {index.stats.independentWithKs4.toLocaleString("en-GB")}
                  </strong>{" "}
                  independents with KS4
                </span>
              ) : null}
              {index.stats.independentWithKs5 != null ? (
                <span>
                  <strong>
                    {index.stats.independentWithKs5.toLocaleString("en-GB")}
                  </strong>{" "}
                  with 16–18
                </span>
              ) : null}
              <span>
                Latest year <strong>{index.period}</strong>
              </span>
              <span>
                Refreshed <strong>{index.generatedAt}</strong>
              </span>
              {index.stats.withCoordinates != null ? (
                <span>
                  <strong>
                    {index.stats.withCoordinates.toLocaleString("en-GB")}
                  </strong>{" "}
                  with map coordinates
                </span>
              ) : null}
            </div>
          </div>

          <PhaseSelector selected={stages} onChange={changeStages} />
          <SectorSelector selected={sectors} onChange={changeSectors} />

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

          {focus ? (
            <p className="footnote" style={{ marginTop: "1rem" }}>
              <strong>{focus.name}:</strong>{" "}
              {headlineForParents(
                focus,
                index.benchmarks.england.rwmExpected,
                index.benchmarks.independent,
                {
                  preferKs4: showKs4 && !showKs2,
                  stateKs4Bench: index.benchmarks.stateKs4,
                },
              )}
              {pending ? " Updating…" : null}
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
              Tables follow the categories you selected. Early years covers
              nursery / school Ofsted and EYFSP area context. Childminders are a
              separate wrap-around path (directory + checklist). KS1 uses
              local-authority phonics; KS2 rows open a multi-year trend; KS3/KS4
              use GCSE and 16–18 figures.
            </p>
          </div>

          {ks2Selected.length === 0 ? (
            <aside className="year-trend-tip" data-tour="year-trend">
              <strong>Year trends on KS2:</strong> when Year 6 tables are showing,
              click a measure name (or <em>Year trend</em>) to expand a
              year-by-year graph under that row — schools and England, with a
              hatched band for the COVID years when tables were unpublished.
            </aside>
          ) : null}

          {selectedSchools.length === 0 ? (
            <div className="empty-compare">
              Add two to four schools, nurseries, or childminders to see a
              side-by-side view for the categories you selected.
            </div>
          ) : null}

          {selectedSchools.length > 0 && showEarlyNotice ? (
            <div className="empty-compare" role="status">
              Early years is selected, but the {SEED_GEOGRAPHY_LABEL} early years
              pack is not in this data build. Re-run{" "}
              <code>npm run harvest:ey</code> (and{" "}
              <code>npm run enrich:ey-schools</code> for school nurseries /
              infants), or add KS1 / KS2 / KS3/KS4 for school tables.
            </div>
          ) : null}

          {showEyNurseryBoards ? (
            <div
              style={{
                marginBottom:
                  showChildminderBoards ||
                  eySelected.length ||
                  ks1Selected.length ||
                  ks2Selected.length ||
                  ks4Selected.length
                    ? "2rem"
                    : 0,
              }}
            >
              {hasEyData ? (
                <>
                  {(ks1Selected.length > 0 ||
                    ks2Selected.length > 0 ||
                    ks4Selected.length > 0 ||
                    eySelected.length > 0 ||
                    showChildminderBoards) && (
                    <h3 className="compare-subhead">
                      Early years — {SEED_GEOGRAPHY_LABEL} nurseries
                    </h3>
                  )}
                  <EyfspComparisonBoard eyfsp={eyIndex?.benchmarks.eyfsp} />
                </>
              ) : null}
              {eySelected.length > 0 ? (
                <div style={{ marginTop: hasEyData ? "1.5rem" : 0 }}>
                  <h3 className="compare-subhead">
                    Early years — Ofsted comparison
                  </h3>
                  <EarlyYearsComparisonBoard
                    providers={eySelected}
                    childcareOfstedAsAt={eyIndex?.ofstedAsAt}
                    stateOfstedAsAt={index.stats.ofstedStateAsAt}
                    childcareSourcePage={
                      eyIndex?.source.ofstedChildcareMiPage
                    }
                    stateSourcePage={
                      index.source.datasets.ofstedStateSchoolsMi
                    }
                  />
                </div>
              ) : selectedSchools.length > 0 &&
                !childminderSelected.length ? (
                <div
                  className="empty-compare"
                  role="status"
                  style={{ marginTop: "1rem" }}
                >
                  Shortlist a {SEED_GEOGRAPHY_LABEL} day-care nursery or a school
                  nursery / infant (search or map) to compare Ofsted inspection
                  outcomes. EYFSP area figures are for context only — not the
                  same as Ofsted grades. For wrap-around home-based care, turn
                  on the Childminders category.
                </div>
              ) : null}
            </div>
          ) : null}

          {showChildminderBoards ? (
            <div
              style={{
                marginBottom:
                  ks1Selected.length ||
                  ks2Selected.length ||
                  ks4Selected.length
                    ? "2rem"
                    : 0,
              }}
              data-tour="childminders"
            >
              <h3 className="compare-subhead">
                Childminders — wrap-around &amp; home-based care
              </h3>
              <p className="footnote" style={{ marginBottom: "1rem" }}>
                Childminders sit outside the school Early years path. Many
                families use them for wrap-around cover before or after school,
                or as the main childcare place — use the directory and checklist,
                not the nursery Ofsted compare table.
              </p>
              {childminderSelected.length > 0 ? (
                <ChildminderDirectoryBoard
                  providers={childminderSelected}
                  consentedAsAt={childmindersIndex?.consentedAsAt}
                />
              ) : selectedSchools.length > 0 ? (
                <div className="empty-compare" role="status">
                  Shortlist a {SEED_GEOGRAPHY_LABEL} consented childminder from
                  the map or search to pin their address and Ofsted report here.
                </div>
              ) : null}
              <div
                style={{
                  marginTop:
                    childminderSelected.length || selectedSchools.length
                      ? "1.5rem"
                      : 0,
                }}
              >
                <ChildminderVettingChecklist
                  consentedAsAt={childmindersIndex?.consentedAsAt}
                  sourcePage={
                    childmindersIndex?.source.consentedAddressesPage
                  }
                  providerCount={childmindersIndex?.stats.providerCount}
                />
              </div>
            </div>
          ) : null}

          {selectedSchools.length > 0 &&
          showKs1 &&
          !showPhonicsBoard ? (
            <div className="empty-compare" role="status">
              KS1 is selected, but phonics area benchmarks are not in this data
              build yet. Re-run <code>npm run enrich:phonics</code> (or a full
              harvest), or add KS2 / KS3/KS4 for school-level tables.
            </div>
          ) : null}

          {selectedSchools.length > 0 &&
          showKs1 &&
          showPhonicsBoard &&
          ks1Selected.length === 0 ? (
            <div className="empty-compare" role="status">
              Phonics context is shown for state schools that offer KS1.
              Independents are not included in the DfE phonics screening
              tables — add a state infant or primary, or another stage.
            </div>
          ) : null}

          {ks1Selected.length > 0 && showPhonicsBoard ? (
            <div
              style={{
                marginBottom:
                  ks2Selected.length || ks4Selected.length ? "2rem" : 0,
              }}
            >
              {ks2Selected.length > 0 || ks4Selected.length > 0 ? (
                <h3 className="compare-subhead">
                  Key Stage 1 — phonics by local authority
                </h3>
              ) : null}
              <PhonicsComparisonBoard
                schools={ks1Selected}
                phonics={index.benchmarks.phonics}
              />
            </div>
          ) : null}

          {ks2Selected.length > 0 ? (
            <div style={{ marginBottom: ks4Selected.length ? "2rem" : 0 }}>
              {ks1Selected.length > 0 ||
              ks4Selected.length > 0 ||
              showEarlyNotice ? (
                <h3 className="compare-subhead">Key Stage 2 — Year 6 tables</h3>
              ) : null}
              <ComparisonBoard
                schools={ks2Selected}
                england={index.benchmarks.england}
              />
            </div>
          ) : null}

          {ks4Selected.length > 0 ? (
            <div>
              {ks1Selected.length > 0 || ks2Selected.length > 0 ? (
                <h3 className="compare-subhead">
                  Key Stage 4 &amp; 16–18 — GCSE / A-level tables
                </h3>
              ) : null}
              <IndependentComparisonBoard
                schools={ks4Selected}
                benchmark={ks4Bench}
                benchmarkLabel={ks4BenchLabel}
              />
            </div>
          ) : null}

          {selectedSchools.length > 0 &&
          !showEarlyNotice &&
          !hasAnyCompareBoard &&
          !(showKs1 && showPhonicsBoard && ks1Selected.length === 0) &&
          !(showKs1 && !showPhonicsBoard) ? (
            <div className="empty-compare" role="status">
              None of the shortlisted settings offer the categories needed for
              the published tables that match your filter. Try Early years for
              Hampshire nurseries, Childminders for wrap-around care, KS1 for
              phonics context, KS2 for Year 6, or KS3/KS4 for GCSE measures.
            </div>
          ) : null}
        </div>
      </section>

      {suggestions.length > 0 ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="shell">
            <div className="section-head">
              <h2>Other schools you might weigh</h2>
              <p>
                Suggested from the same local authority or postcode area, with
                overlapping stages, matching sector and similar cohort size —
                then ordered toward stronger published outcomes.
              </p>
            </div>
            <SuggestAlternatives suggestions={suggestions} onAdd={addSchool} />
          </div>
        </section>
      ) : null}
    </>
  );
}
