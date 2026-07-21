const cases = [
  ["3 to 11", ["early-years", "ks1", "ks2"]],
  ["4 to 11", ["early-years", "ks1", "ks2"]],
  ["7 to 11", ["ks2"]],
  ["3 to 7", ["early-years", "ks1"]],
  ["4 to 7", ["early-years", "ks1"]],
  ["11 to 16", ["secondary"]],
  ["11 to 18", ["secondary"]],
  ["4 to 16", ["early-years", "ks1", "ks2", "secondary"]],
  ["3 to 19", ["early-years", "ks1", "ks2", "secondary"]],
  ["9 to 13", ["ks2", "secondary"]],
  ["5 to 11", ["ks1", "ks2"]],
];

async function main() {
  const {
    phasesFromAgeRange,
    schoolMatchesPhases,
  } = await import("../src/lib/phases.ts");

  for (const [age, expected] of cases) {
    const got = phasesFromAgeRange(age);
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      console.error("FAIL phases", age, got, expected);
      process.exit(1);
    }
  }

  // Multi-phase primary must appear under EY, KS1 and KS2 selectors
  const primary = { ageRange: "3 to 11" };
  for (const phase of ["early-years", "ks1", "ks2"]) {
    if (!schoolMatchesPhases(primary, [phase])) {
      console.error("FAIL include primary for", phase);
      process.exit(1);
    }
  }
  if (schoolMatchesPhases(primary, ["secondary"])) {
    console.error("FAIL primary should not match secondary-only");
    process.exit(1);
  }

  // All-through always included for every stage
  const allThrough = { ageRange: "4 to 18" };
  for (const phase of ["early-years", "ks1", "ks2", "secondary"]) {
    if (!schoolMatchesPhases(allThrough, [phase])) {
      console.error("FAIL include all-through for", phase);
      process.exit(1);
    }
  }

  // OR across multiple selected stages
  const junior = { ageRange: "7 to 11" };
  if (!schoolMatchesPhases(junior, ["ks1", "ks2"])) {
    console.error("FAIL junior should match when KS2 is among selected");
    process.exit(1);
  }
  if (schoolMatchesPhases(junior, ["early-years", "ks1"])) {
    console.error("FAIL junior should not match EY/KS1 only");
    process.exit(1);
  }

  console.log(`phase coverage ok (${cases.length} age ranges + inclusion checks)`);
}

main();
