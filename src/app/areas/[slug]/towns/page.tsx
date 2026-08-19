import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import {
  areaPath,
  areasIndexPath,
  formatCount,
  getCoverageArea,
} from "@/lib/areas";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { COVERAGE_REGION_LABEL, laSlug, SEED_LOCAL_AUTHORITY } from "@/lib/laPacks";
import {
  listSeoHampshireTowns,
  townPath,
  townsIndexPath,
} from "@/lib/seoSchools";

const AREA_SLUG = laSlug(SEED_LOCAL_AUTHORITY);

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [{ slug: AREA_SLUG }];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== AREA_SLUG) return {};
  const area = getCoverageArea(slug);
  if (!area) return {};

  const towns = listSeoHampshireTowns();
  const title = `Towns in ${area.localAuthority}`;
  const description = `Browse ${formatCount(towns.length)} Hampshire towns with school shortlists — Ofsted and published outcomes, then compare nearby settings on School Compass.`;
  const url = townsIndexPath(slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${area.localAuthority} towns`,
      `${area.localAuthority} schools by town`,
      "Winchester schools",
      "Basingstoke schools",
      BRAND_NAME,
    ],
    openGraph: {
      title: `${title} · ${BRAND_NAME}`,
      description,
      url: `${BRAND_HOME_URL}${url}`,
      type: "website",
    },
  };
}

export default async function TownsIndexPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug !== AREA_SLUG) notFound();
  const area = getCoverageArea(slug);
  if (!area) notFound();

  const towns = listSeoHampshireTowns();

  return (
    <main id="main" className="area-page">
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={areasIndexPath()}>Areas</Link>
            <span aria-hidden="true">/</span>
            <Link href={areaPath(area.slug)}>{area.localAuthority}</Link>
            <span aria-hidden="true">/</span>
            <span>Towns</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>Schools by town in {area.localAuthority}</h1>
          <p className="area-lead">
            Postal-town pages for places with enough schools to shortlist —
            Ofsted grades and published outcomes, then jump into the compare
            tool. Coverage sits inside {COVERAGE_REGION_LABEL}.
          </p>
          <p className="area-actions">
            <Link href="/#top" className="btn btn-primary">
              Start with a postcode
            </Link>
            <Link
              href={areaPath(area.slug)}
              className="btn btn-ghost area-btn-ghost"
            >
              {area.localAuthority} overview
            </Link>
          </p>
        </div>
      </header>

      <section
        className="section"
        aria-labelledby="towns-list-heading"
        style={{ paddingBottom: "4rem" }}
      >
        <div className="shell">
          <div className="section-head">
            <h2 id="towns-list-heading">
              {formatCount(towns.length)} towns with school pages
            </h2>
            <p>
              Town names come from school addresses (postal town). Each page
              links into individual school snapshots and the compare tool.
            </p>
          </div>
          <ul className="area-list">
            {towns.map((town) => (
              <li key={town.slug}>
                <Link className="area-list-link" href={townPath(town.slug)}>
                  <strong>{town.name}</strong>
                  <span className="area-list-meta">
                    {formatCount(town.schoolCount)} schools
                    {town.withOfsted
                      ? ` · ${formatCount(town.withOfsted)} with Ofsted`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
