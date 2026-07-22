const cases = [
  ["3 to 11", ["early-years", "ks1", "ks2"]],
  ["4 to 11", ["early-years", "ks1", "ks2"]],
  ["7 to 11", ["ks2"]],
  ["3 to 7", ["early-years", "ks1"]],
  ["4 to 7", ["early-years", "ks1"]],
  ["11 to 16", ["ks3", "ks4"]],
  ["11 to 18", ["ks3", "ks4"]],
  ["11 to 14", ["ks3"]],
  ["14 to 18", ["ks4"]],
  ["4 to 16", ["early-years", "ks1", "ks2", "ks3", "ks4"]],
  ["3 to 19", ["early-years", "ks1", "ks2", "ks3", "ks4"]],
  ["9 to 13", ["ks2", "ks3"]],
  ["5 to 11", ["ks1", "ks2"]],
];

async function main() {
  const {
    phasesFromAgeRange,
    schoolMatchesPhases,
    normalizePhaseIds,
  } = await import("../src/lib/phases.ts");

  for (const [age, expected] of cases) {
    const got = phasesFromAgeRange(age);
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      console.error("FAIL phases", age, got, expected);
      process.exit(1);
    }
  }

  const primary = { ageRange: "3 to 11" };
  for (const phase of ["early-years", "ks1", "ks2"]) {
    if (!schoolMatchesPhases(primary, [phase])) {
      console.error("FAIL include primary for", phase);
      process.exit(1);
    }
  }
  if (schoolMatchesPhases(primary, ["ks3"]) || schoolMatchesPhases(primary, ["ks4"])) {
    console.error("FAIL primary should not match KS3/KS4");
    process.exit(1);
  }

  const allThrough = { ageRange: "4 to 18" };
  for (const phase of ["early-years", "ks1", "ks2", "ks3", "ks4"]) {
    if (!schoolMatchesPhases(allThrough, [phase])) {
      console.error("FAIL include all-through for", phase);
      process.exit(1);
    }
  }

  // Legacy JSON phases must not block KS3 matching
  const legacy = { ageRange: "11 to 16", phases: ["secondary"] };
  if (!schoolMatchesPhases(legacy, ["ks3"]) || !schoolMatchesPhases(legacy, ["ks4"])) {
    console.error("FAIL legacy secondary school should match KS3/KS4 via age range");
    process.exit(1);
  }

  const junior = { ageRange: "7 to 11" };
  if (!schoolMatchesPhases(junior, ["ks1", "ks2"])) {
    console.error("FAIL junior should match when KS2 is among selected");
    process.exit(1);
  }

  if (JSON.stringify(normalizePhaseIds(["secondary", "ks2"])) !== JSON.stringify(["ks3", "ks4", "ks2"])) {
    console.error("FAIL normalize secondary", normalizePhaseIds(["secondary", "ks2"]));
    process.exit(1);
  }

  console.log(`phase coverage ok (${cases.length} age ranges + inclusion checks)`);
}

main();
