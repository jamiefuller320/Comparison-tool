"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DirectorySchool, SchoolRecord } from "@/lib/types";
import { searchSchools } from "@/lib/search";
import {
  formatPhases,
  phasesFromAgeRange,
  schoolMatchesPhases,
  type PhaseId,
} from "@/lib/phases";
import {
  formatSector,
  resolveSchoolSector,
  schoolMatchesSectors,
  type SectorId,
} from "@/lib/sectors";

export function SchoolSearch({
  schools,
  selectedUrns,
  onAdd,
  stageFilter,
  sectorFilter,
  max = 4,
}: {
  schools: Array<DirectorySchool | SchoolRecord>;
  selectedUrns: string[];
  onAdd: (urn: string) => void;
  stageFilter: PhaseId[];
  sectorFilter: SectorId[];
  max?: number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const pool = useMemo(
    () =>
      schools.filter(
        (s) =>
          schoolMatchesPhases(s, stageFilter) &&
          schoolMatchesSectors(s, sectorFilter),
      ),
    [schools, stageFilter, sectorFilter],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchSchools(pool, query, 10).filter(
      (s) => !selectedUrns.includes(s.urn),
    );
  }, [pool, query, selectedUrns]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const atMax = selectedUrns.length >= max;

  return (
    <div className="search-panel" ref={wrapRef} data-tour="search">
      <div className="search-box">
        <input
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={
            atMax
              ? "Remove a school to add another (max 4)"
              : "Search by school name, town, postcode or URN"
          }
          value={query}
          disabled={atMax}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={atMax || !results[0]}
          onClick={() => {
            if (!results[0]) return;
            onAdd(results[0].urn);
            setQuery("");
            setOpen(false);
          }}
        >
          Add school
        </button>
      </div>

      {open && results.length > 0 && !atMax ? (
        <div className="search-results" id={listId} role="listbox">
          {results.map((school) => {
            const phases = formatPhases(phasesFromAgeRange(school.ageRange));
            const sector = formatSector(resolveSchoolSector(school));
            return (
              <button
                key={school.urn}
                type="button"
                className="search-result"
                role="option"
                onClick={() => {
                  onAdd(school.urn);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <strong>{school.name}</strong>
                <span>
                  {[
                    sector,
                    phases,
                    school.town,
                    school.localAuthority,
                    school.postcode,
                    `URN ${school.urn}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {school.rwmExpected != null
                    ? ` · RWM ${school.rwmExpected}%`
                    : "att8Average" in school &&
                        typeof school.att8Average === "number"
                      ? ` · Att8 ${school.att8Average}`
                      : "ofstedOverall" in school && school.ofstedOverall
                        ? ` · Ofsted ${school.ofstedOverall}`
                        : sector === "Independent"
                          ? " · No published KS2 table figures"
                          : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
