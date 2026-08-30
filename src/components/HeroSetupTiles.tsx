"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { BinderTabs, type BinderTabItem } from "@/components/BinderTabs";

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
  const prevCompleted = useRef(completed);
  const visibleIds = TILE_ORDER.filter((id) => children[id] != null);
  const activeMeta = TILE_META[activeId];
  const activeSummary = summaries[activeId];

  useEffect(() => {
    const was = prevCompleted.current[activeId];
    const now = completed[activeId];
    prevCompleted.current = { ...prevCompleted.current, ...completed };
    if (!now || was) return;
    // Live walkthrough drives tiles itself — don't steal the spotlight.
    if (document.documentElement.classList.contains("tour-running")) return;
    const order = TILE_ORDER.filter((id) => children[id] != null);
    const idx = order.indexOf(activeId);
    const next = order[idx + 1];
    if (next) onActiveChange(next);
  }, [activeId, completed, onActiveChange, children]);

  const items: BinderTabItem<HeroTileId>[] = visibleIds.map((id) => {
    const meta = TILE_META[id];
    const summary = summaries[id];
    return {
      id,
      label: meta.label,
      shortLabel: meta.short,
      step: meta.step,
      done: Boolean(completed[id]),
      title: summary ? `${meta.label}: ${summary}` : `Open ${meta.label}`,
    };
  });

  return (
    <BinderTabs
      className="hero-binder"
      tone="harbour"
      ariaLabel="Shortlist setup"
      dataTour="hero-tiles"
      items={items}
      activeId={activeId}
      onChange={onActiveChange}
      sheetHeader={
        <header className="binder-sheet-head hero-tile-head">
          <h3>{activeMeta.label}</h3>
          {activeSummary ? <p>{activeSummary}</p> : null}
        </header>
      }
      sheet={<div className="hero-tile-body">{children[activeId]}</div>}
    />
  );
}
