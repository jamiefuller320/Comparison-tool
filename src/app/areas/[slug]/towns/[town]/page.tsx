import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareToolLink } from "@/components/CompareToolLink";
import { JsonLd } from "@/components/JsonLd";
import {
  areaPath,
  areasIndexPath,
  formatCount,
  getCoverageArea,
} from "@/lib/areas";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { guidePath } from "@/lib/guides";
import { townPageFaqs } from "@/lib/seoFaqs";
import { SeoSchoolHubList } from "@/components/SeoSchoolHubList";
import { listSeoSchoolsForTownHub } from "@/lib/seoHubLinks";
import {
  getSeoTown,
  isCityOfLondonPlace,
  isSeoAreaIncluded,
  listIndexableSeoTowns,
  townJsonLd,
  townPageDescription,
  townPageTitle,
  townPath,
  townPlaceLabel,
  townsIndexPath,
} from "@/lib/seoSchools";

type PageProps = {
  params: Promise<{ slug: string; town: string }>;
};

export function generateStaticParams() {
  return listIndexableSeoTowns().map((town) => ({
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
  const place = townPlaceLabel(town);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${place} schools`,
      `schools in ${place}`,
      `compare schools ${place}`,
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

  const schools = listSeoSchoolsForTownHub(town);
  const siblingTowns = listIndexableSeoTowns(slug)
    .filter((row) => row.slug !== town.slug)
    .slice(0, 8);
  const place = townPlaceLabel(town);
  const faqs = townPageFaqs(town);

  return (
    <main id="main" className="area-page">
      <JsonLd data={townJsonLd(town, schools, faqs)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <CompareToolLink href="/">Home</CompareToolLink>
            <span aria-hidden="true">/</span>
            <Link href={areasIndexPath()}>Areas</Link>
            <span aria-hidden="true">/</span>
            <Link href={areaPath(area.slug)}>{area.localAuthority}</Link>
            <span aria-hidden="true">/</span>
            <Link href={townsIndexPath(area.slug)}>Towns</Link>
            <span aria-hidden="true">/</span>
            <span>{place}</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>Compare schools in {place}</h1>
          <p className="area-lead">
            {formatCount(town.schoolCount)} schools
            {place === town.localAuthority
              ? ` in the ${town.localAuthority} set`
              : ` with a ${town.name} postal town in the ${town.localAuthority} set`}
            . Open a school snapshot for Ofsted and published outcomes, or
            shortlist a few in the compare tool — not a league table.
          </p>
          <p className="area-actions">
            <CompareToolLink href="/#top" className="btn btn-primary">
              Compare near a postcode
            </CompareToolLink>
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
            <h2 id="town-counts-heading">
              {isCityOfLondonPlace(town)
                ? `What is listed for ${place}`
                : `What is listed for ${town.name}`}
            </h2>
            <p>
              {isCityOfLondonPlace(town)
                ? `Counts are every open school in the City of London index — the Square Mile, not a postal-town split.`
                : `Counts are from the live ${town.localAuthority} index. Postal town is taken from school addresses — some settings sit near LA borders.`}
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
          <SeoSchoolHubList schools={schools} showPostalTown />
        </div>
      </section>

      <section className="section" aria-labelledby="town-qa-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="town-qa-heading">Common questions</h2>
            <p>
              Short answers about schools in {place} — then shortlist in the
              compare tool.
            </p>
          </div>
          <div className="guide-faq">
            {faqs.map((faq) => (
              <details key={faq.question} className="guide-faq-item">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
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
                  <strong>{townPlaceLabel(row)}</strong>
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
