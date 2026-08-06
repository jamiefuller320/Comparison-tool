import type { Metadata } from "next";
import Link from "next/link";
import { ContentReviewApp } from "@/components/ContentReviewApp";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Content review (lab)",
  description: `Internal check of inspection précis and website evidence for ${BRAND_NAME}.`,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ContentReviewPage() {
  return (
    <main id="main" className="content-review-page">
      <header className="content-review-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Lab</span>
            <span aria-hidden="true">/</span>
            <span>Content review</span>
          </nav>
          <p className="area-kicker">
            {BRAND_NAME} · internal lab
          </p>
          <h1>Content review</h1>
          <p className="content-review-intro">
            School-by-school check of the two qualitative products: inspection
            précis (Ofsted/ISI) and website evidence. Sort by ingest date to
            review the latest enrichments first. Not linked from the main nav
            and not indexed.
          </p>
          <p className="content-review-intro muted">
            The older crawler-only prototype remains at{" "}
            <a
              href="https://jamiefuller320.github.io/School_data_crawler/evidence/"
              target="_blank"
              rel="noreferrer"
            >
              School_data_crawler / evidence
            </a>
            ; this page is the product view over the live schools index.
          </p>
        </div>
      </header>
      <div className="shell content-review-shell">
        <ContentReviewApp />
      </div>
    </main>
  );
}
