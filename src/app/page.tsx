import { CompareLoader } from "@/components/CompareLoader";

export default function HomePage() {
  return (
    <main>
      <CompareLoader />

      <section className="section" id="how" data-tour="how">
        <div className="shell">
          <div className="section-head">
            <h2>How to read this as a parent</h2>
            <p>
              Performance tables are one lens on a school. Use them to spot patterns
              across a shortlist, then visit, talk to staff, and weigh fit for your child.
              New here? Use <strong>How to use</strong> in the header for a short
              walkthrough of the page.
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
              range with <strong>AND</strong> logic when several stages are selected.
              Pure secondary schools come from GIAS for KS3/KS4 search; KS2 attainment
              figures appear where published for state schools. Independents are
              compared on published Key Stage 4 outcomes (nil/zero English &amp; maths
              GCSE returns cleared; EBacc subject pillars used as fallbacks), Ofsted
              grades for non-association schools, and ISI/website links from GIAS when
              Ofsted grades are absent. Small cohorts bounce around more than large
              ones. Admissions rules and ethos are still outside this dataset.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="data" style={{ paddingTop: 0, paddingBottom: "4rem" }}>
        <div className="shell">
          <div className="section-head">
            <h2>Where the numbers come from</h2>
            <p>
              Algorithmic harvest from the DfE Explore Education Statistics API
              (KS2 and KS4), Ofsted independent-school management information, school
              coordinates from postcodes.io, and road distances from OSRM — expanded
              from the collation approach used for Bartley Insight.
            </p>
          </div>
          <div className="footnote">
            <p>
              State schools: institution-level Key Stage 2 attainment for parental
              choice comparison, not school governance, plus local-authority
              phonics context for KS1 (school-level phonics is not published).
              Independents: Key Stage 4 tables plus Ofsted non-association
              inspections. Progress measures are sparse for 2024/25 because of
              missing KS1 baselines.
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
