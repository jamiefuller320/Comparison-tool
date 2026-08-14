"use client";

import { useEffect, useId, useState } from "react";
import { FloatingControls } from "@/components/FloatingControls";
import { AccountMenu } from "@/components/AccountMenu";
import { useUiPreferences } from "@/components/UiPreferencesProvider";
import { requestTourStart } from "@/lib/tour";
import { requestOpenFeedback } from "@/lib/productFeedback";

const PRIMARY_LINKS = [
  { href: "/areas/", label: "Areas" },
  { href: "/guides/", label: "Guides" },
  { href: "/#nearby", label: "Near home" },
  { href: "/#compare", label: "Shortlist" },
  { href: "/#side-by-side", label: "Side by side" },
  { href: "/#how", label: "How to read" },
  { href: "/#data", label: "Data" },
] as const;

export function SiteHeader() {
  const { prefs, hydrated, setFloatingControls } = useUiPreferences();
  const floatingOn = hydrated && prefs.floatingControls;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="site-header" role="banner">
        <div className="shell header-inner">
          <a className="brand" href="/" aria-label="School Compass home">
            School<span>Compass</span>
          </a>
          <div className="header-actions">
            <AccountMenu />
            <button
              type="button"
              className={
                floatingOn
                  ? "header-pref-toggle on header-desktop-only"
                  : "header-pref-toggle header-desktop-only"
              }
              aria-pressed={floatingOn}
              title="Keep quick page links visible while you scroll"
              onClick={() => setFloatingControls(!prefs.floatingControls)}
            >
              Float jump links
            </button>
            <button
              type="button"
              className="tour-launch header-desktop-only"
              onClick={() => requestTourStart()}
            >
              How to use
            </button>
            <button
              type="button"
              className="tour-launch header-desktop-only"
              title="School Compass is under development — share structured feedback"
              onClick={() => requestOpenFeedback("manual")}
            >
              Feedback
            </button>
            <nav className="nav-links" aria-label="Primary">
              {PRIMARY_LINKS.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
            <button
              type="button"
              className="nav-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="nav-menu-toggle-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="nav-menu-toggle-label">
                {menuOpen ? "Close" : "Menu"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          className="nav-drawer-backdrop no-print"
          onClick={closeMenu}
          aria-hidden="true"
        />
      ) : null}

      <div
        id={menuId}
        className={menuOpen ? "nav-drawer open no-print" : "nav-drawer no-print"}
        role="dialog"
        aria-modal={menuOpen}
        aria-label="Site menu"
        hidden={!menuOpen}
      >
        <nav className="nav-drawer-links" aria-label="Mobile primary">
          {PRIMARY_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="nav-drawer-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              closeMenu();
              requestTourStart();
            }}
          >
            How to use
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              closeMenu();
              requestOpenFeedback("manual");
            }}
          >
            Feedback
          </button>
          <button
            type="button"
            className={floatingOn ? "btn btn-ghost on" : "btn btn-ghost"}
            aria-pressed={floatingOn}
            onClick={() => setFloatingControls(!prefs.floatingControls)}
          >
            {floatingOn ? "Float jump links on" : "Float jump links off"}
          </button>
        </div>
      </div>

      <FloatingControls />
    </>
  );
}
