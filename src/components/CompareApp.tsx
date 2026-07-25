"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { SchoolRecord, SchoolsIndex } from "@/lib/types";
import { SchoolSearch } from "@/components/SchoolSearch";
import { ComparisonBoard } from "@/components/ComparisonBoard";
import { IndependentComparisonBoard } from "@/components/IndependentComparisonBoard";
import { SelectedChips, SuggestAlternatives } from "@/components/SelectedChips";
import { HomePostcodeExplorer } from "@/components/HomePostcodeExplorer";
import { PhaseSelector } from "@/components/PhaseSelector";
import { SectorSelector } from "@/components/SectorSelector";
import { MissingSchoolButton } from "@/components/MissingSchoolButton";
import { headlineForParents, suggestAlternatives } from "@/lib/compare";
import {
  DEFAULT_PHASES,
  defaultPhasesForSectors,
  normalizePhaseIds,
  schoolMatchesPhases,
  schoolOffersKs2,
  schoolOffersSecondary,
  wantsEarlyYearsOnlyNotice,
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
  onIndexReload,
}: {
  index: SchoolsIndex;
  onIndexReload: () => Promise<void>;
}) {
  const byUrn = useMemo(
    () => new Map(index.schools.map((s) => [s.urn, s])),
    [index.schools],
  );

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
    setStages(parseStagesParam(params.get("stages") || params.get("phase")));
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
    window.history.replaceState({}, "", url.toString());
  }, [selected, stages, sectors, hydrated]);

  const selectedSchools: SchoolRecord[] = selected
    .map((urn) => byUrn.get(urn))
    .filter((s): s is SchoolRecord => Boolean(s));

  const showKs2 = wantsKs2Metrics(stages);
  const showKs4 = wantsKs4Metrics(stages);
  const showEarlyNotice = wantsEarlyYearsOnlyNotice(stages);

  const ks2Selected = selectedSchools.filter(
    (s) =>
      showKs2 &&
      resolveSchoolSector(s) === "state" &&
      schoolOffersKs2(s),
  );
  const ks4Selected = selectedSchools.filter(
    (s) => showKs4 && schoolOffersSecondary(s),
  );
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
    return suggestAlternatives(focus, index.schools, 6, stages, sectors).filter(
      (s) => !selected.includes(s.urn),
    );
  }, [focus, index.schools, selected, stages, sectors]);

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
  }

  function changeSectors(next: SectorId[]) {
    // Apply immediately so map / nearby / search refresh without deferred lag.
    setSectors(next);

    const stageDefault = defaultPhasesForSectors(next);
    if (stageDefault) setStages(stageDefault);

    setSelected((prev) => {
      const kept = prev.filter((urn) => {
        const school = byUrn.get(urn);
        return school ? schoolMatchesSectors(school, next) : false;
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

  const filteredSchools = useMemo(
    () =>
      index.schools.filter(
        (s) =>
          schoolMatchesPhases(s, stages) && schoolMatchesSectors(s, sectors),
      ),
    [index.schools, stages, sectors],
  );

  return (
    <>
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
              Search any English school in the index for the stages and sector
              you selected, then compare up to four side by side. Tables follow
              your stages: KS2 shows Year 6 results; KS3/KS4 show GCSE and 16–18
              measures. Early years / KS1 listing is by age range only for now.
            </p>
            <div className="stats-line">
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

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="section-head">
            <h2>Side by side</h2>
            <p>
              Comparison tables match the stages you selected. KS2 rows open a
              multi-year trend; KS3/KS4 use GCSE and 16–18 figures for state and
              independent schools.
            </p>
          </div>

          {selectedSchools.length === 0 ? (
            <div className="empty-compare">
              Add two to four schools to see a side-by-side comparison for the
              stages you selected.
            </div>
          ) : null}

          {selectedSchools.length > 0 && showEarlyNotice ? (
            <div className="empty-compare" role="status">
              Early years and KS1 are filtered by age range, but this tool does
              not yet include phonics or KS1 teacher-assessment results. Add KS2
              to compare Year 6 tables for primary schools, or KS3/KS4 for
              secondary measures.
            </div>
          ) : null}

          {ks2Selected.length > 0 ? (
            <div style={{ marginBottom: ks4Selected.length ? "2rem" : 0 }}>
              {ks4Selected.length > 0 || showEarlyNotice ? (
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
              {ks2Selected.length > 0 ? (
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
          ks2Selected.length === 0 &&
          ks4Selected.length === 0 ? (
            <div className="empty-compare" role="status">
              None of the shortlisted schools offer the stages needed for the
              published tables that match your filter. Try adding KS2 for Year 6
              results or KS3/KS4 for GCSE measures.
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
