"use client";

import { PHASE_OPTIONS, type PhaseId } from "@/lib/phases";
import { SelectorHelp } from "@/components/SelectorHelp";

export function PhaseSelector({
  selected,
  onChange,
  tone = "light",
  tourId,
}: {
  selected: PhaseId[];
  onChange: (next: PhaseId[]) => void;
  tone?: "light" | "hero";
  /** Optional walkthrough anchor (`data-tour`). */
  tourId?: string;
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
      data-tour={tourId}
    >
      <div className="phase-selector-heading">
        <span className="phase-selector-label">Stages</span>
        <SelectorHelp label="About stages">
          When several stages are selected, only settings that offer{" "}
          <strong>all</strong> of them are listed (for example KS3 + KS4 shows
          secondary and all-through schools). Comparison tables follow these
          stages: KS1 → local-authority phonics context; KS2 → Year 6 results;
          KS3/KS4 → GCSE / 16–18 measures.
        </SelectorHelp>
      </div>
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
    </div>
  );
}
