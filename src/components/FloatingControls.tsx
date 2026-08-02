"use client";

import { useUiPreferences } from "@/components/UiPreferencesProvider";

export function FloatingControls() {
  const { prefs, hydrated } = useUiPreferences();
  if (!hydrated || !prefs.floatingControls) return null;

  return (
    <div
      className="floating-controls no-print"
      role="navigation"
      aria-label="Quick page controls"
    >
      <div className="floating-controls-inner">
        <span className="floating-controls-label">Jump</span>
        <a href="/#top">Home</a>
        <a href="/areas/">Areas</a>
        <a href="/#nearby">Near home</a>
        <a href="/#compare">Shortlist</a>
        <a href="/#side-by-side">Side by side</a>
        <a href="/#how">How to read</a>
        <a href="/#data">Data</a>
      </div>
    </div>
  );
}
