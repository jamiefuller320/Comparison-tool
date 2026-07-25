"use client";

import { useId, useState, type ReactNode } from "react";

/** Collapsed “?” control that expands selector explanatory text. */
export function SelectorHelp({
  label,
  children,
}: {
  /** Accessible name, e.g. “About stages”. */
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="selector-help">
      <button
        type="button"
        className={open ? "selector-help-btn open" : "selector-help-btn"}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? `Hide: ${label}` : label}
        title={label}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open ? (
        <div className="phase-selector-hint selector-help-panel" id={panelId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
