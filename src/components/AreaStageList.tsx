import Link from "next/link";
import type { CoverageArea } from "@/lib/areas";
import {
  AREA_STAGE_LANDINGS,
  areaStagePath,
} from "@/lib/areaStages";

export function AreaStageList({
  area,
  currentStage,
}: {
  area: CoverageArea;
  currentStage?: string;
}) {
  return (
    <ul className="area-list">
      {AREA_STAGE_LANDINGS.map((stage) => {
        const current = stage.slug === currentStage;
        return (
          <li key={stage.slug} className={current ? "current" : undefined}>
            {current ? (
              <span className="area-list-link current">
                <strong>{stage.label}</strong>
                <span className="area-list-meta">{stage.countLabel(area)}</span>
              </span>
            ) : (
              <Link
                href={areaStagePath(area.slug, stage.slug)}
                className="area-list-link"
              >
                <strong>{stage.label}</strong>
                <span className="area-list-meta">{stage.countLabel(area)}</span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
