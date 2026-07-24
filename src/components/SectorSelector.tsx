"use client";

import { SECTOR_OPTIONS, type SectorId } from "@/lib/sectors";

export function SectorSelector({
  selected,
  onChange,
  tone = "light",
}: {
  selected: SectorId[];
  onChange: (next: SectorId[]) => void;
  tone?: "light" | "hero";
}) {
  function toggle(id: SectorId) {
    if (selected.includes(id)) {
      if (selected.length === 1) return;
      onChange(selected.filter((s) => s !== id));
      return;
    }
    onChange([...selected, id]);
  }

  return (
    <div
      className={
        tone === "hero" ? "phase-selector hero-phase sector-selector" : "phase-selector sector-selector"
      }
      role="group"
      aria-label="School funding sector"
    >
      <span className="phase-selector-label">School type</span>
      <div className="phase-chips">
        {SECTOR_OPTIONS.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              aria-pressed={active}
              className={active ? "phase-chip active" : "phase-chip"}
              onClick={() => toggle(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="phase-selector-hint">
        Independent schools (also called private or public schools) rarely publish
        the same Key Stage 2 table figures as state-funded schools, so they are
        listed separately.
      </p>
    </div>
  );
}
