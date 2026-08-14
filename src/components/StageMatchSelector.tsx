"use client";

import type { StageMatchMode } from "@/lib/phases";
import { schoolStageIds, type PhaseId } from "@/lib/phases";
import { SelectorHelp } from "@/components/SelectorHelp";

export function StageMatchSelector({
  selected,
  stages,
  onChange,
  tone = "light",
}: {
  selected: StageMatchMode;
  stages: PhaseId[];
  onChange: (next: StageMatchMode) => void;
  tone?: "light" | "hero";
}) {
  const schoolStages = schoolStageIds(stages);
  if (schoolStages.length < 2) return null;

  return (
    <div
      className={
        tone === "hero"
          ? "phase-selector hero-phase stage-match-selector"
          : "phase-selector stage-match-selector"
      }
      role="radiogroup"
      aria-label="How selected stages combine"
    >
      <div className="phase-selector-heading">
        <span className="phase-selector-label">Stage match</span>
        <SelectorHelp label="About matching several stages">
          By default a school appears if it covers <strong>any</strong> of the
          stages you selected (for example infants for KS1 or juniors for KS2).
          Choose <strong>Every selected stage</strong> when you specifically
          want settings that span all of them (all-through / primary covering
          KS1 and KS2 together).
        </SelectorHelp>
      </div>
      <div className="phase-chips">
        <button
          type="button"
          role="radio"
          aria-checked={selected === "any"}
          className={selected === "any" ? "phase-chip active" : "phase-chip"}
          title="Show schools that offer at least one selected stage"
          onClick={() => onChange("any")}
        >
          Any selected stage
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={selected === "all"}
          className={selected === "all" ? "phase-chip active" : "phase-chip"}
          title="Only schools that offer every selected stage"
          onClick={() => onChange("all")}
        >
          Every selected stage
        </button>
      </div>
    </div>
  );
}
