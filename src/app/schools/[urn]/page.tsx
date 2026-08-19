import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { areaPath, areasIndexPath, formatCount } from "@/lib/areas";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { guidePath } from "@/lib/guides";
import { laSlug } from "@/lib/laPacks";
import {
  formatAtt8,
  formatOutcomePercent,
  getSeoSchool,
  getSeoTown,
  listSeoHampshireSchools,
  listSeoSchoolsInTown,
  schoolCompareHref,
  schoolJsonLd,
  schoolPageDescription,
  schoolPageTitle,
  schoolPath,
  slugifyTown,
  townPath,
  townsIndexPath,
  type SeoSchoolSummary,
} from "@/lib/seoSchools";

type PageProps = {
  params: Promise<{ urn: string }>;
};

export function generateStaticParams() {
  return listSeoHampshireSchools().map((school) => ({ urn: school.urn }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { urn } = await params;
  const school = getSeoSchool(urn);
  if (!school) return {};

  const title = schoolPageTitle(school);
  const description = schoolPageDescription(school);
  const url = schoolPath(school.urn);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      school.name,
      school.town ? `${school.town} schools` : "",
      `${school.localAuthority} schools`,
      school.ofstedOverall ? `Ofsted ${school.ofstedOverall}` : "",
      "compare schools",
      BRAND_NAME,
    ].filter(Boolean),
    openGraph: {
      title: `${title} · ${BRAND_NAME}`,
      description,
      url: `${BRAND_HOME_URL}${url}`,
      type: "website",
    },
  };
}

