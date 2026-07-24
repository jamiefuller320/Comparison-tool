const cases = [
  ["Academy converter", "state"],
  ["Community school", "state"],
  ["Free school", "state"],
  ["Voluntary aided school", "state"],
  ["Other independent school", "independent"],
  ["Other independent special school", "independent"],
  ["Non-maintained special school", "independent"],
  ["British schools overseas", "independent"],
  ["Offshore schools", "independent"],
  [null, "state"],
];

async function main() {
  const {
    sectorFromSchoolType,
    schoolMatchesSectors,
    parseSectorsParam,
    resolveSchoolSector,
  } = await import("../src/lib/sectors.ts");

  for (const [label, expected] of cases) {
    const got = sectorFromSchoolType(label);
    if (got !== expected) {
      console.error("FAIL sector", label, got, expected);
      process.exit(1);
    }
  }

  const indie = { schoolTypeLabel: "Other independent school" };
  const state = { schoolTypeLabel: "Academy converter" };
  if (!schoolMatchesSectors(indie, ["independent"])) {
    console.error("FAIL indie match");
    process.exit(1);
  }
  if (schoolMatchesSectors(indie, ["state"])) {
    console.error("FAIL indie should not match state-only");
    process.exit(1);
  }
  if (!schoolMatchesSectors(state, ["state", "independent"])) {
    console.error("FAIL state should match when both selected");
    process.exit(1);
  }
  if (
    resolveSchoolSector({
      sector: "independent",
      schoolTypeLabel: "Community school",
    }) !== "independent"
  ) {
    console.error("FAIL explicit sector should win");
    process.exit(1);
  }
  const parsed = parseSectorsParam("independent,state,bogus");
  if (parsed.join(",") !== "independent,state") {
    console.error("FAIL parseSectorsParam", parsed);
    process.exit(1);
  }
  if (parseSectorsParam(null).join(",") !== "state") {
    console.error("FAIL default sectors");
    process.exit(1);
  }
  if (!schoolMatchesSectors(indie, ["independent"])) {
    console.error("FAIL indie exclusive match");
    process.exit(1);
  }
  if (schoolMatchesSectors(state, ["independent"])) {
    console.error("FAIL state should not match independent-only");
    process.exit(1);
  }

  console.log(`sector classifier ok (${cases.length} types)`);
}

main();
