import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import {
  formatGiasCloseDate,
  giasRedirectHref,
  type GiasSuccessorRedirect,
} from "@/lib/giasRedirects";
import { schoolPath } from "@/lib/seoSchools";

/** Static stand-in for a closed landing. Meta refresh plus a visible link. */
export function SchoolClosedRedirect({ row }: { row: GiasSuccessorRedirect }) {
  const href = giasRedirectHref(row);
  const closedOn = formatGiasCloseDate(row.closeDate);
  const reason = row.closeReason ? ` (${row.closeReason})` : "";
  const when = closedOn ? ` on ${closedOn}` : "";

  return (
    <main id="main" className="area-page school-seo-page">
      <meta httpEquiv="refresh" content={`0;url=${href}`} />
      <header className="area-hero">
        <div className="shell">
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>{row.name} has closed</h1>
          <p className="area-lead">
            {row.name} closed{when}
            {reason}.{" "}
            {row.successorOnSite ? (
              <Link href={schoolPath(row.successorUrn)}>{row.successorName}</Link>
            ) : (
              <a href={href}>Successor establishment</a>
            )}{" "}
            continues this school.
          </p>
        </div>
      </header>
    </main>
  );
}
