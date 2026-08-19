"use client";

import { type ReactNode } from "react";
import { CompareTableFrame } from "@/components/CompareTableFrame";
import type { CompareTableId } from "@/lib/uiPreferences";

/** Shared compare-table shell: measure column + school headers + body rows. */
export function CompareSectionTable({
  tableId,
  headerCells,
  children,
}: {
  tableId: CompareTableId;
  headerCells: ReactNode;
  children: ReactNode;
}) {
  return (
    <CompareTableFrame tableId={tableId}>
      <table className="compare-table">
        <thead>
          <tr>
            <th scope="col">Measure</th>
            {headerCells}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </CompareTableFrame>
  );
}
