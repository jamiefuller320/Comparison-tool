"use client";

import {
  EY_SETTING_OPTIONS,
  toggleEySetting,
  type EySettingId,
} from "@/lib/eySettings";
import { SelectorHelp } from "@/components/SelectorHelp";

export function EySettingSelector({
  selected,
  onChange,
  tone = "light",
  tourId,
}: {
  selected: EySettingId[];
  onChange: (next: EySettingId[]) => void;
  tone?: "light" | "hero";
  tourId?: string;
}) {
  return (
    <div
      className={
        tone === "hero"
          ? "phase-selector hero-phase ey-setting-selector"
          : "phase-selector ey-setting-selector"
      }
      role="group"
      aria-label="Early years setting types"
      data-tour={tourId}
    >
      <div className="phase-selector-heading">
        <span className="phase-selector-label">Early years settings</span>
        <SelectorHelp label="About early years settings">
          Turn <strong>Nurseries</strong> and <strong>Childminders</strong> on
          or off for the map and search. Nurseries are Ofsted day-care settings;
          childminders are those who consented to publish an address. At least
          one option stays on while Early years is selected.
        </SelectorHelp>
      </div>
      <div className="ey-setting-sliders">
        {EY_SETTING_OPTIONS.map((option) => {
          const active = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={
                active ? "ey-setting-slider active" : "ey-setting-slider"
              }
              title={option.hint}
            >
              <span className="ey-setting-slider-text">
                <span className="ey-setting-slider-label">{option.label}</span>
                <span className="ey-setting-slider-hint">{option.hint}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={`${option.label}: ${active ? "shown" : "hidden"}`}
                className={active ? "ey-switch on" : "ey-switch"}
                onClick={() =>
                  onChange(toggleEySetting(selected, option.id as EySettingId))
                }
              >
                <span className="ey-switch-thumb" aria-hidden />
              </button>
            </label>
          );
        })}
      </div>
    </div>
  );
}
