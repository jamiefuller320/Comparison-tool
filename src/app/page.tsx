import { CompareLoader } from "@/components/CompareLoader";
import { BRAND_NAME } from "@/lib/brand";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";
import { DECISION_GUIDANCE } from "@/lib/decisionGuidance";
import { SEO_DESCRIPTION } from "@/lib/seo";

export default function HomePage() {
  const how = DECISION_GUIDANCE.general;

  return (
    <main id="main">
      {/*
        Server-rendered hero chrome (brand + H1 + lead) so crawlers and no-JS
        clients see the value proposition. CompareLoader mounts interactive
        controls in a matching .hero-controls band, then nearby / shortlist
        as normal page sections below.
      */}
      <header className="hero-stack seo-intro" id="top" data-tour="hero">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School <em>Compass</em>
          </p>
          <h1>Find your bearings when choosing a school.</h1>
          <p>
            Start with your home postcode to map nearby schools and early years
            across {COVERAGE_REGION_LABEL}, shortlist a few, then compare
            published figures and inspection excerpts before you visit. A
            parental compass — not a league table.
          </p>
          <p className="seo-intro-meta">{SEO_DESCRIPTION}</p>
        </div>
      </header>

      <CompareLoader />

      <section className="section" id="how" data-tour="how" aria-labelledby="how-heading">
        <div className="shell">
          <div className="section-head">
            <h2 id="how-heading">{how.heading}</h2>
            <p>
              {how.lead} New here? Use <strong>How to use</strong> in the header
              for a short walkthrough. On each Side by side path, open{" "}
              <strong>What this tells you</strong> for path-specific guidance, and
              print a shortlist / visit pack when you are ready to go.
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
        </div>
      </section>

      <section
        className="section"
        id="data"
        aria-labelledby="data-heading"
        style={{ paddingTop: 0, paddingBottom: "4rem" }}
      >
        <div className="shell">
          <div className="section-head">
            <h2 id="data-heading">Where the numbers come from</h2>
            <p>
              {BRAND_NAME} harvests published figures from the DfE Explore
              Education Statistics API (KS2 and KS4), Ofsted independent-school
              management information, school coordinates from postcodes.io, and
              road distances from OSRM — so parents can compare like with like
              before they visit.
            </p>
          </div>
          <div className="footnote">
            <p>
              Early years: Ofsted childcare day-care inspections; Ofsted grades
              for state nursery / infant / primary settings with an early-years
              intake; consented childminder names/addresses (Ofsted quarterly
              file); plus EYFSP England and local-authority area context
              (provider-level EYFSP is not published — Ofsted grades and EYFSP
              area figures answer different questions). State schools:
              institution-level Key Stage 2 attainment plus local-authority
              phonics for KS1. Independents: Key Stage 4 tables plus Ofsted
              non-association inspections. Progress measures are sparse for
              2024/25 because of missing KS1 baselines.
            </p>
            <p>
              Official school pages:{" "}
              <a
                href="https://www.compare-school-performance.service.gov.uk/"
                target="_blank"
                rel="noreferrer"
              >
                compare-school-performance.service.gov.uk
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
