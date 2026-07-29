"use client";

import type { DataGap } from "@/lib/dataGaps";

/** Compact known-gap chips — honesty about fetch/join holes, not user disputes. */
export function DataGapFlags({
  gaps,
  compact = false,
}: {
  gaps: DataGap[];
  compact?: boolean;
}) {
  if (!gaps.length) return null;

  return (
    <ul
      className={
        compact ? "data-gap-flags data-gap-flags-compact" : "data-gap-flags"
      }
      aria-label="Known data gaps"
    >
      {gaps.map((gap) => (
        <li
          key={gap.id}
          className={
            gap.severity === "watch"
              ? "data-gap-chip data-gap-chip-watch"
              : "data-gap-chip data-gap-chip-info"
          }
          title={gap.detail || gap.label}
        >
          {gap.label}
        </li>
      ))}
    </ul>
  );
}
