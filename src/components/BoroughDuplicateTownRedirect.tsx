import Link from "next/link";
import { areaPath } from "@/lib/areas";
import { BRAND_NAME } from "@/lib/brand";
import type { SeoTown } from "@/lib/seoSchools";
import { townPlaceLabel } from "@/lib/seoSchools";

/**
 * Static stand-in for a retired borough "London" town hub.
 * Meta refresh plus a visible link to the area landing (GIAS successor pattern).
 */
export function BoroughDuplicateTownRedirect({ town }: { town: SeoTown }) {
  const href = areaPath(town.areaSlug);
  const place = townPlaceLabel(town);

  return (
    <main id="main" className="area-page">
      <meta httpEquiv="refresh" content={`0;url=${href}`} />
      <header className="area-hero">
        <div className="shell">
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>Schools in {place}</h1>
          <p className="area-lead">
            This town hub was merged into the{" "}
            <Link href={href}>{town.localAuthority}</Link> area page — same
            school list, one borough hub.
          </p>
        </div>
      </header>
    </main>
  );
}