function metaLine(school: SeoSchoolSummary): string {
  const bits = [
    school.phase,
    school.schoolTypeLabel,
    school.sector === "independent" ? "Independent" : school.sector === "state" ? "State-funded" : null,
    school.ageRange ? `Ages ${school.ageRange}` : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

export default async function SchoolLandingPage({ params }: PageProps) {
  const { urn } = await params;
  const school = getSeoSchool(urn);
  if (!school) notFound();

  const townSlug = school.town ? slugifyTown(school.town) : null;
  const town = townSlug ? getSeoTown(townSlug) : undefined;
  const neighbours = town
    ? listSeoSchoolsInTown(town)
        .filter((row) => row.urn !== school.urn)
        .slice(0, 8)
    : [];

  const website = school.schoolWebsite?.trim();
  const websiteHref = website
    ? /^https?:\/\//i.test(website)
      ? website
      : `https://${website}`
    : null;

  return (
    <main id="main" className="area-page school-seo-page">
      <JsonLd data={schoolJsonLd(school)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={areasIndexPath()}>Areas</Link>
            <span aria-hidden="true">/</span>
            <Link href={areaPath(laSlug(school.localAuthority))}>
              {school.localAuthority}
            </Link>
            {town ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={townPath(town.slug)}>{town.name}</Link>
              </>
            ) : null}
            <span aria-hidden="true">/</span>
            <span>{school.name}</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>{school.name}</h1>
          <p className="area-lead">
            {[school.town, school.localAuthority, school.postcode]
              .filter(Boolean)
              .join(" · ")}
            {metaLine(school) ? `. ${metaLine(school)}.` : "."} Compare published
            figures with nearby schools, then print a visit pack — not a league
            table.
          </p>
          <p className="area-actions">
            <Link href={schoolCompareHref(school)} className="btn btn-primary">
              Compare this school
            </Link>
            {websiteHref ? (
              <a
                href={websiteHref}
                className="btn btn-ghost area-btn-ghost"
                target="_blank"
                rel="noreferrer"
              >
                School website
              </a>
            ) : null}
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="school-facts-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="school-facts-heading">Published snapshot</h2>
            <p>
              Figures come from the same Hampshire index as the compare tool.
              Gaps are common — treat blanks as prompts to dig deeper, not as a
              verdict.
            </p>
          </div>
          <dl className="area-stats">
            <div>
              <dt>Ofsted overall</dt>
              <dd>{school.ofstedOverall ?? "—"}</dd>
            </div>
            <div>
              <dt>KS2 RWM expected</dt>
              <dd>{formatOutcomePercent(school.rwmExpected)}</dd>
            </div>
            <div>
              <dt>Attainment 8</dt>
              <dd>{formatAtt8(school.att8Average)}</dd>
            </div>
            <div>
              <dt>English &amp; maths 9–4</dt>
              <dd>{formatOutcomePercent(school.engMath94Percent)}</dd>
            </div>
          </dl>
          {school.ofstedPublicationDate || school.ofstedReportUrl ? (
            <p className="school-seo-note">
              {school.ofstedPublicationDate
                ? `Ofsted publication date: ${school.ofstedPublicationDate}. `
                : null}
              {school.ofstedReportUrl ? (
                <a href={school.ofstedReportUrl} target="_blank" rel="noreferrer">
                  Open Ofsted report
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      </section>

      {school.inspectionPrecis ? (
        <section className="section" aria-labelledby="school-precis-heading">
          <div className="shell">
            <div className="section-head">
              <h2 id="school-precis-heading">Inspection excerpt</h2>
              <p>
                Verbatim from the published report
                {school.inspectionReportLabel
                  ? ` (${school.inspectionReportLabel})`
                  : ""}
                . Open the full PDF for context.
              </p>
            </div>
            <blockquote className="school-seo-precis">
              <p>{school.inspectionPrecis}</p>
            </blockquote>
            {school.inspectionReportFileUrl ? (
              <p className="school-seo-note">
                <a
                  href={school.inspectionReportFileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Full inspection report
                </a>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="school-links-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="school-links-heading">Official links</h2>
            <p>Source pages for tables and establishment details.</p>
          </div>
          <ul className="area-list school-seo-links">
            {websiteHref ? (
              <li>
                <a
                  className="area-list-link"
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>School website</strong>
                  <span className="area-list-meta">Open in a new tab</span>
                </a>
              </li>
            ) : null}
            {school.compareUrl ? (
              <li>
                <a
                  className="area-list-link"
                  href={school.compareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>Official performance tables</strong>
                  <span className="area-list-meta">DfE compare service</span>
                </a>
              </li>
            ) : null}
            {school.giasUrl ? (
              <li>
                <a
                  className="area-list-link"
                  href={school.giasUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>Get Information About Schools</strong>
                  <span className="area-list-meta">URN {school.urn}</span>
                </a>
              </li>
            ) : (
              <li>
                <a
                  className="area-list-link"
                  href={`https://www.get-information-schools.service.gov.uk/Establishments/Establishment/Details/${school.urn}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>Get Information About Schools</strong>
                  <span className="area-list-meta">URN {school.urn}</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </section>

      {neighbours.length > 0 && town ? (
        <section className="section" aria-labelledby="school-nearby-heading">
          <div className="shell">
            <div className="section-head">
              <h2 id="school-nearby-heading">Other schools in {town.name}</h2>
              <p>
                {formatCount(town.schoolCount)} schools on the {town.name} town
                page — shortlist a few, then compare side by side.
              </p>
            </div>
            <ul className="area-list">
              {neighbours.map((row) => (
                <li key={row.urn}>
                  <Link className="area-list-link" href={schoolPath(row.urn)}>
                    <strong>{row.name}</strong>
                    <span className="area-list-meta">
                      {[row.phase, row.ofstedOverall].filter(Boolean).join(" · ") ||
                        "Open snapshot"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="area-home-more">
              <Link href={townPath(town.slug)}>All schools in {town.name}</Link>
              {" · "}
              <Link href={townsIndexPath()}>Hampshire towns</Link>
            </p>
          </div>
        </section>
      ) : null}

      <section
        className="section"
        aria-labelledby="school-how-heading"
        style={{ paddingTop: 0, paddingBottom: "4rem" }}
      >
        <div className="shell">
          <div className="section-head">
            <h2 id="school-how-heading">How to use this page</h2>
            <p>
              Open the compare tool with {school.name} already shortlisted, add
              neighbours from your postcode, then print a visit pack.
            </p>
          </div>
          <ol className="area-steps">
            <li>
              <Link href={schoolCompareHref(school)}>Compare this school</Link>{" "}
              to load it into Side by side.
            </li>
            <li>
              Enter your home postcode and tick two to four nearby settings.
            </li>
            <li>
              Read{" "}
              <Link href={guidePath("how-to-read")}>how to read figures</Link>{" "}
              before treating any single number as a verdict.
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
