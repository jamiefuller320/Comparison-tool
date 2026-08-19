"use client";

import { type ReactNode } from "react";
import { BinderTabs, type BinderTabItem } from "@/components/BinderTabs";
import {
  COMPARE_SECTION_META,
  COMPARE_SECTION_ORDER,
  compareSectionHasData,
  compareSectionSummary,
  type CompareSectionId,
} from "@/lib/compareSections";
import type { SchoolRecord } from "@/lib/types";

/**
 * Ring-binder compare sections — mirrors HeroSetupTiles chrome and position.
 * Context is always the first tab; data sections follow.
 */
export function CompareSectionTabs({
  schools,
  activeId,
  onActiveChange,
  contextSlot,
  contextSummary,
  children,
}: {
  schools: SchoolRecord[];
  activeId: CompareSectionId;
  onActiveChange: (id: CompareSectionId) => void;
  /** Guidance, summaries, provenance, and other framing — shown in Context. */
  contextSlot: ReactNode;
  contextSummary?: string;
  children: Partial<Record<CompareSectionId, ReactNode>>;
}) {
  const sectionIds = COMPARE_SECTION_ORDER.filter(
    (id) => id === "context" || children[id] != null,
  );
  const activeMeta = COMPARE_SECTION_META[activeId];
  const activeSummary =
    activeId === "context"
      ? contextSummary || compareSectionSummary("context", schools)
      : compareSectionSummary(activeId, schools);

  const items: BinderTabItem<CompareSectionId>[] = sectionIds.map((id) => {
    const meta = COMPARE_SECTION_META[id];
    const summary =
      id === "context"
        ? contextSummary || compareSectionSummary("context", schools)
        : compareSectionSummary(id, schools);
    return {
      id,
      label: meta.label,
      shortLabel: meta.short,
      step: meta.step,
      done:
        id === "context"
          ? Boolean(contextSlot)
          : compareSectionHasData(id, schools),
      title: summary ? `${meta.label}: ${summary}` : `Open ${meta.label}`,
    };
  });

  const activeBody =
    activeId === "context" ? (
      <div className="hero-tile-body compare-context-body">{contextSlot}</div>
    ) : (
      <div className="hero-tile-body compare-section-body">
        {children[activeId]}
      </div>
    );

  return (
    <BinderTabs
      className="hero-binder compare-section-binder"
      tone="harbour"
      ariaLabel="Comparison sections"
      dataTour="compare-sections"
      items={items}
      activeId={activeId}
      onChange={onActiveChange}
      sheetHeader={
        <header className="binder-sheet-head hero-tile-head">
          <h3>{activeMeta.label}</h3>
          {activeSummary ? <p>{activeSummary}</p> : null}
        </header>
      }
      sheet={activeBody}
    />
  );
}

export function CompareSectionEmpty({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="empty-compare compare-section-empty" role="status">
      {children}
    </div>
  );
}
