import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaCoverageList } from "@/components/AreaCoverageList";
import { AreaStageList } from "@/components/AreaStageList";
import { JsonLd } from "@/components/JsonLd";
import {
  areaPageDescription,
  areaPageTitle,
  areaPath,
  areasIndexPath,
  formatCount,
  getCoverageArea,
  listCoverageAreas,
} from "@/lib/areas";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { guidesIndexPath } from "@/lib/guides";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";
import { areaLandingJsonLd } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listCoverageAreas().map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const area = getCoverageArea(slug);
  if (!area) return {};

  const title = areaPageTitle(area);
  const description = areaPageDescription(area);
  const url = areaPath(area.slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${area.localAuthority} schools`,
      `compare schools ${area.localAuthority}`,
      `${area.localAuthority} Ofsted`,
      "school shortlist",
      BRAND_NAME,
    ],
    openGraph: {
      title: `${title} · ${BRAND_NAME}`,
      description,
      url: `${BRAND_HOME_URL}${url}`,
      type: "website",
    },
    twitter: {
      title: `${title} · ${BRAND_NAME}`,
      description,
    },
  };
}

export default async function AreaLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const area = getCoverageArea(slug);
  if (!area) notFound();

  const areas = listCoverageAreas();
  const neighbours = areas.filter((row) => row.slug !== area.slug);

  return (
    <main id="main" className="area-page">
      <JsonLd data={areaLandingJsonLd(area)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={areasIndexPath()}>Areas</Link>
            <span aria-hidden="true">/</span>
            <span>{area.localAuthority}</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>Compare schools in {area.localAuthority}</h1>
          <p className="area-lead">
            Shortlist nearby schools and early years in{" "}
            {area.localAuthority}, compare published DfE figures and Ofsted/ISI
            excerpts, then print a visit pack. Coverage sits inside{" "}
            {COVERAGE_REGION_LABEL} — a parental compass, not a league table.
          </p>
          <p className="area-actions">
            <Link href="/#top" className="btn btn-primary">
              Start with a postcode
            </Link>
            <Link href={guidesIndexPath()} className="btn btn-ghost area-btn-ghost">
              Parent guides
            </Link>
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="area-stages-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="area-stages-heading">Browse by stage in {area.localAuthority}</h2>
            <p>
              Open a stage page for path-specific guidance, then jump into the
              compare tool with the matching filters.
            </p>
          </div>
          <AreaStageList area={area} />
        </div>
      </section>

      <section className="section" aria-labelledby="area-counts-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="area-counts-heading">What is in the {area.localAuthority} set</h2>
            <p>
              Counts come from the live index used by the compare tool
              {area.isSeed
                ? " — Hampshire is the deepest maintained root."
                : " — this area ships as a ready pack and merges into search and map."}
            </p>
          </div>
          <dl className="area-stats">
            <div>
              <dt>Schools</dt>
              <dd>{formatCount(area.schoolCount)}</dd>
            </div>
            <div>
              <dt>With KS2 RWM</dt>
              <dd>{formatCount(area.withRwm)}</dd>
            </div>
            <div>
              <dt>With KS4</dt>
              <dd>{formatCount(area.withKs4)}</dd>
            </div>
            <div>
              <dt>Early years settings</dt>
              <dd>{formatCount(area.eyProviderCount)}</dd>
            </div>
            <div>
              <dt>Consented childminders</dt>
              <dd>{formatCount(area.childminderCount)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="area-how-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="area-how-heading">How to compare in {area.localAuthority}</h2>
            <p>
              Use the shared explorer — enter a home postcode in{" "}
              {area.localAuthority}, shortlist a few settings, then open Side by
              side for the path that matches your child&apos;s stage.
            </p>
          </div>
          <ol className="area-steps">
            <li>
              <Link href="/#top">Open the compare tool</Link> and enter a home
              postcode in {area.localAuthority}.
            </li>
            <li>
              Choose stages and school type, then tick two to four nearby
              settings on the map or list.
            </li>
            <li>
              Compare published outcomes and inspection excerpts, then print a
              visit pack for open days.
            </li>
          </ol>
        </div>
      </section>

      <section
        className="section"
        aria-labelledby="area-neighbours-heading"
        style={{ paddingTop: 0, paddingBottom: "4rem" }}
      >
        <div className="shell">
          <div className="section-head">
            <h2 id="area-neighbours-heading">Other covered areas</h2>
            <p>
              Full coverage across {COVERAGE_REGION_LABEL}.{" "}
              <Link href={areasIndexPath()}>See every area</Link>.
            </p>
          </div>
          <AreaCoverageList areas={neighbours} />
        </div>
      </section>
    </main>
  );
}
