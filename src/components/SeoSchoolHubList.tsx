import Link from "next/link";
import {
  formatAtt8,
  formatOutcomePercent,
  schoolCompareHref,
  schoolPath,
  type SeoSchoolSummary,
} from "@/lib/seoSchools";

export function SeoSchoolHubList({
  schools,
  showPostalTown = false,
}: {
  schools: SeoSchoolSummary[];
  /** When true, show postal town in meta for cross-place town hubs. */
  showPostalTown?: boolean;
}) {
  return (
    <ul className="area-list">
      {schools.map((school) => {
        const outcome =
          school.rwmExpected != null
            ? `RWM ${formatOutcomePercent(school.rwmExpected)}`
            : school.att8Average != null
              ? `Att8 ${formatAtt8(school.att8Average)}`
              : null;
        const townMeta =
          showPostalTown && school.town?.trim()
            ? school.town.trim()
            : null;
        const meta = [school.phase, school.ofstedOverall, outcome, townMeta]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={school.urn}>
            <div className="school-seo-town-row">
              <Link className="area-list-link" href={schoolPath(school.urn)}>
                <strong>{school.name}</strong>
                <span className="area-list-meta">{meta || "Open snapshot"}</span>
              </Link>
              <Link
                className="school-seo-compare-link"
                href={schoolCompareHref(school)}
              >
                Compare
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
