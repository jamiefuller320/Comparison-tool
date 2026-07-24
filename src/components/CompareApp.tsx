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
  normalizePhaseIds,
  type PhaseId,
} from "@/lib/phases";
import {
  DEFAULT_SECTORS,
  normalizeSectorIds,
  resolveSchoolSector,
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

  const stateSelected = selectedSchools.filter(
    (s) => resolveSchoolSector(s) === "state",
  );
  const independentSelected = selectedSchools.filter(
    (s) => resolveSchoolSector(s) === "independent",
  );

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
    startTransition(() => setSectors(next));
  }

  return (
    <>
      <HomePostcodeExplorer
        schools={index.schools}
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
              you selected, then compare up to four side by side. State schools
              use Key Stage 2 tables; independents use Key Stage 4 outcomes and
              Ofsted inspection grades where published.
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
            schools={index.schools}
            selectedUrns={selected}
            onAdd={addSchool}
            stageFilter={stages}
            sectorFilter={sectors}
          />
          <SelectedChips schools={selectedSchools} onRemove={removeSchool} />

          {focus ? (
            <p className="footnote" style={{ marginTop: "1rem" }}>
              <strong>{focus.name}:</strong>{" "}
              {headlineForParents(focus, index.benchmarks.england.rwmExpected)}
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
              State and independent shortlists use different published measures,
              so they are compared in separate tables when both are selected.
            </p>
          </div>

          {selectedSchools.length === 0 ? (
            <ComparisonBoard
              schools={selectedSchools}
              england={index.benchmarks.england}
            />
          ) : null}

          {stateSelected.length > 0 ? (
            <div style={{ marginBottom: independentSelected.length ? "2rem" : 0 }}>
              {independentSelected.length > 0 ? (
                <h3 className="compare-subhead">State schools — Key Stage 2</h3>
              ) : null}
              <ComparisonBoard
                schools={stateSelected}
                england={index.benchmarks.england}
              />
            </div>
          ) : null}

          {independentSelected.length > 0 ? (
            <div>
              {stateSelected.length > 0 ? (
                <h3 className="compare-subhead">
                  Independent schools — Key Stage 4 &amp; inspection
                </h3>
              ) : null}
              <IndependentComparisonBoard
                schools={independentSelected}
                independentBench={index.benchmarks.independent}
              />
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
