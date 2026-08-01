import { CompareLoader } from "@/components/CompareLoader";
import { DECISION_GUIDANCE } from "@/lib/decisionGuidance";

export default function HomePage() {
  const how = DECISION_GUIDANCE.general;

  return (
    <main>
      <CompareLoader />

      <section className="section" id="how" data-tour="how">
        <div className="shell">
          <div className="section-head">
            <h2>{how.heading}</h2>
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

      <section className="section" id="data" style={{ paddingTop: 0, paddingBottom: "4rem" }}>
        <div className="shell">
          <div className="section-head">
            <h2>Data</h2>
            <p>
              School Compass harvests published figures from the DfE Explore
              Education Statistics API (KS2 and KS4), Ofsted independent-school
              management information, school coordinates from postcodes.io, and
              road distances from OSRM — expanded from the collation approach
              used for Bartley Insight.
            </p>
          </div>
          <div className="footnote">
            <p>
              Hampshire early years: Ofsted childcare day-care inspections;
              Ofsted grades for state nursery / infant / primary settings with an
              early-years intake; consented childminder names/addresses (Ofsted
              quarterly file — re-harvest regularly); plus EYFSP
              England/Hampshire area context (provider-level EYFSP is not
              published — Ofsted grades and EYFSP area figures answer different
              questions). State schools: institution-level Key Stage 2 attainment
              plus local-authority phonics for KS1. Independents: Key Stage 4
              tables plus Ofsted non-association inspections. Progress measures
              are sparse for 2024/25 because of missing KS1 baselines.
            </p>
            <p>
              Refresh locally with <code>npm run harvest:hampshire</code> (or{" "}
              <code>npm run harvest:ey</code> for the early years pack). Full
              England <code>npm run harvest</code> remains a scaffold. Official
              school pages:{" "}
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
