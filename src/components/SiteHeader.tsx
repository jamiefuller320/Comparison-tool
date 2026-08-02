"use client";

import { FloatingControls } from "@/components/FloatingControls";
import { AccountMenu } from "@/components/AccountMenu";
import { useUiPreferences } from "@/components/UiPreferencesProvider";
import { requestTourStart } from "@/lib/tour";
import { requestOpenFeedback } from "@/lib/productFeedback";

export function SiteHeader() {
  const { prefs, hydrated, setFloatingControls } = useUiPreferences();
  const floatingOn = hydrated && prefs.floatingControls;

  return (
    <>
      <header className="site-header" role="banner">
        <div className="shell header-inner">
          <a className="brand" href="#top" aria-label="School Compass home">
            School<span>Compass</span>
          </a>
          <div className="header-actions">
            <AccountMenu />
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
              Float jump links
            </button>
            <button
              type="button"
              className="tour-launch"
              onClick={() => requestTourStart()}
            >
              How to use
            </button>
            <button
              type="button"
              className="tour-launch"
              title="School Compass is under development — share structured feedback"
              onClick={() => requestOpenFeedback("manual")}
            >
              Feedback
            </button>
            <nav className="nav-links" aria-label="Primary">
              <a href="#nearby">Near home</a>
              <a href="#compare">Shortlist</a>
              <a href="#side-by-side">Side by side</a>
              <a href="#how">How to read</a>
              <a href="#data">Data</a>
            </nav>
          </div>
        </div>
      </header>
      <FloatingControls />
    </>
  );
}
