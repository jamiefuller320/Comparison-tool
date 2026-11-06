import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const { addressHasGiasPlaceholder, stripGiasAddress, stripGiasToken } =
    await import("../src/lib/giasAddress.ts");
  const { giasRedirectHref, formatGiasCloseDate } = await import(
    "../src/lib/giasRedirects.ts"
  );
  const { schoolJsonLd } = await import("../src/lib/seoSchools.ts");

  const cleaned = stripGiasAddress("Belle Vue Road, z, z, Aldershot");
  if (cleaned !== "Belle Vue Road, Aldershot") {
    console.error("FAIL stripGiasAddress", cleaned);
    process.exit(1);
  }
  if (stripGiasAddress("Zetland Road, Winchester") !== "Zetland Road, Winchester") {
    console.error("FAIL street containing z");
    process.exit(1);
  }
  if (stripGiasToken("z") !== null || stripGiasAddress("n/a") !== null) {
    console.error("FAIL null token should clear the field");
    process.exit(1);
  }
  if (!addressHasGiasPlaceholder("Road, z, Town")) {
    console.error("FAIL placeholder detector");
    process.exit(1);
  }

  const onSite = giasRedirectHref({
    urn: "115881",
    name: "Droxford Junior School",
    localAuthority: "Hampshire",
    areaSlug: "hampshire",
    successorUrn: "152067",
    successorName: "Droxford Junior School",
    successorOnSite: true,
    closeDate: "2025-10-31",
    closeReason: "Academy Converter",
  });
  if (onSite !== "https://schoolcompass.uk/schools/152067/") {
    console.error("FAIL on-site redirect", onSite);
    process.exit(1);
  }
  const offSite = giasRedirectHref({
    urn: "1",
    name: "Closed",
    localAuthority: "Hampshire",
    areaSlug: "hampshire",
    successorUrn: "2",
    successorName: "Successor",
    successorOnSite: false,
    closeDate: null,
    closeReason: null,
  });
  if (!offSite.includes("/Establishments/Establishment/Details/2")) {
    console.error("FAIL off-site redirect", offSite);
    process.exit(1);
  }
  if (formatGiasCloseDate("2025-10-31") !== "31 October 2025") {
    console.error("FAIL close date", formatGiasCloseDate("2025-10-31"));
    process.exit(1);
  }

  const dirty = {
    urn: "116234",
    name: "Example School",
    localAuthority: "Hampshire",
    areaSlug: "hampshire",
    town: "Aldershot",
    postcode: "GU11 1AA",
    address: "Belle Vue Road, z, z, Aldershot",
    phase: "primary",
    phases: ["ks2"],
    sector: "state",
    schoolTypeLabel: "Community school",
    ageRange: "4 to 11",
    ofstedOverall: null,
    ofstedPublicationDate: null,
    ofstedReportUrl: null,
    rwmExpected: null,
    att8Average: null,
    engMath94Percent: null,
    schoolWebsite: null,
    giasUrl: null,
    compareUrl: null,
    inspectionPrecis: null,
    inspectionReportFileUrl: null,
    inspectionReportLabel: null,
    dataGeneratedAt: null,
    dataPeriod: null,
    qualitativeThemes: [],
  };
  const ld = schoolJsonLd(dirty);
  const schoolNode = ld["@graph"].find((node) => node["@type"] === "School");
  const street = schoolNode?.address?.streetAddress;
  if (street !== "Belle Vue Road, Aldershot") {
    console.error("FAIL JSON-LD streetAddress", street);
    process.exit(1);
  }
  if (String(street).includes(", z")) {
    console.error("FAIL JSON-LD still has z", street);
    process.exit(1);
  }

  const redirectsPath = join(root, "public/data/gias-successor-redirects.json");
  const coverage = JSON.parse(
    readFileSync(join(root, "public/data/seo-coverage.json"), "utf8"),
  );
  if (coverage.pageBudget?.maxSchoolPages !== 5000) {
    console.error("FAIL cap changed", coverage.pageBudget);
    process.exit(1);
  }
  let redirects = { redirects: [] };
  try {
    redirects = JSON.parse(readFileSync(redirectsPath, "utf8"));
  } catch {
    redirects = { redirects: [] };
  }
  if (!Array.isArray(redirects.redirects) || redirects.redirects.length === 0) {
    console.error("FAIL successor redirect manifest missing");
    process.exit(1);
  }

  console.log(
    `PASS test-gias-address (${redirects.redirects.length} redirects, cap 5000)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
