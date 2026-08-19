"use client";

import { VisitPack } from "@/components/VisitPack";
import type { ComparePathId } from "@/lib/comparePaths";
import type { SchoolRecord } from "@/lib/types";
import type { PhaseId } from "@/lib/phases";
import type { SectorId } from "@/lib/sectors";

/** Single visit pack mount for side-by-side print + notes (path-aware). */
export function CompareVisitPack({
  activePath,
  eySelected,
  childminderSelected,
  ks1Selected,
  ks2Selected,
  ks4Selected,
  stages,
  sectors,
}: {
  activePath: ComparePathId | null;
  eySelected: SchoolRecord[];
  childminderSelected: SchoolRecord[];
  ks1Selected: SchoolRecord[];
  ks2Selected: SchoolRecord[];
  ks4Selected: SchoolRecord[];
  stages: PhaseId[];
  sectors: SectorId[];
}) {
  if (!activePath) return null;

  const preferPath =
    activePath === "ks1"
      ? "ks1"
      : activePath === "ks2"
        ? "ks2"
        : activePath === "ks4"
          ? "ks4"
          : undefined;

  return (
    <div data-visit-pack="compare" className="compare-visit-pack-anchor">
      <VisitPack
        nurseries={activePath === "early-years" ? eySelected : []}
        childminders={activePath === "childminders" ? childminderSelected : []}
        schools={
          activePath === "ks1"
            ? ks1Selected
            : activePath === "ks2"
              ? ks2Selected
              : activePath === "ks4"
                ? ks4Selected
                : []
        }
        preferPath={preferPath}
        stages={stages}
        sectors={sectors}
      />
    </div>
  );
}
