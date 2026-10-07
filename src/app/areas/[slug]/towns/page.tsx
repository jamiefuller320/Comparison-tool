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
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";
import {
  isSeoAreaIncluded,
  listSeoAreasWithTowns,
  listSeoTowns,
  townPath,
  townPlaceLabel,
  townsIndexPath,
} from "@/lib/seoSchools";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listSeoAreasWithTowns().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isSeoAreaIncluded(slug)) return {};
  const area = getCoverageArea(slug);
  if (!area) return {};

  const towns = listSeoTowns(slug);
  if (towns.length === 0) return {};

  const n = towns.length;
  const londonOnly =
    n === 1 && towns[0].name.trim().toLowerCase() === "london";
  const title = londonOnly
    ? `Schools across ${area.localAuthority}`
    : `Towns in ${area.localAuthority}`;
  const townWord = n === 1 ? "town" : "towns";
  const description = londonOnly
    ? `Shortlist schools across ${area.localAuthority}: Ofsted grades and DfE outcomes, then compare nearby on School Compass.`
    : `Browse ${formatCount(n)} ${area.localAuthority} ${townWord} with school shortlists — Ofsted and published outcomes, then compare nearby on School Compass.`;
  const url = townsIndexPath(slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${area.localAuthority} towns`,
      `${area.localAuthority} schools by town`,
      "compare schools",
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
  if (!isSeoAreaIncluded(slug)) notFound();
  const area = getCoverageArea(slug);
  if (!area) notFound();

  const towns = listSeoTowns(slug);
  if (towns.length === 0) notFound();
  const londonOnly =
    towns.length === 1 && towns[0].name.trim().toLowerCase() === "london";

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
          <h1>
            {londonOnly
              ? `Schools across ${area.localAuthority}`
              : `Schools by town in ${area.localAuthority}`}
          </h1>
          <p className="area-lead">
            {londonOnly
              ? `Borough-wide school snapshots for ${area.localAuthority} — Ofsted grades and published outcomes, then jump into the compare tool.`
              : `Postal-town pages for places with enough schools to shortlist — Ofsted grades and published outcomes, then jump into the compare tool. Coverage sits inside ${COVERAGE_REGION_LABEL}.`}
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
              {londonOnly
                ? `School list for ${area.localAuthority}`
                : `${formatCount(towns.length)} towns with school pages`}
            </h2>
            <p>
              {londonOnly
                ? `GIAS often stores ${area.localAuthority} schools under the postal town “London” — this page is the borough shortlist.`
                : `Town names come from school addresses (postal town). Each page links into individual school snapshots and the compare tool.`}
            </p>
          </div>
          <ul className="area-list">
            {towns.map((town) => (
              <li key={town.slug}>
                <Link
                  className="area-list-link"
                  href={townPath(town.slug, town.areaSlug)}
                >
                  <strong>{townPlaceLabel(town)}</strong>
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
