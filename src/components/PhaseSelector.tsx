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
      aria-label="School stages and care categories to include"
      data-tour={tourId}
    >
      <div className="phase-selector-heading">
        <span className="phase-selector-label">Stages &amp; care</span>
        <SelectorHelp label="About stages and care">
          <strong>Early years</strong> covers nurseries and school reception
          settings. <strong>Childminders</strong> are a separate category —
          often wrap-around care outside school hours — with a directory and
          vetting checklist, not the nursery Ofsted table. School stages
          (KS1–KS4) use <strong>AND</strong> logic when several are selected.
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
