"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type HeroTileId = "postcode" | "stages" | "sector" | "provision";

const TILE_META: Record<
  HeroTileId,
  { label: string; short: string; step: number }
> = {
  postcode: { label: "Home postcode", short: "Postcode", step: 1 },
  stages: { label: "Age & stages", short: "Stages", step: 2 },
  sector: { label: "School type", short: "Type", step: 3 },
  provision: { label: "Specialist", short: "Specialist", step: 4 },
};

/**
 * Compact overlapping labelled tiles for the hero setup flow.
 * Active tile is front-most; completed previous tiles auto-advance;
 * a corner tab on every tile stays selectable so options stay explicit.
 */
export function HeroSetupTiles({
  activeId,
  onActiveChange,
  completed,
  summaries,
  children,
}: {
  activeId: HeroTileId;
  onActiveChange: (id: HeroTileId) => void;
  completed: Partial<Record<HeroTileId, boolean>>;
  summaries: Partial<Record<HeroTileId, string>>;
  children: Record<HeroTileId, ReactNode>;
}) {
  const baseId = useId();
  const order: HeroTileId[] = ["postcode", "stages", "sector", "provision"];
  const prevCompleted = useRef(completed);

  // Auto-advance when the active tile newly becomes complete.
  useEffect(() => {
    const was = prevCompleted.current[activeId];
    const now = completed[activeId];
    prevCompleted.current = { ...prevCompleted.current, ...completed };
    if (!now || was) return;
    const idx = order.indexOf(activeId);
    for (let i = idx + 1; i < order.length; i += 1) {
      const next = order[i];
      if (next) {
        onActiveChange(next);
        break;
      }
    }
  }, [activeId, completed, onActiveChange]);

  return (
    <div className="hero-tiles" data-tour="hero-tiles">
      <ol className="hero-tiles-stack" aria-label="Shortlist setup">
        {order.map((id) => {
          if (children[id] == null) return null;
          const meta = TILE_META[id];
          const isActive = id === activeId;
          const isDone = Boolean(completed[id]);
          const summary = summaries[id];
          const panelId = `${baseId}-${id}-panel`;
          const tabId = `${baseId}-${id}-tab`;
          return (
            <li
              key={id}
              className={
                isActive
                  ? "hero-tile is-active"
                  : isDone
                    ? "hero-tile is-done"
                    : "hero-tile"
              }
              data-tile={id}
              style={{ ["--tile-step" as string]: meta.step }}
            >
              <button
                type="button"
                id={tabId}
                className="hero-tile-tab"
                aria-controls={panelId}
                aria-expanded={isActive}
                aria-current={isActive ? "step" : undefined}
                title={`Open ${meta.label}`}
                onClick={() => onActiveChange(id)}
              >
                <span className="hero-tile-tab-step">{meta.step}</span>
                <span className="hero-tile-tab-label">{meta.short}</span>
                {isDone && summary ? (
                  <span className="hero-tile-tab-summary">{summary}</span>
                ) : null}
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={tabId}
                className="hero-tile-panel"
                hidden={!isActive}
              >
                <header className="hero-tile-head">
                  <h3>{meta.label}</h3>
                  {summary ? <p>{summary}</p> : null}
                </header>
                <div className="hero-tile-body">{children[id]}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
