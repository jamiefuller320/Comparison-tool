"use client";

import { SECTOR_OPTIONS, type SectorId } from "@/lib/sectors";

export function SectorSelector({
  selected,
  onChange,
  tone = "light",
  tourId,
}: {
  selected: SectorId[];
  onChange: (next: SectorId[]) => void;
  tone?: "light" | "hero";
  /** Optional walkthrough anchor (`data-tour`). */
  tourId?: string;
}) {
  const bothSelected =
    selected.includes("state") && selected.includes("independent");

  function selectOne(id: SectorId) {
    onChange([id]);
  }

  function selectBoth() {
    onChange(["state", "independent"]);
  }

  return (
    <div
      className={
        tone === "hero"
          ? "phase-selector hero-phase sector-selector"
          : "phase-selector sector-selector"
      }
      role="radiogroup"
      aria-label="School funding sector"
      data-tour={tourId}
    >
      <span className="phase-selector-label">School type</span>
      <div className="phase-chips">
        {SECTOR_OPTIONS.map((option) => {
          const active = !bothSelected && selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              role="radio"
              aria-checked={active}
              className={active ? "phase-chip active" : "phase-chip"}
              onClick={() => selectOne(option.id)}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          title="Show both state-funded and independent schools"
          role="radio"
          aria-checked={bothSelected}
          className={bothSelected ? "phase-chip active" : "phase-chip"}
          onClick={selectBoth}
        >
          Both
        </button>
      </div>
      <p className="phase-selector-hint">
        Map, nearby list and search refresh to the selected type. Independent
        schools (also called private or public) use different published measures
        from state schools.
      </p>
    </div>
  );
}
