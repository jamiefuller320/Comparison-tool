import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const {
    isEyProvider,
    isEyComparable,
    schoolOffersEarlyYears,
    EY_PROVIDER_METRICS,
  } = await import("../src/lib/eyMetrics.ts");
  const { eyfspEngland, eyfspForSeedLa, EYFSP_METRICS } = await import(
    "../src/lib/eyfspMetrics.ts"
  );
  const { SEED_LOCAL_AUTHORITY } = await import("../src/lib/seedScope.ts");

  if (!isEyProvider({ urn: "ey:EY123", source: "ofsted-childcare" })) {
    console.error("FAIL isEyProvider");
    process.exit(1);
  }
  if (isEyProvider({ urn: "116338", source: "gias" })) {
    console.error("FAIL school should not be EY provider");
    process.exit(1);
  }
  if (
    !schoolOffersEarlyYears({
      ageRange: "3 to 11",
      phases: ["early-years", "ks1", "ks2"],
    })
  ) {
    console.error("FAIL schoolOffersEarlyYears");
    process.exit(1);
  }
  if (
    !isEyComparable({
      urn: "116266",
      name: "Test Primary",
      sector: "state",
      ageRange: "4 to 11",
      phases: ["early-years", "ks1", "ks2"],
      ofstedOverall: "Good",
      ofstedEarlyYearsProvision: "Good",
      ofstedSource: "ofsted-state-schools",
    })
  ) {
    console.error("FAIL isEyComparable school");
    process.exit(1);
  }
  if (
    isEyComparable({
      urn: "999001",
      name: "Junior only",
      sector: "state",
      ageRange: "7 to 11",
      phases: ["ks2"],
      ofstedOverall: "Good",
    })
  ) {
    console.error("FAIL junior-only should not be EY comparable");
    process.exit(1);
  }
  if (
    isEyComparable({
      urn: "cm:EY999",
      name: "Test Childminder",
      source: "ofsted-consented-childminder",
      ofstedOverall: "Good",
    })
  ) {
    console.error("FAIL childminder should not be EY comparable");
    process.exit(1);
  }
  if (!EY_PROVIDER_METRICS.some((m) => m.key === "ofstedEarlyYearsProvision")) {
    console.error("FAIL missing early years provision metric");
    process.exit(1);
  }
  if (EYFSP_METRICS.length < 3) {
    console.error("FAIL EYFSP metrics");
    process.exit(1);
  }

  const path = resolve(root, "public/data/ey-providers-index.json");
  const index = JSON.parse(readFileSync(path, "utf8"));
  if (index.localAuthority !== SEED_LOCAL_AUTHORITY) {
    console.error("FAIL seed LA", index.localAuthority);
    process.exit(1);
  }
  if (!index.providers?.length || index.providers.length < 100) {
    console.error("FAIL expected many Hampshire EY providers", index.providers?.length);
    process.exit(1);
  }
  const sample = index.providers[0];
  if (!sample.ofstedReportUrl || !sample.urn.startsWith("ey:")) {
    console.error("FAIL provider shape", sample);
    process.exit(1);
  }

  const schoolsIndex = JSON.parse(
    readFileSync(resolve(root, "public/data/schools-index.json"), "utf8"),
  );
  const hantsEy = (schoolsIndex.schools || []).filter(
    (s) =>
      s.localAuthority === SEED_LOCAL_AUTHORITY &&
      !String(s.urn).startsWith("ey:") &&
      Array.isArray(s.phases) &&
      s.phases.includes("early-years") &&
      (s.ofstedOverall || s.ofstedEarlyYearsProvision),
  );
  if (hantsEy.length < 200) {
    console.error(
      "FAIL expected Hampshire EY schools with Ofsted",
      hantsEy.length,
      schoolsIndex.stats?.hampshireEyStateWithOfsted,
    );
    process.exit(1);
  }
  if (!schoolsIndex.stats?.ofstedStateAsAt) {
    console.error("FAIL missing ofstedStateAsAt");
    process.exit(1);
  }
  if (!schoolsIndex.source?.datasets?.ofstedStateSchoolsMi) {
    console.error("FAIL missing ofstedStateSchoolsMi dataset link");
    process.exit(1);
  }

  const eyfsp = index.benchmarks?.eyfsp;
  const eng = eyfspEngland(eyfsp);
  const hants = eyfspForSeedLa(eyfsp);
  if (eng?.gldPercent == null || eng.gldPercent < 50 || eng.gldPercent > 90) {
    console.error("FAIL England GLD", eng);
    process.exit(1);
  }
  if (hants?.gldPercent == null || hants.gldPercent < 50 || hants.gldPercent > 90) {
    console.error("FAIL Hampshire GLD", hants);
    process.exit(1);
  }
  if (!eyfsp?.sourceUrl?.includes("early-years-foundation-stage-profile")) {
    console.error("FAIL missing EYFSP source link", eyfsp?.sourceUrl);
    process.exit(1);
  }

  console.log(
    `ey ok (${index.providers.length} day-care; ${hantsEy.length} Hants EY schools with Ofsted; ` +
      `England GLD ${eng.gldPercent.toFixed(1)}%; Hampshire GLD ${hants.gldPercent.toFixed(1)}%)`,
  );
}

main();
