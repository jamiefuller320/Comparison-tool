import { CompareLoader } from "@/components/CompareLoader";

export default function HomePage() {
  return (
    <main>
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
              Road distances use open routing data and are a guide to travel, not an
              admissions catchment. Stage filters use each school&apos;s published age
              range, so primary and all-through settings appear under every stage they
              offer. Small Year 6 cohorts bounce around more than large ones. Ofsted
              judgements, admissions rules and ethos are outside this dataset — check
              those separately.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="data" style={{ paddingTop: 0, paddingBottom: "4rem" }}>
        <div className="shell">
          <div className="section-head">
            <h2>Where the numbers come from</h2>
            <p>
              Algorithmic harvest from the DfE Explore Education Statistics API,
              school coordinates from postcodes.io, and road distances from OSRM —
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
