/** Unit checks for printable shortlist figure tables. */

async function main() {
  const { buildPrintCompareTable } = await import(
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

  const secondary = {
    urn: "2",
    name: "Example College",
    sector: "independent",
    phase: "secondary",
    phases: ["ks4"],
    att8Average: 55.2,
    engMath94Percent: 80,
    ofstedOverall: null,
  };
  const ks4 = buildPrintCompareTable([secondary], "ks4");
  if (!ks4?.rows.some((r) => r.id === "att8Average")) {
    console.error("FAIL ks4 print table", ks4);
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

  console.log("print pack metrics ok");
}

main();
