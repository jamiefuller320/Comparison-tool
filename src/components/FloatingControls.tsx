"use client";

import { HomeSectionLink } from "@/components/HomeSectionLink";
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
        <HomeSectionLink hash="top">Home</HomeSectionLink>
        <a href="/areas/">Areas</a>
        <a href="/guides/">Guides</a>
        <HomeSectionLink hash="nearby">Near home</HomeSectionLink>
        <HomeSectionLink hash="compare">Shortlist</HomeSectionLink>
        <HomeSectionLink hash="side-by-side">Side by side</HomeSectionLink>
        <HomeSectionLink hash="how">How to read</HomeSectionLink>
        <HomeSectionLink hash="data">Data</HomeSectionLink>
      </div>
    </div>
  );
}
