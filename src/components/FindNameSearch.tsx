"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import { searchSchools } from "@/lib/search";
import { fmtPct } from "@/lib/format";
import { fmtDistance, haversineMetres } from "@/lib/nearby";
import { passesComparableKs4Filter } from "@/lib/dataGaps";
import { isChildminder, isEyProvider } from "@/lib/eyMetrics";
import {
  PHASE_OPTIONS,
  formatPhases,
  phasesFromAgeRange,
  schoolMatchesPhases,
  schoolStageIds,
  wantsChildminders,
  wantsEyMetrics,
  wantsKs4Metrics,
  type PhaseId,
  type StageMatchMode,
  DEFAULT_STAGE_MATCH,
} from "@/lib/phases";
import {
  PROVISION_OPTIONS,
  schoolMatchesProvision,
  type ProvisionFilterId,
  DEFAULT_PROVISION,
} from "@/lib/provisionFilter";
import {
  SECTOR_OPTIONS,
  formatSector,
  resolveSchoolSector,
  schoolMatchesSectors,
  type SectorId,
} from "@/lib/sectors";

const RESULT_LIMIT = 8;

function queryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function fieldWords(value: string | null | undefined): string[] {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Every typed word must start a word in the name, place, postcode, or URN. */
function schoolMatchesNameQuery(school: SchoolRecord, query: string): boolean {
  const tokens = queryTokens(query);
  if (!tokens.length) return false;
  const urn = (school.urn || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const bags = [
    fieldWords(school.name),
    fieldWords(school.town),
    fieldWords(school.localAuthority),
    fieldWords(school.postcode),
  ];
  return tokens.every((token) => {
    if (urn.includes(token)) return true;
    return bags.some((words) => words.some((word) => word.startsWith(token)));
  });
}

type SearchFilters = {
  stages: PhaseId[];
  sectors: SectorId[];
  provision: ProvisionFilterId;
  comparableKs4Only: boolean;
};

function matchesFindFilters(
  school: SchoolRecord,
  filters: SearchFilters,
  stageMatch: StageMatchMode,
): boolean {
  if (isEyProvider(school) && wantsEyMetrics(filters.stages)) {
    return filters.provision !== "specialist";
  }
  if (isChildminder(school) && wantsChildminders(filters.stages)) {
    return filters.provision !== "specialist";
  }
  if (!schoolMatchesPhases(school, filters.stages, stageMatch)) return false;
  if (!schoolMatchesSectors(school, filters.sectors)) return false;
  if (!schoolMatchesProvision(school, filters.provision)) return false;
  return passesComparableKs4Filter(school, {
    comparableOnly: filters.comparableKs4Only,
    secondaryStagesActive: wantsKs4Metrics(filters.stages),
  });
}

function sectorSummary(sectors: SectorId[]): string {
  const state = sectors.includes("state");
  const independent = sectors.includes("independent");
  if (state && independent) return "State and independent";
  if (independent) return "Independent";
  if (state) return "State";
  return "No school type";
}

function filterSummary(
  filters: SearchFilters,
  stageMatch: StageMatchMode,
): string {
  const stages = filters.stages.length
    ? formatPhases(filters.stages)
    : "No stages";
  const provision =
    PROVISION_OPTIONS.find((option) => option.id === filters.provision)
      ?.label ?? "Any provision";
  const bits = [stages, sectorSummary(filters.sectors), provision];
  if (wantsKs4Metrics(filters.stages) && filters.comparableKs4Only) {
    bits.push("Comparable KS4 only");
  }
  if (stageMatch === "all" && schoolStageIds(filters.stages).length > 1) {
    bits.push("every selected stage");
  }
  return bits.join(" · ");
}

function outcomeLabel(school: SchoolRecord, sector: string): string | null {
  if (school.rwmExpected != null) return `${fmtPct(school.rwmExpected)} RWM`;
  if (typeof school.att8Average === "number") return `Att8 ${school.att8Average}`;
  if (school.ofstedOverall) return `Ofsted ${school.ofstedOverall}`;
  if (sector === "Independent") return "No published KS2 figures";
  return null;
}

export function FindNameSearch({
  schools,
  catalogue,
  selectedUrns,
  onToggle,
  stageFilter,
  stageMatch = DEFAULT_STAGE_MATCH,
  sectorFilter,
  provisionFilter = DEFAULT_PROVISION,
  comparableKs4Only = true,
  home = null,
  radiusKm,
  max = 4,
}: {
  /** Stage, sector and comparable-KS4 pool already used by the map. */
  schools: SchoolRecord[];
  /** Full index, including early years and childminders, for wider filters. */
  catalogue?: SchoolRecord[];
  selectedUrns: string[];
  onToggle: (urn: string) => void;
  stageFilter: PhaseId[];
  stageMatch?: StageMatchMode;
  sectorFilter: SectorId[];
  provisionFilter?: ProvisionFilterId;
  comparableKs4Only?: boolean;
  home?: { latitude: number; longitude: number } | null;
  radiusKm?: number;
  max?: number;
}) {
  const inputId = useId();
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [custom, setCustom] = useState<SearchFilters | null>(null);
  const deferredQuery = useDeferredValue(query);
  const usingSetup = custom == null;
  const active: SearchFilters = custom ?? {
    stages: stageFilter,
    sectors: sectorFilter,
    provision: provisionFilter,
    comparableKs4Only,
  };
  const matchMode: StageMatchMode = usingSetup ? stageMatch : "any";
  const source = usingSetup ? schools : (catalogue ?? schools);

  const pool = useMemo(
    () => source.filter((school) => matchesFindFilters(school, active, matchMode)),
    [source, active, matchMode],
  );

  const trimmed = deferredQuery.trim();
  const results = useMemo(() => {
    if (trimmed.length < 2) return [];
    const named = pool.filter((school) => schoolMatchesNameQuery(school, trimmed));
    return searchSchools(named, trimmed, RESULT_LIMIT);
  }, [pool, trimmed]);

  const atMax = selectedUrns.length >= max;
  const summary = filterSummary(active, matchMode);

  function updateCustom(patch: (current: SearchFilters) => SearchFilters) {
    setCustom((prev) => {
      const base = prev ?? {
        stages: stageFilter,
        sectors: sectorFilter,
        provision: provisionFilter,
        comparableKs4Only,
      };
      return patch(base);
    });
  }

  function toggleStage(id: PhaseId) {
    updateCustom((current) => ({
      ...current,
      stages: current.stages.includes(id)
        ? current.stages.filter((stage) => stage !== id)
        : [...current.stages, id],
    }));
  }

  let status: string | null = null;
  if (atMax) {
    status = `Shortlist is full (${max}). Untick a school to add another.`;
  } else if (trimmed.length === 1) {
    status = "Keep typing — at least two letters.";
  } else if (trimmed.length >= 2 && results.length === 0) {
    status = `No schools match “${trimmed}” with these filters.`;
  } else if (results.length > 0) {
    status = `${results.length} match${results.length === 1 ? "" : "es"}. Tick a card to shortlist.`;
  }

  return (
    <section className="find-name-search" aria-labelledby={`${inputId}-title`}>
      <div className="find-name-search-head">
        <h3 id={`${inputId}-title`}>Search by name</h3>
        <p>
          {home
            ? "Add a school you already have in mind, including one outside the range ring."
            : "Add a school you already have in mind. A home postcode is only needed for the map."}
        </p>
      </div>

      <div className="find-name-filter-summary">
        <p>
          <span className="find-name-filter-kicker">
            {usingSetup ? "Setup filters" : "Search filters"}
          </span>
          {summary}
        </p>
        <button
          type="button"
          className="find-name-text-btn"
          aria-expanded={filtersOpen}
          aria-controls={`${inputId}-filters`}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {filtersOpen ? "Hide filters" : "Adjust filters"}
        </button>
      </div>

      {filtersOpen ? (
        <div
          className="find-name-filters"
          id={`${inputId}-filters`}
          aria-label="Name search filters"
        >
          <p className="find-name-filter-note">
            These filters only affect name search. The map and nearby list
            still follow Setup.
          </p>
          <div className="find-name-filter-row" role="group" aria-label="Stages">
            <span className="find-name-filter-label">Stages</span>
            {PHASE_OPTIONS.map((option) => {
              const pressed = active.stages.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={pressed ? "phase-chip active" : "phase-chip"}
                  aria-pressed={pressed}
                  title={option.hint}
                  onClick={() => toggleStage(option.id)}
                >
                  {option.short}
                </button>
              );
            })}
          </div>
          <div
            className="find-name-filter-row"
            role="radiogroup"
            aria-label="School type"
          >
            <span className="find-name-filter-label">School type</span>
            {SECTOR_OPTIONS.map((option) => {
              const checked =
                active.sectors.length === 1 && active.sectors[0] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={checked ? "phase-chip active" : "phase-chip"}
                  role="radio"
                  aria-checked={checked}
                  title={option.hint}
                  onClick={() =>
                    updateCustom((current) => ({
                      ...current,
                      sectors: [option.id],
                    }))
                  }
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              className={
                active.sectors.includes("state") &&
                active.sectors.includes("independent")
                  ? "phase-chip active"
                  : "phase-chip"
              }
              role="radio"
              aria-checked={
                active.sectors.includes("state") &&
                active.sectors.includes("independent")
              }
              onClick={() =>
                updateCustom((current) => ({
                  ...current,
                  sectors: ["state", "independent"],
                }))
              }
            >
              Both
            </button>
          </div>
          <div
            className="find-name-filter-row"
            role="radiogroup"
            aria-label="Specialist provision"
          >
            <span className="find-name-filter-label">Provision</span>
            {PROVISION_OPTIONS.map((option) => {
              const checked = active.provision === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={checked ? "phase-chip active" : "phase-chip"}
                  role="radio"
                  aria-checked={checked}
                  title={option.hint}
                  onClick={() =>
                    updateCustom((current) => ({
                      ...current,
                      provision: option.id,
                    }))
                  }
                >
                  {option.short}
                </button>
              );
            })}
          </div>
          {wantsKs4Metrics(active.stages) ? (
            <div className="find-name-filter-row">
              <span className="find-name-filter-label">KS4</span>
              <button
                type="button"
                className={
                  active.comparableKs4Only ? "phase-chip active" : "phase-chip"
                }
                aria-pressed={active.comparableKs4Only}
                title="Hide secondaries without published Attainment 8, such as some special or alternative provision."
                onClick={() =>
                  updateCustom((current) => ({
                    ...current,
                    comparableKs4Only: !current.comparableKs4Only,
                  }))
                }
              >
                Comparable KS4 only
              </button>
            </div>
          ) : null}
          {custom ? (
            <button
              type="button"
              className="find-name-text-btn"
              onClick={() => setCustom(null)}
            >
              Use Setup filters
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="find-name-search-bar">
        <input
          id={inputId}
          type="search"
          value={query}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search by school name, town, postcode or URN"
          aria-controls={resultsId}
          aria-expanded={results.length > 0}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              event.currentTarget.blur();
            }
          }}
        />
      </div>

      {status ? (
        <p className="find-name-status" role="status">
          {status}
        </p>
      ) : (
        <p className="find-name-status">
          Matches show as cards. Tick one to add it to the shortlist.
        </p>
      )}

      {results.length > 0 ? (
        <ul className="find-name-results" id={resultsId}>
          {results.map((school) => {
            const checked = selectedUrns.includes(school.urn);
            const disabled = !checked && atMax;
            const sector = formatSector(resolveSchoolSector(school));
            const phases = formatPhases(phasesFromAgeRange(school.ageRange));
            const distance =
              home && school.latitude != null && school.longitude != null
                ? haversineMetres(
                    home.latitude,
                    home.longitude,
                    school.latitude,
                    school.longitude,
                  )
                : null;
            const outsideRing =
              distance != null &&
              radiusKm != null &&
              distance > radiusKm * 1000;
            const outcome = outcomeLabel(school, sector);
            return (
              <li key={school.urn}>
                <label
                  className={
                    checked
                      ? "nearby-item selected"
                      : disabled
                        ? "nearby-item disabled"
                        : "nearby-item"
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(school.urn)}
                  />
                  <span className="nearby-item-body">
                    <strong>{school.name}</strong>
                    <span className="nearby-item-meta">
                      {[
                        sector,
                        phases,
                        school.town,
                        school.localAuthority,
                        school.postcode,
                        distance != null ? `${fmtDistance(distance)} away` : null,
                        outsideRing ? `outside the ${radiusKm} km ring` : null,
                        outcome,
                        `URN ${school.urn}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
