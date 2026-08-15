"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
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
  const binderRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<HeroTileId, HTMLButtonElement | null>>>(
    {},
  );
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

  useLayoutEffect(() => {
    const binder = binderRef.current;
    let raf = 0;

    function syncSeamGap() {
      const tab = tabRefs.current[activeId];
      if (!binder || !tab) return;
      const binderBox = binder.getBoundingClientRect();
      const tabBox = tab.getBoundingClientRect();
      // Gap between the inner edges of the active tab’s side strokes so those
      // strokes sit on top of the seam ends (clean L-joins, no cross/hairline).
      const start = Math.round(
        Math.max(0, tabBox.left - binderBox.left + 1),
      );
      const end = Math.round(
        Math.min(binderBox.width, tabBox.right - binderBox.left - 1),
      );
      binder.style.setProperty("--seam-gap-start", `${start}px`);
      binder.style.setProperty("--seam-gap-end", `${Math.max(start, end)}px`);
    }

    function syncSoon() {
      syncSeamGap();
      cancelAnimationFrame(raf);
      // Second frame catches late flex/font layout after the tab switch.
      raf = requestAnimationFrame(() => {
        syncSeamGap();
        raf = requestAnimationFrame(syncSeamGap);
      });
    }

    syncSoon();
    const observer = new ResizeObserver(syncSoon);
    if (binder) observer.observe(binder);
    const tab = tabRefs.current[activeId];
    if (tab) observer.observe(tab);
    window.addEventListener("resize", syncSoon);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", syncSoon);
    };
  }, [activeId, visibleIds.length]);

  return (
    <div
      ref={binderRef}
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
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
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
