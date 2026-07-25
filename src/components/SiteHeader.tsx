"use client";

import { requestTourStart } from "@/lib/tour";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="#top">
          School<span>side</span>
        </a>
        <div className="header-actions">
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
  );
}
