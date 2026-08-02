import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import {
  areaPath,
  areasIndexPath,
  getCoverageArea,
  listCoverageAreas,
} from "@/lib/areas";
import {
  AREA_STAGE_LANDINGS,
  areaStageCompareHref,
  areaStageDescription,
  areaStagePath,
  getAreaStage,
} from "@/lib/areaStages";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { guidanceForPath } from "@/lib/decisionGuidance";
import { guidePath } from "@/lib/guides";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";
import { areaStageLandingJsonLd } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string; stage: string }>;
};

export function generateStaticParams() {
  const areas = listCoverageAreas();
  return areas.flatMap((area) =>
    AREA_STAGE_LANDINGS.map((stage) => ({
      slug: area.slug,
      stage: stage.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, stage: stageSlug } = await params;
  const area = getCoverageArea(slug);
  const stage = getAreaStage(stageSlug);
  if (!area || !stage) return {};

  const title = stage.headline(area.localAuthority);
  const description = areaStageDescription(area, stage);
  const url = areaStagePath(area.slug, stage.slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${stage.label} ${area.localAuthority}`,
      `compare ${stage.shortLabel} ${area.localAuthority}`,
      `${area.localAuthority} schools`,
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

export default async function AreaStageLandingPage({ params }: PageProps) {
  const { slug, stage: stageSlug } = await params;
  const area = getCoverageArea(slug);
  const stage = getAreaStage(stageSlug);
  if (!area || !stage) notFound();

  const guidance = guidanceForPath(stage.guidancePath);
  const otherStages = AREA_STAGE_LANDINGS.filter((row) => row.slug !== stage.slug);
  const guideSlug =
    stage.guidancePath === "ks2"
      ? "primary-ks2"
      : stage.guidancePath === "ks4"
        ? "secondary-ks4"
        : stage.guidancePath === "ks1"
          ? "ks1-phonics"
          : stage.guidancePath === "general"
            ? "how-to-read"
            : stage.guidancePath;

  return (
    <main id="main" className="area-page">
      <JsonLd data={areaStageLandingJsonLd(area, stage)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={areasIndexPath()}>Areas</Link>
            <span aria-hidden="true">/</span>
            <Link href={areaPath(area.slug)}>{area.localAuthority}</Link>
            <span aria-hidden="true">/</span>
            <span>{stage.label}</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>{stage.headline(area.localAuthority)}</h1>
          <p className="area-lead">{stage.lead(area)}</p>
          <p className="area-lead area-stage-count">{stage.countLabel(area)}</p>
          <p className="area-actions">
            <Link href={areaStageCompareHref(stage)} className="btn btn-primary">
              Open compare for {stage.shortLabel}
            </Link>
            <Link
              href={guidePath(guideSlug)}
              className="btn btn-ghost area-btn-ghost"
            >
              How to read this path
            </Link>
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="stage-guidance-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="stage-guidance-heading">{guidance.heading}</h2>
            <p>{guidance.lead}</p>
          </div>
          <div className="decision-guidance-grid page-how-grid">
            {guidance.sections
              .filter((section) => section.id !== "precis")
              .map((section) => (
                <section key={section.id} className="decision-guidance-block">
                  <h3>{section.title}</h3>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="stage-siblings-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="stage-siblings-heading">
              Other stages in {area.localAuthority}
            </h2>
            <p>
              Same area, different parental path — still inside{" "}
              {COVERAGE_REGION_LABEL}.
            </p>
          </div>
          <ul className="area-list">
            {otherStages.map((row) => (
              <li key={row.slug}>
                <Link
                  href={areaStagePath(area.slug, row.slug)}
                  className="area-list-link"
                >
                  <strong>{row.label}</strong>
                  <span className="area-list-meta">{row.countLabel(area)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="area-home-more">
            <Link href={areaPath(area.slug)}>
              Back to {area.localAuthority} overview
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
