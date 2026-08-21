"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import {
  ageWindowFromStages,
  applyChildAgeWindowToStages,
  CHILD_AGE_MAX,
  CHILD_AGE_MIN,
  PHASE_OPTIONS,
  samePhaseSet,
  schoolStageIds,
  stagesFromChildAgeWindow,
  type PhaseId,
} from "@/lib/phases";
import { SelectorHelp } from "@/components/SelectorHelp";

function formatAgeLabel(lo: number, hi: number): string {
  if (lo === hi) return `Age ${lo}`;
  return `Ages ${lo}–${hi}`;
}

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
  const baseId = useId();
  const initial = ageWindowFromStages(selected);
  const [ageLo, setAgeLo] = useState(initial.lo);
  const [ageHi, setAgeHi] = useState(initial.hi);
  /** Age slider drives chips until a stage chip is toggled manually. */
  const [driveMode, setDriveMode] = useState<"age" | "manual">("age");

  // When stages change from outside (URL, school-type defaults) while age-driven,
  // keep the slider in sync. Manual mode leaves the last age window alone.
  useEffect(() => {
    if (driveMode !== "age") return;
    const expected = stagesFromChildAgeWindow(ageLo, ageHi);
    const currentSchool = schoolStageIds(selected);
    if (samePhaseSet(expected, currentSchool)) return;
    const win = ageWindowFromStages(selected);
    setAgeLo(win.lo);
    setAgeHi(win.hi);
  }, [selected, driveMode, ageLo, ageHi]);

  function applyAge(nextLo: number, nextHi: number) {
    const lo = Math.min(nextLo, nextHi);
    const hi = Math.max(nextLo, nextHi);
    setAgeLo(lo);
    setAgeHi(hi);
    setDriveMode("age");
    onChange(applyChildAgeWindowToStages(selected, lo, hi));
  }

  function toggle(id: PhaseId) {
    setDriveMode("manual");
    if (selected.includes(id)) {
      // Allow a fully empty set — Continue asks for a stage if none remain.
      onChange(selected.filter((p) => p !== id));
      return;
    }
    onChange([...selected, id]);
  }

  const loPct =
    ((ageLo - CHILD_AGE_MIN) / (CHILD_AGE_MAX - CHILD_AGE_MIN)) * 100;
  const hiPct =
    ((ageHi - CHILD_AGE_MIN) / (CHILD_AGE_MAX - CHILD_AGE_MIN)) * 100;
  const ageSummary = formatAgeLabel(ageLo, ageHi);
  const implied = stagesFromChildAgeWindow(ageLo, ageHi);
  const impliedLabels = PHASE_OPTIONS.filter((o) => implied.includes(o.id))
    .map((o) => o.short)
    .join(" · ");

  return (
    <div
      className={tone === "hero" ? "phase-selector hero-phase" : "phase-selector"}
      role="group"
      aria-label="School stages and care categories to include"
      data-tour={tourId}
    >
      <div className="phase-selector-heading">
        <span className="phase-selector-label">Child&apos;s age</span>
        <SelectorHelp label="About ages and key stages">
          Drag the age range if key stages are unfamiliar — we turn on the
          matching school stages (Early years through KS4). You can still press
          the stage buttons to override. <strong>Childminders</strong> stay a
          separate care category and are not driven by the age slider. When
          several school stages are selected, a school appears if it covers{" "}
          <strong>any</strong> of them — use{" "}
          <strong>Every selected stage</strong> below when you specifically want
          settings that span all of them.
        </SelectorHelp>
      </div>

      <div
        className={
          driveMode === "manual"
            ? "age-range-control is-manual"
            : "age-range-control"
        }
      >
        <div className="age-range-summary">
          <strong>{ageSummary}</strong>
          <span>
            {driveMode === "age"
              ? impliedLabels
                ? `→ ${impliedLabels}`
                : "→ pick an age"
              : "Stages set manually — drag ages to sync again"}
          </span>
        </div>

        <div className="age-range-slider">
          <div
            className="age-range-track"
            aria-hidden
            style={
              {
                "--age-lo": `${loPct}%`,
                "--age-hi": `${hiPct}%`,
              } as CSSProperties
            }
          />
          <label className="visually-hidden" htmlFor={`${baseId}-lo`}>
            Youngest age
          </label>
          <input
            id={`${baseId}-lo`}
            className="age-range-input age-range-input-lo"
            type="range"
            min={CHILD_AGE_MIN}
            max={CHILD_AGE_MAX}
            step={1}
            value={ageLo}
            aria-valuetext={`${ageLo} years`}
            onChange={(e) => {
              const next = Number(e.target.value);
              applyAge(next, Math.max(next, ageHi));
            }}
          />
          <label className="visually-hidden" htmlFor={`${baseId}-hi`}>
            Oldest age
          </label>
          <input
            id={`${baseId}-hi`}
            className="age-range-input age-range-input-hi"
            type="range"
            min={CHILD_AGE_MIN}
            max={CHILD_AGE_MAX}
            step={1}
            value={ageHi}
            aria-valuetext={`${ageHi} years`}
            onChange={(e) => {
              const next = Number(e.target.value);
              applyAge(Math.min(ageLo, next), next);
            }}
          />
        </div>

        <div className="age-range-scale" aria-hidden>
          <span>{CHILD_AGE_MIN}</span>
          <span>4</span>
          <span>7</span>
          <span>11</span>
          <span>14</span>
          <span>{CHILD_AGE_MAX}</span>
        </div>
      </div>

      <div className="phase-selector-heading phase-selector-stages-heading">
        <span className="phase-selector-label">Stages &amp; care</span>
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
              <span className="phase-chip-main">{option.label}</span>
              {option.ages ? (
                <span className="phase-chip-ages">{option.ages}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
