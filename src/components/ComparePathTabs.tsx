"use client";

import {
  COMPARE_PATH_OPTIONS,
  type ComparePathId,
} from "@/lib/comparePaths";

export function ComparePathTabs({
  available,
  active,
  onChange,
  withShortlist,
}: {
  available: ComparePathId[];
  active: ComparePathId;
  onChange: (id: ComparePathId) => void;
  withShortlist: ComparePathId[];
}) {
  if (available.length <= 1) return null;

  const shortlisted = new Set(withShortlist);

  return (
    <div
      className="compare-path-tabs"
      role="tablist"
      aria-label="Comparison path"
      data-tour="compare-paths"
    >
      {COMPARE_PATH_OPTIONS.filter((opt) => available.includes(opt.id)).map(
        (opt) => {
          const selected = active === opt.id;
          const hasItems = shortlisted.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected ? "compare-path-tab active" : "compare-path-tab"
              }
              onClick={() => onChange(opt.id)}
            >
              {opt.shortLabel}
              {hasItems ? (
                <span className="compare-path-dot" aria-hidden />
              ) : null}
            </button>
          );
        },
      )}
    </div>
  );
}
