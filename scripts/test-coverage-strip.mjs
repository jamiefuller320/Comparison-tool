/** Unit checks for coverage strip + secondary context helpers. */

async function main() {
  const {
    buildCoverageSummary,
    hasSecondaryContext,
    secondaryContextItems,
    shouldSuggestSecondaryContext,
    COVERAGE_DIMENSIONS,
  } = await import("../src/lib/coverageStrip.ts");
  const { gapsForKs4Board, GAP_REASON_LEGEND } = await import(
    "../src/lib/dataGaps.ts"
  );

  if (COVERAGE_DIMENSIONS.length !== 4) {
    console.error("FAIL expected 4 coverage dimensions");
    process.exit(1);
  }
  if (!GAP_REASON_LEGEND["not-comparable"]?.short) {
    console.error("FAIL reason legend");
    process.exit(1);
  }

  const isiIndie = {
    urn: "9001",
    name: "Example College",
    sector: "independent",
    phase: "secondary",
    ageRange: "11 to 18",
    phases: ["ks3", "ks4"],
    att8Average: null,
    inspectorateName: "ISI",
    isiReportsUrl: "https://example.test/isi",
    isiLatestReportUrl: "https://example.test/isi.pdf",
    schoolWebsite: "https://example.test/school",
    inspectionPrecis: "Pupils feel safe and are ambitious.",
    inspectionQuotes: [
      {
        text: "Pupils feel safe and are ambitious.",
        sourceUrl: "https://example.test/isi.pdf",
      },
    ],
  };

  const gaps = gapsForKs4Board([isiIndie]);
  if (!gaps.some((g) => g.reasonCode === "not-published" || g.reasonCode === "isi-inspectorate")) {
    console.error("FAIL ks4 gaps should carry reason codes", gaps);
    process.exit(1);
  }

  const summary = buildCoverageSummary([isiIndie], "ks4", gaps);
  if (summary.totals.outcomes.present !== 0 || summary.totals.directory.present !== 1) {
    console.error("FAIL coverage totals", summary.totals);
    process.exit(1);
  }
  if (!summary.schools[0].present.inspection || !summary.schools[0].present.precis) {
    console.error("FAIL inspection/precis coverage", summary.schools[0]);
    process.exit(1);
  }
  if (!hasSecondaryContext(isiIndie)) {
    console.error("FAIL hasSecondaryContext");
    process.exit(1);
  }
  if (!shouldSuggestSecondaryContext([isiIndie], "ks4")) {
    console.error("FAIL should suggest secondary context for thin indie");
    process.exit(1);
  }
  const items = secondaryContextItems(isiIndie);
  if (!items.some((i) => i.id === "website") || !items.some((i) => i.id === "isi-latest")) {
    console.error("FAIL secondary items", items);
    process.exit(1);
  }
  if (items.some((i) => /attainment|att8|rwm/i.test(i.label))) {
    console.error("FAIL secondary pane must not look like attainment cells", items);
    process.exit(1);
  }

  // State school with Att8 should not force-suggest secondary fill.
  const statePub = {
    urn: "100",
    name: "State High",
    sector: "state",
    ageRange: "11 to 16",
    phases: ["ks3", "ks4"],
    att8Average: 48,
  };
  if (shouldSuggestSecondaryContext([statePub], "ks4")) {
    console.error("FAIL should not suggest when outcomes published");
    process.exit(1);
  }

  console.log("coverage strip ok");
}

main();
