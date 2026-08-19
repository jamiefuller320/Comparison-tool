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
 * Ring-binder compare sections — mirrors setup tiles for side-by-side boards.
 * Each tab shows one category (Ofsted, website, places, performance).
 */
export function CompareSectionTabs({
  schools,
  activeId,
  onActiveChange,
  children,
}: {
  schools: SchoolRecord[];
  activeId: CompareSectionId;
  onActiveChange: (id: CompareSectionId) => void;
  children: Partial<Record<CompareSectionId, ReactNode>>;
}) {
  const visibleIds = COMPARE_SECTION_ORDER.filter((id) => children[id] != null);
  const activeMeta = COMPARE_SECTION_META[activeId];
  const activeSummary = compareSectionSummary(activeId, schools);

  const items: BinderTabItem<CompareSectionId>[] = visibleIds.map((id) => {
    const meta = COMPARE_SECTION_META[id];
    const summary = compareSectionSummary(id, schools);
    return {
      id,
      label: meta.label,
      shortLabel: meta.short,
      step: meta.step,
      done: compareSectionHasData(id, schools),
      title: summary ? `${meta.label}: ${summary}` : `Open ${meta.label}`,
    };
  });

  return (
    <BinderTabs
      className="compare-section-binder"
      tone="paper"
      ariaLabel="Comparison sections"
      dataTour="compare-sections"
      items={items}
      activeId={activeId}
      onChange={onActiveChange}
      sheetHeader={
        <header className="binder-sheet-head compare-section-head">
          <h3>{activeMeta.label}</h3>
          <p>{activeSummary || activeMeta.lead}</p>
        </header>
      }
      sheet={
        <div className="compare-section-body">{children[activeId]}</div>
      }
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
