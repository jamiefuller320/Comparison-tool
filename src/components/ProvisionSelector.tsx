"use client";

import {
  PROVISION_OPTIONS,
  type ProvisionFilterId,
} from "@/lib/provisionFilter";
import { SelectorHelp } from "@/components/SelectorHelp";

export function ProvisionSelector({
  selected,
  onChange,
  tone = "light",
  tourId,
}: {
  selected: ProvisionFilterId;
  onChange: (next: ProvisionFilterId) => void;
  tone?: "light" | "hero";
  tourId?: string;
}) {
  return (
    <div
      className={
        tone === "hero"
          ? "phase-selector hero-phase provision-selector"
          : "phase-selector provision-selector"
      }
      role="radiogroup"
      aria-label="Specialist provision filter"
      data-tour={tourId}
    >
      <div className="phase-selector-heading">
        <span className="phase-selector-label">Specialist schools</span>
        <SelectorHelp label="About specialist provision">
          Filter special schools, alternative provision and pupil referral
          units. Use <strong>Specialist / AP</strong> when that is the search;
          use <strong>Mainstream</strong> to keep them out of a typical primary
          or secondary shortlist.
        </SelectorHelp>
      </div>
      <div className="phase-chips">
        {PROVISION_OPTIONS.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              role="radio"
              aria-checked={active}
              className={active ? "phase-chip active" : "phase-chip"}
              onClick={() => onChange(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
