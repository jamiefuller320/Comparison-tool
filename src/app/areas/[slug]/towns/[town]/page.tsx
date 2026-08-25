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
import { guidePath } from "@/lib/guides";
import {
  formatAtt8,
  formatOutcomePercent,
  getSeoTown,
  isSeoAreaIncluded,
  listSeoTowns,
  listSeoSchoolsInTown,
  schoolCompareHref,
  schoolPath,
  townJsonLd,
  townPageDescription,
  townPageTitle,
  townPath,
  townsIndexPath,
} from "@/lib/seoSchools";

type PageProps = {
  params: Promise<{ slug: string; town: string }>;
};

export function generateStaticParams() {
  return listSeoTowns().map((town) => ({
    slug: town.areaSlug,
    town: town.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, town: townSlug } = await params;
  if (!isSeoAreaIncluded(slug)) return {};
  const town = getSeoTown(townSlug, slug);
  if (!town) return {};

  const title = townPageTitle(town);
  const description = townPageDescription(town);
  const url = townPath(town.slug, town.areaSlug);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${town.name} schools`,
      `schools in ${town.name}`,
      `${town.name} Ofsted`,
      `${town.localAuthority} schools`,
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

export default async function TownLandingPage({ params }: PageProps) {
  const { slug, town: townSlug } = await params;
  if (!isSeoAreaIncluded(slug)) notFound();
  const area = getCoverageArea(slug);
  const town = getSeoTown(townSlug, slug);
  if (!area || !town) notFound();

  const schools = listSeoSchoolsInTown(town);
  const siblingTowns = listSeoTowns(slug)
    .filter((row) => row.slug !== town.slug)
    .slice(0, 8);

  return (
    <main id="main" className="area-page">
      <JsonLd data={townJsonLd(town, schools)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={areasIndexPath()}>Areas</Link>
            <span aria-hidden="true">/</span>
            <Link href={areaPath(area.slug)}>{area.localAuthority}</Link>
            <span aria-hidden="true">/</span>
            <Link href={townsIndexPath(area.slug)}>Towns</Link>
            <span aria-hidden="true">/</span>
            <span>{town.name}</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>Schools in {town.name}</h1>
          <p className="area-lead">
            {formatCount(town.schoolCount)} schools with a {town.name} postal
            town in the {town.localAuthority} set. Open a school snapshot for
            Ofsted and published outcomes, or shortlist a few in the compare
            tool — not a league table.
          </p>
          <p className="area-actions">
            <Link href="/#top" className="btn btn-primary">
              Compare near a postcode
            </Link>
            <Link
              href={guidePath("how-to-read")}
              className="btn btn-ghost area-btn-ghost"
            >
              How to read figures
            </Link>
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="town-counts-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="town-counts-heading">What is listed for {town.name}</h2>
            <p>
              Counts are from the live {town.localAuthority} index. Postal town
              is taken from school addresses — some settings sit near LA
              borders.
            </p>
          </div>
          <dl className="area-stats">
            <div>
              <dt>Schools</dt>
              <dd>{formatCount(town.schoolCount)}</dd>
            </div>
            <div>
              <dt>With Ofsted grade</dt>
              <dd>{formatCount(town.withOfsted)}</dd>
            </div>
            <div>
              <dt>With KS2 RWM</dt>
              <dd>{formatCount(town.withRwm)}</dd>
            </div>
            <div>
              <dt>With Attainment 8</dt>
              <dd>{formatCount(town.withKs4)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="town-schools-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="town-schools-heading">School snapshots</h2>
            <p>
              Open a page for the published snapshot, or jump straight into
              Side by side with that school shortlisted.
            </p>
          </div>
          <ul className="area-list">
            {schools.map((school) => {
              const outcome =
                school.rwmExpected != null
                  ? `RWM ${formatOutcomePercent(school.rwmExpected)}`
                  : school.att8Average != null
                    ? `Att8 ${formatAtt8(school.att8Average)}`
                    : null;
              const meta = [school.phase, school.ofstedOverall, outcome]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={school.urn}>
                  <div className="school-seo-town-row">
                    <Link
                      className="area-list-link"
                      href={schoolPath(school.urn)}
                    >
                      <strong>{school.name}</strong>
                      <span className="area-list-meta">
                        {meta || "Open snapshot"}
                      </span>
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
        </div>
      </section>

      <section
        className="section"
        aria-labelledby="town-siblings-heading"
        style={{ paddingTop: 0, paddingBottom: "4rem" }}
      >
        <div className="shell">
          <div className="section-head">
            <h2 id="town-siblings-heading">
              Other {area.localAuthority} towns
            </h2>
            <p>
              <Link href={townsIndexPath(area.slug)}>See every town page</Link>
              {" · "}
              <Link href={areaPath(area.slug)}>
                {area.localAuthority} overview
              </Link>
            </p>
          </div>
          <ul className="area-list">
            {siblingTowns.map((row) => (
              <li key={row.slug}>
                <Link
                  className="area-list-link"
                  href={townPath(row.slug, row.areaSlug)}
                >
                  <strong>{row.name}</strong>
                  <span className="area-list-meta">
                    {formatCount(row.schoolCount)} schools
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
