"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DirectorySchool, SchoolRecord } from "@/lib/types";
import { searchSchools } from "@/lib/search";

export function SchoolSearch({
  schools,
  selectedUrns,
  onAdd,
  max = 4,
}: {
  schools: Array<DirectorySchool | SchoolRecord>;
  selectedUrns: string[];
  onAdd: (urn: string) => void;
  max?: number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchSchools(schools, query, 10).filter(
      (s) => !selectedUrns.includes(s.urn),
    );
  }, [schools, query, selectedUrns]);

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
    <div className="search-panel" ref={wrapRef}>
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
          {results.map((school) => (
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
                {[school.town, school.localAuthority, school.postcode, `URN ${school.urn}`]
                  .filter(Boolean)
                  .join(" · ")}
                {school.rwmExpected != null ? ` · RWM ${school.rwmExpected}%` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
