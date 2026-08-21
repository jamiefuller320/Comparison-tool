import type { Metadata } from "next";
import Link from "next/link";
import { CompareLoader } from "@/components/CompareLoader";
import { AreaCoverageList } from "@/components/AreaCoverageList";
import { BrandWordmark } from "@/components/BrandWordmark";
import {
  areasIndexPath,
  formatCount,
  listCoverageAreas,
} from "@/lib/areas";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";
import { DECISION_GUIDANCE } from "@/lib/decisionGuidance";
import { guidesIndexPath } from "@/lib/guides";
import { DATA_TOPIC } from "@/lib/understandTopics";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  const how = DECISION_GUIDANCE.general;
  const areas = listCoverageAreas();
  const featured = areas.filter((area) => area.isSeed).concat(
    areas.filter((area) => !area.isSeed).slice(0, 8),
  );

  const harbourIntro = (
    <header className="hero-stack seo-intro" id="top" data-tour="hero">
      <div className="shell hero-inner">
        <BrandWordmark className="hero-brand" as="p" />
        <h1>Find your bearings when choosing a school.</h1>
        <p>
          Map nearby schools from your home postcode, shortlist a few, then
          compare published figures before you visit.
        </p>
      </div>
    </header>
  );

  return (
    <main id="main">
      {/*
        Server-rendered harbour band so the head wash is one continuous block
        on first paint (avoids client remount flash of separate gradients).
        Setup journey chrome portals into #harbour-setup-slot.
      */}
      <div
        className="harbour-band"
        id="harbour-band"
        data-includes-setup="true"
        data-chapter="setup"
        data-chapter-step="0"
      >
        {harbourIntro}
        <div id="harbour-setup-slot" className="harbour-setup-slot" />
      </div>

      <CompareLoader />

      <section
        className="section page-chapter"
        id="areas"
        aria-labelledby="home-areas-heading"
      >
        <div className="shell">
          <div className="page-chapter-sheet">
          <div className="section-head">
            <h2 id="home-areas-heading">Browse by local authority</h2>
            <p>
              {formatCount(areas.length)} covered areas across{" "}
              {COVERAGE_REGION_LABEL}. Open an area page for school and early
              years counts, then jump into the postcode explorer.
            </p>
          </div>
          <AreaCoverageList areas={featured} />
          <p className="area-home-more">
            <Link href={areasIndexPath()}>See every covered area</Link>
            {" · "}
            <Link href="/areas/hampshire/primary/">Hampshire primary</Link>
            {" · "}
            <Link href="/areas/surrey/secondary/">Surrey secondary</Link>
          </p>
          </div>
        </div>
      </section>

      {/*
        Static How / Understand + data copy for crawlers / no-JS. Hidden when
        the journey toolbar is present — the interactive Understand chapter
        owns #how (and the Data topic) then.
      */}
      <section
        className="section page-chapter seo-how-fallback"
        data-tour="how"
        aria-labelledby="how-heading"
      >
        <div className="shell">
          <div className="page-chapter-sheet">
          <div className="section-head">
            <h2 id="how-heading">Understand the figures</h2>
            <p>
              {how.lead} New here? Use <strong>How to use</strong> in the header
              for a short walkthrough, or open the{" "}
              <Link href={guidesIndexPath()}>parent guides</Link>. On each Side
              by side path, open <strong>What this tells you</strong> for
              path-specific guidance, and print a shortlist / visit pack when
              you are ready to go.
            </p>
          </div>
          <div className="decision-guidance-grid page-how-grid">
            {how.sections
              .filter((s) => s.id !== "precis")
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
          <div className="footnote" style={{ marginTop: "1.25rem" }}>
            <p>
              <strong>Expected standard</strong> means pupils met the level
              expected for the end of primary. <strong>Higher standard</strong>{" "}
              is a tougher bar. <strong>Scaled scores</strong> centre on 100.
              Inspection précis excerpts are verbatim from Ofsted/ISI PDFs —
              open the full report for context.
            </p>
          </div>
          <div className="section-head" style={{ marginTop: "1.75rem" }} id="data">
            <h2 id="data-heading">{DATA_TOPIC.title}</h2>
            <p>{DATA_TOPIC.lead}</p>
          </div>
          <div className="footnote">
            {DATA_TOPIC.paragraphs?.map((paragraph, index) => (
              <p key={`seo-data-${index}`}>{paragraph}</p>
            ))}
            {DATA_TOPIC.links?.length ? (
              <p>
                Official school pages:{" "}
                {DATA_TOPIC.links.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 ? " · " : null}
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </span>
                ))}
                .
              </p>
            ) : null}
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
