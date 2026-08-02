import Link from "next/link";
import {
  areaPath,
  formatCount,
  type CoverageArea,
} from "@/lib/areas";

export function AreaCoverageList({
  areas,
  currentSlug,
}: {
  areas: CoverageArea[];
  currentSlug?: string;
}) {
  return (
    <ul className="area-list">
      {areas.map((area) => {
        const current = area.slug === currentSlug;
        return (
          <li key={area.slug} className={current ? "current" : undefined}>
            {current ? (
              <span className="area-list-link current">
                <strong>{area.localAuthority}</strong>
                <span className="area-list-meta">
                  {formatCount(area.schoolCount)} schools
                  {area.isSeed ? " · deepest maintained set" : ""}
                </span>
              </span>
            ) : (
              <Link href={areaPath(area.slug)} className="area-list-link">
                <strong>{area.localAuthority}</strong>
                <span className="area-list-meta">
                  {formatCount(area.schoolCount)} schools
                  {area.eyProviderCount != null
                    ? ` · ${formatCount(area.eyProviderCount)} early years`
                    : ""}
                </span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
