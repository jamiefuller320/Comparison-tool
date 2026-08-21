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
import {
  CompareViewControls,
  type CompareViewMode,
} from "@/components/CompareViewControls";

/**
 * Ring-binder compare sections — mirrors HeroSetupTiles chrome and position.
 * Context is always the first tab; Summary (when provided) sits next; data sections follow.
 */
export function CompareSectionTabs({
  schools,
  activeId,
  onActiveChange,
  contextSlot,
  contextSummary,
  summarySlot,
  viewMode,
  onViewModeChange,
  focusUrn,
  onFocusUrnChange,
  children,
}: {
  schools: SchoolRecord[];
  activeId: CompareSectionId;
  onActiveChange: (id: CompareSectionId) => void;
  /** Guidance, coverage, provenance, and other framing — shown in Context. */
  contextSlot: ReactNode;
  contextSummary?: string;
  /** Parent headlines — shown in Summary between Context and Ofsted. */
  summarySlot?: ReactNode;
  viewMode?: CompareViewMode;
  onViewModeChange?: (mode: CompareViewMode) => void;
  focusUrn?: string | null;
  onFocusUrnChange?: (urn: string) => void;
  children: Partial<Record<CompareSectionId, ReactNode>>;
}) {
  const sectionIds = COMPARE_SECTION_ORDER.filter((id) => {
    if (id === "context") return true;
    if (id === "summary") return summarySlot != null;
    return children[id] != null;
  });
  const activeMeta = COMPARE_SECTION_META[activeId];
  const activeSummary =
    activeId === "context"
      ? contextSummary || compareSectionSummary("context", schools)
      : activeId === "summary"
        ? compareSectionSummary("summary", schools)
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
          : id === "summary"
            ? Boolean(summarySlot)
            : compareSectionHasData(id, schools),
      title: summary ? `${meta.label}: ${summary}` : `Open ${meta.label}`,
    };
  });

  const showViewControls =
    Boolean(viewMode && onViewModeChange && onFocusUrnChange) &&
    schools.length >= 2 &&
    activeId !== "context" &&
    activeId !== "summary";

  let activeBody: ReactNode;
  if (activeId === "context") {
    activeBody = (
      <div className="hero-tile-body compare-context-body">{contextSlot}</div>
    );
  } else if (activeId === "summary") {
    activeBody = (
      <div className="hero-tile-body compare-summary-body">{summarySlot}</div>
    );
  } else {
    activeBody = (
      <div className="hero-tile-body compare-section-body">
        {children[activeId]}
      </div>
    );
  }

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
          {showViewControls &&
          viewMode &&
          onViewModeChange &&
          onFocusUrnChange ? (
            <CompareViewControls
              schools={schools}
              mode={viewMode}
              onModeChange={onViewModeChange}
              focusUrn={focusUrn ?? null}
              onFocusUrnChange={onFocusUrnChange}
            />
          ) : null}
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
