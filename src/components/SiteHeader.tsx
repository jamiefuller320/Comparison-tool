"use client";

import { FloatingControls } from "@/components/FloatingControls";
import { useUiPreferences } from "@/components/UiPreferencesProvider";
import { requestTourStart } from "@/lib/tour";

export function SiteHeader() {
  const { prefs, hydrated, setFloatingControls } = useUiPreferences();
  const floatingOn = hydrated && prefs.floatingControls;

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="#top">
            School<span>side</span>
          </a>
          <div className="header-actions">
            <button
              type="button"
              className={
                floatingOn
                  ? "header-pref-toggle on"
                  : "header-pref-toggle"
              }
              aria-pressed={floatingOn}
              title="Keep quick page links visible while you scroll"
              onClick={() => setFloatingControls(!prefs.floatingControls)}
            >
              Float controls
            </button>
            <button
              type="button"
              className="tour-launch"
              onClick={() => requestTourStart()}
            >
              How to use
            </button>
            <nav className="nav-links" aria-label="Primary">
              <a href="#nearby">Near home</a>
              <a href="#compare">Compare</a>
              <a href="#how">How to read this</a>
              <a href="#data">Data</a>
            </nav>
          </div>
        </div>
      </header>
      <FloatingControls />
    </>
  );
}
