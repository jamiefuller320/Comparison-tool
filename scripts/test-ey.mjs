import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const { isEyProvider } = await import("../src/lib/eyMetrics.ts");
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
    `ey ok (${index.providers.length} providers; England GLD ${eng.gldPercent.toFixed(1)}%; ` +
      `Hampshire GLD ${hants.gldPercent.toFixed(1)}%)`,
  );
}

main();
