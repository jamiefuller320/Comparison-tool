"use client";

import { useEffect, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import { shortName } from "@/lib/format";

export type CompareViewMode = "columns" | "school";

/** Side-by-side (all schools) vs focus on one school at a time. */
export function useCompareView(schools: SchoolRecord[]) {
  const [mode, setMode] = useState<CompareViewMode>("columns");
  const [focusUrn, setFocusUrn] = useState<string | null>(
    schools[0]?.urn ?? null,
  );
  const urnKey = schools.map((s) => s.urn).join(",");

  useEffect(() => {
    if (!schools.length) {
      setFocusUrn(null);
      return;
    }
    if (!focusUrn || !schools.some((s) => s.urn === focusUrn)) {
      setFocusUrn(schools[0]?.urn ?? null);
    }
  }, [urnKey, focusUrn, schools]);

  const viewSchools =
    mode === "school" && focusUrn
      ? schools.filter((s) => s.urn === focusUrn)
      : schools;

  return { mode, setMode, focusUrn, setFocusUrn, viewSchools };
}

export function CompareViewControls({
  schools,
  mode,
  onModeChange,
  focusUrn,
  onFocusUrnChange,
}: {
  schools: SchoolRecord[];
  mode: CompareViewMode;
  onModeChange: (mode: CompareViewMode) => void;
  focusUrn: string | null;
  onFocusUrnChange: (urn: string) => void;
}) {
  if (schools.length < 2) return null;

  return (
    <div className="compare-view-controls">
      <div
        className="compare-view-toggle"
        role="group"
        aria-label="Compare layout"
      >
        <button
          type="button"
          className={
            mode === "columns"
              ? "compare-view-btn active"
              : "compare-view-btn"
          }
          aria-pressed={mode === "columns"}
          onClick={() => onModeChange("columns")}
        >
          Side by side
        </button>
        <button
          type="button"
          className={
            mode === "school" ? "compare-view-btn active" : "compare-view-btn"
          }
          aria-pressed={mode === "school"}
          onClick={() => onModeChange("school")}
        >
          By school
        </button>
      </div>
      {mode === "school" ? (
        <div
          className="compare-view-schools"
          role="group"
          aria-label="School to focus"
        >
          {schools.map((school) => {
            const selected = school.urn === focusUrn;
            return (
              <button
                key={school.urn}
                type="button"
                className={
                  selected
                    ? "compare-view-school active"
                    : "compare-view-school"
                }
                aria-pressed={selected}
                title={school.name}
                onClick={() => onFocusUrnChange(school.urn)}
              >
                {shortName(school.name, 28)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
