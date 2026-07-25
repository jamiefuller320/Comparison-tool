import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const {
    isChildminder,
    isEyProvider,
    isEyDirectorySetting,
  } = await import("../src/lib/eyMetrics.ts");
  const { CHILDMINDER_VETTING_CHECKLIST } = await import(
    "../src/lib/childminderChecklist.ts"
  );
  const { SEED_LOCAL_AUTHORITY } = await import("../src/lib/seedScope.ts");

  if (!isChildminder({ urn: "cm:EY123", source: "ofsted-consented-childminder" })) {
    console.error("FAIL isChildminder");
    process.exit(1);
  }
  if (isEyProvider({ urn: "cm:EY123", source: "ofsted-consented-childminder" })) {
    console.error("FAIL childminder must not be day-care provider");
    process.exit(1);
  }
  if (
    !isEyDirectorySetting({
      urn: "cm:EY123",
      source: "ofsted-consented-childminder",
    })
  ) {
    console.error("FAIL isEyDirectorySetting childminder");
    process.exit(1);
  }
  if (CHILDMINDER_VETTING_CHECKLIST.length < 6) {
    console.error("FAIL checklist too short");
    process.exit(1);
  }
  if (!CHILDMINDER_VETTING_CHECKLIST.some((i) => i.id === "registration")) {
    console.error("FAIL checklist missing registration item");
    process.exit(1);
  }

  const path = resolve(root, "public/data/childminders-index.json");
  const index = JSON.parse(readFileSync(path, "utf8"));
  if (index.localAuthority !== SEED_LOCAL_AUTHORITY) {
    console.error("FAIL seed LA", index.localAuthority);
    process.exit(1);
  }
  if (!index.providers?.length || index.providers.length < 100) {
    console.error("FAIL expected many Hampshire childminders", index.providers?.length);
    process.exit(1);
  }
  const sample = index.providers[0];
  if (
    !sample.urn?.startsWith("cm:") ||
    sample.source !== "ofsted-consented-childminder" ||
    !sample.ofstedReportUrl ||
    !sample.postcode ||
    !sample.consentedAddress
  ) {
    console.error("FAIL childminder shape", sample);
    process.exit(1);
  }
  if (sample.latitude == null || sample.longitude == null) {
    console.error("FAIL expected geocoded sample", sample);
    process.exit(1);
  }
  if (!index.consentedAsAt || !index.source?.consentedAddressesCsv) {
    console.error("FAIL missing consented source metadata");
    process.exit(1);
  }
  if (!String(index.source.refreshNote || "").toLowerCase().includes("quarter")) {
    console.error("FAIL missing refresh note about quarterly overwrite");
    process.exit(1);
  }

  console.log(
    `childminders ok (${index.providers.length} consented; as at ${index.consentedAsAt})`,
  );
}

main();
