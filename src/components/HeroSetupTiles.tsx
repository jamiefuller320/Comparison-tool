"use client";

import {
  useEffect,
  useId,
  useRef,
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

const TILE_ORDER: HeroTileId[] = [
  "postcode",
  "stages",
  "sector",
  "provision",
];

/**
 * Ring-binder style setup: one option sheet with index tabs along the top.
 * Completing the active step auto-advances; every tab stays selectable.
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
  const prevCompleted = useRef(completed);
  const visibleIds = TILE_ORDER.filter((id) => children[id] != null);
  const activeMeta = TILE_META[activeId];
  const activeSummary = summaries[activeId];
  const panelId = `${baseId}-panel`;
  const activeIndex = Math.max(0, visibleIds.indexOf(activeId));

  useEffect(() => {
    const was = prevCompleted.current[activeId];
    const now = completed[activeId];
    prevCompleted.current = { ...prevCompleted.current, ...completed };
    if (!now || was) return;
    const order = TILE_ORDER.filter((id) => children[id] != null);
    const idx = order.indexOf(activeId);
    const next = order[idx + 1];
    if (next) onActiveChange(next);
  }, [activeId, completed, onActiveChange, children]);

  return (
    <div
      className="hero-binder"
      data-tour="hero-tiles"
      data-active-index={activeIndex}
      data-tab-count={visibleIds.length}
    >
      <div
        className="hero-binder-tabs"
        role="tablist"
        aria-label="Shortlist setup"
      >
        {visibleIds.map((id) => {
          const meta = TILE_META[id];
          const isActive = id === activeId;
          const isDone = Boolean(completed[id]);
          const summary = summaries[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${baseId}-${id}-tab`}
              className={
                isActive
                  ? "hero-binder-tab is-active"
                  : isDone
                    ? "hero-binder-tab is-done"
                    : "hero-binder-tab"
              }
              aria-selected={isActive}
              aria-controls={panelId}
              title={
                summary ? `${meta.label}: ${summary}` : `Open ${meta.label}`
              }
              onClick={() => onActiveChange(id)}
            >
              <span className="hero-binder-tab-step">{meta.step}</span>
              <span className="hero-binder-tab-label">{meta.short}</span>
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${baseId}-${activeId}-tab`}
        className="hero-binder-sheet"
        data-tile={activeId}
      >
        <header className="hero-tile-head">
          <h3>{activeMeta.label}</h3>
          {activeSummary ? <p>{activeSummary}</p> : null}
        </header>
        <div className="hero-tile-body">{children[activeId]}</div>
      </div>
    </div>
  );
}
