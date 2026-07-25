"use client";

import type { SchoolRecord } from "@/lib/types";
import { fmtPct } from "@/lib/format";
import type { SimilarSchool } from "@/lib/compare";

export function SuggestAlternatives({
  suggestions,
  onAdd,
}: {
  suggestions: SimilarSchool[];
  onAdd: (urn: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggest-grid">
      {suggestions.map((school) => (
        <button
          key={school.urn}
          type="button"
          className="suggest-item"
          onClick={() => onAdd(school.urn)}
        >
          <strong>{school.name}</strong>
          <p>
            {school.att8Average != null
              ? `Attainment 8 ${school.att8Average}`
              : school.ks5ApsPerEntry != null
                ? `A-level APS ${school.ks5ApsPerEntry}`
                : school.rwmExpected != null
                  ? `${fmtPct(school.rwmExpected)} RWM expected`
                  : "Limited published outcomes"}
            {school.localAuthority ? ` · ${school.localAuthority}` : ""}
          </p>
          <p>{school.reasons.join(" · ")}</p>
        </button>
      ))}
    </div>
  );
}

export function SelectedChips({
  schools,
  onRemove,
}: {
  schools: SchoolRecord[];
  onRemove: (urn: string) => void;
}) {
  if (schools.length === 0) {
    return (
      <div className="chip-row chip-row-empty" aria-live="polite" data-tour="shortlist">
        <span className="chip-row-placeholder">
          Your shortlist will appear here (up to four schools).
        </span>
      </div>
    );
  }

  return (
    <div className="chip-row" aria-live="polite" data-tour="shortlist">
      {schools.map((school) => (
        <span className="school-chip" key={school.urn}>
          {school.name}
          <button
            type="button"
            aria-label={`Remove ${school.name}`}
            onClick={() => onRemove(school.urn)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
