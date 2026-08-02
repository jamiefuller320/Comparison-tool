import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import {
  GUIDE_PAGES,
  guidePath,
  guidesIndexPath,
} from "@/lib/guides";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";
import { guidesHubJsonLd } from "@/lib/seo";

const title = "Guides for parents comparing schools";
const description = `How to read DfE figures, Ofsted/ISI excerpts, early years and childminder paths on ${BRAND_NAME} across ${COVERAGE_REGION_LABEL}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: guidesIndexPath() },
  openGraph: {
    title: `${title} · ${BRAND_NAME}`,
    description,
    url: `${BRAND_HOME_URL}${guidesIndexPath()}`,
    type: "website",
  },
};

export default function GuidesIndexPage() {
  return (
    <main id="main" className="area-page">
      <JsonLd data={guidesHubJsonLd(GUIDE_PAGES)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Guides</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>Guides for parents comparing schools</h1>
          <p className="area-lead">
            Plain-language help for reading published figures and inspection
            excerpts — so you can shortlist with clearer questions before you
            visit.
          </p>
          <p className="area-actions">
            <Link href="/#top" className="btn btn-primary">
              Open the compare tool
            </Link>
            <Link href="/areas/" className="btn btn-ghost area-btn-ghost">
              Browse areas
            </Link>
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="guides-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="guides-heading">All guides</h2>
            <p>
              Start with how to read the tool, then open the path that matches
              your child’s stage.
            </p>
          </div>
          <ul className="area-list">
            {GUIDE_PAGES.map((guide) => (
              <li key={guide.slug}>
                <Link href={guidePath(guide.slug)} className="area-list-link">
                  <strong>{guide.title}</strong>
                  <span className="area-list-meta">{guide.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
