import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackPageForm } from "@/components/FeedbackPageForm";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";

const title = "Share feedback";
const description = `Send a private suggestion or problem report for ${BRAND_NAME}. Notes are queued for review — not a public comments board.`;

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  alternates: { canonical: "/feedback/" },
  openGraph: {
    title: `${title} · ${BRAND_NAME}`,
    description,
    url: `${BRAND_HOME_URL}/feedback/`,
    type: "website",
  },
};

export default function FeedbackPage() {
  return (
    <main id="main" className="area-page feedback-page">
      <header className="area-hero">
        <div className="shell">
          <nav className="area-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Feedback</span>
          </nav>
          <p className="area-kicker">{BRAND_NAME}</p>
          <h1>Share feedback</h1>
          <p className="area-lead">
            Tell us what helped, what stuck, or what you would change. This is a
            private inbox for the soft-launch improvement cycle — other parents
            cannot see your note.
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="feedback-form-heading">
        <div className="shell feedback-page-shell">
          <div className="section-head">
            <h2 id="feedback-form-heading">Your note</h2>
            <p>
              Free text is enough. Sentiment and topic chips are optional
              context for triage.
            </p>
          </div>
          <FeedbackPageForm />
        </div>
      </section>
    </main>
  );
}
