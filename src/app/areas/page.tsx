import type { Metadata } from "next";
import Link from "next/link";
import { AreaCoverageList } from "@/components/AreaCoverageList";
import { JsonLd } from "@/components/JsonLd";
import {
  areasIndexPath,
  formatCount,
  listCoverageAreas,
} from "@/lib/areas";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";
import { areasHubJsonLd, SEO_TITLE_TEMPLATE } from "@/lib/seo";

const title = `School areas across ${COVERAGE_REGION_LABEL}`;
const description = `Browse every local authority covered by ${BRAND_NAME} across ${COVERAGE_REGION_LABEL}. Open an area page for school and early-years counts, then shortlist nearby settings to compare.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: areasIndexPath(),
  },
  openGraph: {
    title: SEO_TITLE_TEMPLATE.replace("%s", title),
    description,
    url: `${BRAND_HOME_URL}${areasIndexPath()}`,
    type: "website",
  },
};

export default function AreasIndexPage() {
  const areas = listCoverageAreas();
  const schoolTotal = areas.reduce((sum, area) => sum + area.schoolCount, 0);

  return (
    <main id="main" className="area-page">
      <JsonLd data={areasHubJsonLd(areas)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Areas</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>School areas across {COVERAGE_REGION_LABEL}</h1>
          <p className="area-lead">
            {formatCount(areas.length)} local authorities ·{" "}
            {formatCount(schoolTotal)} schools in the live compare set. Pick an
            area for counts and a clear path into the postcode explorer — not a
            league table.
          </p>
          <p className="area-actions">
            <Link href="/#top" className="btn btn-primary">
              Open the compare tool
            </Link>
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="areas-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="areas-heading">Covered local authorities</h2>
            <p>
              Hampshire is the deepest maintained root. The other areas ship as
              ready packs and merge silently into map, search, and compare.
            </p>
          </div>
          <AreaCoverageList areas={areas} />
        </div>
      </section>
    </main>
  );
}
