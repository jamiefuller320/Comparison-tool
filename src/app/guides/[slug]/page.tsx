import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { areasIndexPath } from "@/lib/areas";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import {
  GUIDE_PAGES,
  guideBody,
  guidePath,
  guidesIndexPath,
  getGuide,
} from "@/lib/guides";
import { guidePageJsonLd } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return GUIDE_PAGES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const url = guidePath(guide.slug);
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${guide.title} · ${BRAND_NAME}`,
      description: guide.description,
      url: `${BRAND_HOME_URL}${url}`,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const body = guideBody(guide);
  const others = GUIDE_PAGES.filter((row) => row.slug !== guide.slug);

  return (
    <main id="main" className="area-page">
      <JsonLd data={guidePageJsonLd(guide)} />
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={guidesIndexPath()}>Guides</Link>
            <span aria-hidden="true">/</span>
            <span>{guide.title}</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>{guide.title}</h1>
          <p className="area-lead">{guide.description}</p>
          <p className="area-actions">
            <Link href="/#top" className="btn btn-primary">
              Open the compare tool
            </Link>
            <Link
              href={areasIndexPath()}
              className="btn btn-ghost area-btn-ghost"
            >
              Browse areas
            </Link>
          </p>
        </div>
      </header>

      {body ? (
        <section className="section" aria-labelledby="guide-body-heading">
          <div className="shell">
            <div className="section-head">
              <h2 id="guide-body-heading">{body.heading}</h2>
              <p>{body.lead}</p>
            </div>
            <div className="decision-guidance-grid page-how-grid">
              {body.sections.map((section) => (
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
      ) : null}

      {guide.faqs?.length ? (
        <section className="section" aria-labelledby="guide-faq-heading">
          <div className="shell">
            <div className="section-head">
              <h2 id="guide-faq-heading">Frequently asked questions</h2>
              <p>Short answers parents ask before they shortlist.</p>
            </div>
            <div className="guide-faq">
              {guide.faqs.map((faq) => (
                <details key={faq.question} className="guide-faq-item">
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        className="section"
        aria-labelledby="guide-more-heading"
        style={{ paddingTop: 0, paddingBottom: "4rem" }}
      >
        <div className="shell">
          <div className="section-head">
            <h2 id="guide-more-heading">More guides</h2>
            <p>
              <Link href={guidesIndexPath()}>See every guide</Link>.
            </p>
          </div>
          <ul className="area-list">
            {others.map((row) => (
              <li key={row.slug}>
                <Link href={guidePath(row.slug)} className="area-list-link">
                  <strong>{row.title}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
