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
 *
 * When a sheet is present, `data-stuck` flips once the tab strip has pinned
 * and separated from the attached frame so CSS can draw a bottom edge.
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

    function pinStrip(): HTMLElement | null {
      if (!binder) return null;
      const rail = binder.querySelector(":scope > .binder-rail");
      if (rail instanceof HTMLElement) return rail;
      const tabs = binder.querySelector(":scope > .binder-tabs");
      return tabs instanceof HTMLElement ? tabs : null;
    }

    function syncSeamGap() {
      const tab = tabRefs.current[activeId];
      const sheetEl = binder?.querySelector(".binder-sheet");
      if (!binder || !tab || !(sheetEl instanceof HTMLElement)) return;
      // Measure against the sheet — not the binder — so leading chrome
      // (How to use) cannot offset the gap under the active tab.
      const sheetBox = sheetEl.getBoundingClientRect();
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

    function syncStuckState() {
      if (!binder) return;
      const strip = pinStrip();
      const sheetEl = binder.querySelector(".binder-sheet");
      if (!strip || !(sheetEl instanceof HTMLElement)) {
        binder.dataset.stuck = "false";
        return;
      }
      const stripBox = strip.getBoundingClientRect();
      const sheetBox = sheetEl.getBoundingClientRect();
      // Attached: sheet top sits flush under the tab strip. Separated: the
      // sheet has scrolled up under (or past) the pinned strip.
      const separated = sheetBox.top < stripBox.bottom - 2;
      binder.dataset.stuck = separated ? "true" : "false";

      if (binder.classList.contains("journey-chapter-binder")) {
        document.documentElement.style.setProperty(
          "--journey-rail-height",
          `${Math.ceil(stripBox.height)}px`,
        );
      }
    }

    function syncSoon() {
      syncSeamGap();
      syncStuckState();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        syncSeamGap();
        syncStuckState();
        raf = requestAnimationFrame(() => {
          syncSeamGap();
          syncStuckState();
        });
      });
    }

    syncSoon();
    const observer = new ResizeObserver(syncSoon);
    if (binder) observer.observe(binder);
    const sheetEl = binder?.querySelector(".binder-sheet");
    if (sheetEl) observer.observe(sheetEl);
    const strip = pinStrip();
    if (strip) observer.observe(strip);
    const tab = tabRefs.current[activeId];
    if (tab) observer.observe(tab);
    window.addEventListener("resize", syncSoon);
    window.addEventListener("scroll", syncStuckState, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", syncSoon);
      window.removeEventListener("scroll", syncStuckState);
    };
  }, [activeId, hasSheet, items.length]);

  return (
    <div
      ref={binderRef}
      className={["binder", className].filter(Boolean).join(" ")}
      data-tone={tone}
      data-mode={hasSheet ? "sheet" : "tabs"}
      data-leading={hasLeading ? "true" : "false"}
      data-stuck="false"
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
