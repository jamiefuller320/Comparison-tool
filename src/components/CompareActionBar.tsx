"use client";

import { ShareShortlistButton } from "@/components/ShareShortlistButton";
import { PrintComparisonPackButton } from "@/components/PrintComparisonPackButton";
import {
  COMPARE_PATH_OPTIONS,
  type ComparePathId,
} from "@/lib/comparePaths";

/**
 * Toolbar between chapter tabs and compare section binder:
 * share, print, and key-stage / path switches.
 */
export function CompareActionBar({
  schoolNames,
  availablePaths,
  activePath,
  onPathChange,
  shortlistPaths,
  canPrint,
}: {
  schoolNames: string[];
  availablePaths: ComparePathId[];
  activePath: ComparePathId | null;
  onPathChange: (id: ComparePathId) => void;
  shortlistPaths: ComparePathId[];
  canPrint: boolean;
}) {
  const shortlisted = new Set(shortlistPaths);
  const pathOptions = COMPARE_PATH_OPTIONS.filter((opt) =>
    availablePaths.includes(opt.id),
  );

  if (schoolNames.length === 0 && pathOptions.length === 0) return null;

  return (
    <div className="compare-action-bar no-print" role="toolbar" aria-label="Comparison actions">
      <div className="compare-action-bar-primary">
        <ShareShortlistButton
          schoolNames={schoolNames}
          label="Share this comparison"
          idleLabel="Share this comparison"
        />
        <PrintComparisonPackButton disabled={!canPrint} />
      </div>

      {pathOptions.length > 0 ? (
        <div
          className="compare-action-bar-paths"
          role="group"
          aria-label="Key stage comparison"
        >
          {pathOptions.map((opt) => {
            const isActive = opt.id === activePath;
            const onShortlist = shortlisted.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                className={
                  isActive
                    ? "compare-path-chip active"
                    : "compare-path-chip"
                }
                aria-pressed={isActive}
                title={
                  onShortlist
                    ? `${opt.label} (on your shortlist)`
                    : opt.label
                }
                onClick={() => onPathChange(opt.id)}
              >
                {opt.shortLabel}
                {onShortlist ? (
                  <span className="compare-path-chip-badge" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
