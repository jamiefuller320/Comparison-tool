"use client";

import type { ReactNode } from "react";
import { ScrollRegion } from "@/components/ScrollRegion";
import { useUiPreferences } from "@/components/UiPreferencesProvider";
import type { CompareTableId } from "@/lib/uiPreferences";

export function CompareTableFrame({
  tableId,
  children,
}: {
  tableId: CompareTableId;
  children: ReactNode;
}) {
  const { prefs, setTableSticky } = useUiPreferences();
  const sticky = prefs.tables[tableId];

  return (
    <div className="compare-table-frame">
      <div
        className="compare-table-controls no-print"
        role="group"
        aria-label="Table label visibility"
      >
        <button
          type="button"
          className={
            sticky.stickyHeader
              ? "table-pin-toggle on"
              : "table-pin-toggle"
          }
          aria-pressed={sticky.stickyHeader}
          onClick={() =>
            setTableSticky(tableId, { stickyHeader: !sticky.stickyHeader })
          }
        >
          Pin column headings
        </button>
        <button
          type="button"
          className={
            sticky.stickyFirstColumn
              ? "table-pin-toggle on"
              : "table-pin-toggle"
          }
          aria-pressed={sticky.stickyFirstColumn}
          onClick={() =>
            setTableSticky(tableId, {
              stickyFirstColumn: !sticky.stickyFirstColumn,
            })
          }
        >
          Pin measure labels
        </button>
      </div>
      <ScrollRegion
        className="compare-board-scroll"
        hint="Scroll for more school data"
      >
        <div
          className="compare-board"
          data-sticky-header={sticky.stickyHeader ? "true" : "false"}
          data-sticky-first-column={
            sticky.stickyFirstColumn ? "true" : "false"
          }
        >
          {children}
        </div>
      </ScrollRegion>
    </div>
  );
}
