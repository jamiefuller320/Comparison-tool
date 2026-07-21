"use client";

import { PHASE_OPTIONS, type PhaseId } from "@/lib/phases";

export function PhaseSelector({
  selected,
  onChange,
  tone = "light",
}: {
  selected: PhaseId[];
  onChange: (next: PhaseId[]) => void;
  tone?: "light" | "hero";
}) {
  function toggle(id: PhaseId) {
    if (selected.includes(id)) {
      // Keep at least one phase selected so the shortlist stays purposeful
      if (selected.length === 1) return;
      onChange(selected.filter((p) => p !== id));
      return;
    }
    onChange([...selected, id]);
  }

  return (
    <div
      className={tone === "hero" ? "phase-selector hero-phase" : "phase-selector"}
      role="group"
      aria-label="School stages to include"
    >
      <span className="phase-selector-label">Stages</span>
      <div className="phase-chips">
        {PHASE_OPTIONS.map((option) => {
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
        Settings that span more than one stage (for example primary or all-through)
        stay listed whenever any of their stages is selected.
      </p>
    </div>
  );
}
