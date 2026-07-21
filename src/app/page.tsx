import { CompareLoader } from "@/components/CompareLoader";

export default function HomePage() {
  return (
    <main id="top">
      <section className="hero">
        <div className="shell hero-inner">
          <p className="hero-brand">
            School<em>side</em>
          </p>
          <h1>Compare English schools side by side when you are choosing.</h1>
          <p>
            Harvested Key Stage 2 performance for parental shortlists — attainment,
            cohort context and nearby alternatives, without the governance pack.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#compare">
              Start comparing
            </a>
            <a className="btn btn-ghost" href="#how">
              How to read the numbers
            </a>
          </div>
        </div>
      </section>

      <CompareLoader />

      <section className="section" id="how">
        <div className="shell">
          <div className="section-head">
            <h2>How to read this as a parent</h2>
            <p>
              Performance tables are one lens on a school. Use them to spot patterns
              across a shortlist, then visit, talk to staff, and weigh fit for your child.
            </p>
          </div>
          <div className="footnote">
            <p>
              <strong>Expected standard</strong> means pupils met the level expected
              for the end of primary in that subject.{" "}
              <strong>Higher standard</strong> is a tougher bar.{" "}
              <strong>Scaled scores</strong> centre on 100 as the expected standard.
            </p>
            <p>
              Small Year 6 cohorts bounce around more than large ones. A single
              year&apos;s gap versus England is a signal to explore, not a verdict.
              Ofsted judgements, admissions rules, travel and ethos are outside this
              dataset — check those separately.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="data" style={{ paddingTop: 0, paddingBottom: "4rem" }}>
        <div className="shell">
          <div className="section-head">
            <h2>Where the numbers come from</h2>
            <p>
              Algorithmic harvest from the DfE Explore Education Statistics API —
              the same open data behind Compare school and college performance —
              expanded from the collation approach used for Bartley Insight.
            </p>
          </div>
          <div className="footnote">
            <p>
              Institution-level Key Stage 2 attainment for parental choice comparison,
              not school governance. Progress measures are sparse for 2024/25 because
              of missing KS1 baselines.
            </p>
            <p>
              Refresh locally with <code>npm run harvest</code>. Official school pages:{" "}
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
