/** Unit checks for printable shortlist figure tables. */

async function main() {
  const { buildPrintCompareTable, buildPrintChartSeries } = await import(
    "../src/lib/printPackMetrics.ts"
  );

  const primary = {
    urn: "1",
    name: "Oak Junior School",
    sector: "state",
    phase: "primary",
    phases: ["ks2"],
    rwmExpected: 72,
    rwmHigher: 12,
    readingExpected: 80,
    writingExpected: 78,
    mathsExpected: 79,
    readingScaled: 105,
    mathsScaled: 104,
    eligiblePupils: 60,
  };
  const ks2 = buildPrintCompareTable([primary], "ks2");
  if (!ks2 || ks2.rows.length < 5) {
    console.error("FAIL ks2 print table", ks2);
    process.exit(1);
  }
  if (!ks2.rows.some((r) => r.id === "rwmExpected" && r.values[0] === "72%")) {
    console.error("FAIL rwmExpected formatting", ks2.rows);
    process.exit(1);
  }

  const ks2Charts = buildPrintChartSeries([primary], "ks2");
  if (ks2Charts.length !== 1 || ks2Charts[0].unit !== "pct") {
    console.error("FAIL ks2 chart series", ks2Charts);
    process.exit(1);
  }
  if (ks2Charts[0].schools[0].values[0] !== 72) {
    console.error("FAIL ks2 chart value", ks2Charts[0]);
    process.exit(1);
  }

  const secondary = {
    urn: "2",
    name: "Example College",
    sector: "independent",
    phase: "secondary",
    phases: ["ks4"],
    att8Average: 55.2,
    engMath94Percent: 80,
    engMath95Percent: 62,
    ebaccEnteringPercent: 40,
    ofstedOverall: null,
  };
  const ks4 = buildPrintCompareTable([secondary], "ks4");
  if (!ks4?.rows.some((r) => r.id === "att8Average")) {
    console.error("FAIL ks4 print table", ks4);
    process.exit(1);
  }

  const ks4Charts = buildPrintChartSeries([secondary], "ks4");
  if (ks4Charts.length !== 2) {
    console.error("FAIL ks4 should split score + pct charts", ks4Charts);
    process.exit(1);
  }
  if (ks4Charts[0].unit !== "score" || ks4Charts[1].unit !== "pct") {
    console.error("FAIL ks4 chart units", ks4Charts.map((c) => c.unit));
    process.exit(1);
  }

  const nursery = {
    urn: "ey:1",
    name: "Oak Day Care",
    source: "ofsted-childcare",
    ofstedOverall: "Good",
    places: 24,
  };
  const ey = buildPrintCompareTable([nursery], "early-years");
  if (!ey?.rows.some((r) => r.id === "ofstedOverall" && r.values[0] === "Good")) {
    console.error("FAIL ey print table", ey);
    process.exit(1);
  }
  if (buildPrintChartSeries([nursery], "early-years").length !== 0) {
    console.error("FAIL ey should not produce attainment charts");
    process.exit(1);
  }

  console.log("print pack metrics ok");
}

main();
