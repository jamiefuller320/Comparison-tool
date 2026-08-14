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
        <span className="phase-selector-label">Combine stages</span>
        <SelectorHelp label="About matching several stages">
          <strong>Any stage (OR)</strong> is the default — infants for KS1 or
          juniors for KS2 both appear when both chips are on.{" "}
          <strong>Every stage (AND)</strong> keeps only settings that span all
          selected stages (for example a primary covering KS1 and KS2).
        </SelectorHelp>
      </div>
      <div className="phase-chips stage-match-chips">
        <button
          type="button"
          role="radio"
          aria-checked={selected === "any"}
          className={selected === "any" ? "phase-chip active" : "phase-chip"}
          title="Show schools that offer at least one selected stage"
          onClick={() => onChange("any")}
        >
          Any stage <span className="stage-match-logic">OR</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={selected === "all"}
          className={selected === "all" ? "phase-chip active" : "phase-chip"}
          title="Only schools that offer every selected stage"
          onClick={() => onChange("all")}
        >
          Every stage <span className="stage-match-logic">AND</span>
        </button>
      </div>
      <p className="stage-match-hint" aria-live="polite">
        {selected === "all"
          ? "Only schools that cover every selected stage."
          : "Schools that cover any one of the selected stages."}
      </p>
    </div>
  );
}
