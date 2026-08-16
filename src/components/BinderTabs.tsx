"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

export type BinderTone = "harbour" | "paper";

export type BinderTabItem<Id extends string = string> = {
  id: Id;
  label: string;
  shortLabel?: string;
  step?: number;
  done?: boolean;
  badge?: boolean;
  title?: string;
};

/**
 * Shared ring-binder chrome: index tabs with a measured seam gap.
 * `harbour` = hero glass; `paper` = page sections / sticky chapter nav.
 * Pass `sheet` to render an attached panel; omit for tabs-only navigation.
 * Optional `leading` sits beside the tabs (e.g. How to use) while the sheet
 * spans the full width underneath.
 */
export function BinderTabs<Id extends string>({
  items,
  activeId,
  onChange,
  tone = "harbour",
  ariaLabel,
  sheet,
  sheetHeader,
  leading,
  className,
  dataTour,
}: {
  items: BinderTabItem<Id>[];
  activeId: Id;
  onChange: (id: Id) => void;
  tone?: BinderTone;
  ariaLabel: string;
  sheet?: ReactNode;
  sheetHeader?: ReactNode;
  leading?: ReactNode;
  className?: string;
  dataTour?: string;
}) {
  const baseId = useId();
  const binderRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<Id, HTMLButtonElement | null>>>(
    {},
  );
  const panelId = `${baseId}-panel`;
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const hasSheet = sheet != null;
  const hasLeading = leading != null;

  useLayoutEffect(() => {
    if (!hasSheet) return;
    const binder = binderRef.current;
    let raf = 0;

    function syncSeamGap() {
      const tab = tabRefs.current[activeId];
      const sheet = binder?.querySelector(".binder-sheet");
      if (!binder || !tab || !(sheet instanceof HTMLElement)) return;
      // Measure against the sheet — not the binder — so leading chrome
      // (How to use) cannot offset the gap under the active tab.
      const sheetBox = sheet.getBoundingClientRect();
      const tabBox = tab.getBoundingClientRect();
      const start = Math.round(
        Math.max(0, tabBox.left - sheetBox.left + 1),
      );
      const end = Math.round(
        Math.min(sheetBox.width, tabBox.right - sheetBox.left - 1),
      );
      binder.style.setProperty("--seam-gap-start", `${start}px`);
      binder.style.setProperty("--seam-gap-end", `${Math.max(start, end)}px`);
    }

    function syncSoon() {
      syncSeamGap();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        syncSeamGap();
        raf = requestAnimationFrame(syncSeamGap);
      });
    }

    syncSoon();
    const observer = new ResizeObserver(syncSoon);
    if (binder) observer.observe(binder);
    const sheet = binder?.querySelector(".binder-sheet");
    if (sheet) observer.observe(sheet);
    const tab = tabRefs.current[activeId];
    if (tab) observer.observe(tab);
    window.addEventListener("resize", syncSoon);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", syncSoon);
    };
  }, [activeId, hasSheet, items.length]);

  return (
    <div
      ref={binderRef}
      className={["binder", className].filter(Boolean).join(" ")}
      data-tone={tone}
      data-mode={hasSheet ? "sheet" : "tabs"}
      data-leading={hasLeading ? "true" : "false"}
      data-active-index={activeIndex}
      data-tab-count={items.length}
      data-tour={dataTour}
      style={
        {
          "--binder-tab-count": String(items.length),
        } as CSSProperties
      }
    >
      {hasLeading ? (
        <div className="binder-rail">
          <div className="binder-leading">{leading}</div>
          <div className="binder-tabs" role="tablist" aria-label={ariaLabel}>
            {items.map((item) => {
              const isActive = item.id === activeId;
              const isDone = Boolean(item.done);
              const label = item.shortLabel || item.label;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-${item.id}-tab`}
                  ref={(el) => {
                    tabRefs.current[item.id] = el;
                  }}
                  className={
                    isActive
                      ? "binder-tab is-active"
                      : isDone
                        ? "binder-tab is-done"
                        : "binder-tab"
                  }
                  aria-selected={isActive}
                  aria-controls={hasSheet ? panelId : undefined}
                  title={item.title || `Open ${item.label}`}
                  onClick={() => onChange(item.id)}
                >
                  {item.step != null ? (
                    <span className="binder-tab-step">{item.step}</span>
                  ) : null}
                  <span className="binder-tab-label">{label}</span>
                  {item.badge ? (
                    <span className="binder-tab-badge" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="binder-tabs" role="tablist" aria-label={ariaLabel}>
          {items.map((item) => {
            const isActive = item.id === activeId;
            const isDone = Boolean(item.done);
            const label = item.shortLabel || item.label;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${baseId}-${item.id}-tab`}
                ref={(el) => {
                  tabRefs.current[item.id] = el;
                }}
                className={
                  isActive
                    ? "binder-tab is-active"
                    : isDone
                      ? "binder-tab is-done"
                      : "binder-tab"
                }
                aria-selected={isActive}
                aria-controls={hasSheet ? panelId : undefined}
                title={item.title || `Open ${item.label}`}
                onClick={() => onChange(item.id)}
              >
                {item.step != null ? (
                  <span className="binder-tab-step">{item.step}</span>
                ) : null}
                <span className="binder-tab-label">{label}</span>
                {item.badge ? (
                  <span className="binder-tab-badge" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {hasSheet ? (
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${baseId}-${activeId}-tab`}
          className="binder-sheet"
        >
          {sheetHeader}
          <div className="binder-sheet-body">{sheet}</div>
        </div>
      ) : null}
    </div>
  );
}
