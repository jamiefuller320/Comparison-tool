import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const {
    SEO_TOWN_MIN_SCHOOLS,
    getSeoSchool,
    getSeoTown,
    isSeoAreaIncluded,
    listSeoAreasWithTowns,
    listSeoCoverageAreaSlugs,
    listSeoHampshireSchools,
    listSeoSchools,
    listSeoTowns,
    readSeoCoverage,
    schoolPath,
    townPath,
    townsIndexPath,
  } = await import("../src/lib/seoSchools.ts");

  const coverage = readSeoCoverage();
  if (!coverage.includedAreaSlugs.includes("hampshire")) {
    console.error("FAIL seed missing from coverage", coverage.includedAreaSlugs);
    process.exit(1);
  }
  if (!isSeoAreaIncluded("hampshire")) {
    console.error("FAIL isSeoAreaIncluded hampshire");
    process.exit(1);
  }
  if (SEO_TOWN_MIN_SCHOOLS < 1) {
    console.error("FAIL town min");
    process.exit(1);
  }

  const schools = listSeoSchools();
  const hampshire = listSeoHampshireSchools();
  if (schools.length < 500) {
    console.error("FAIL school count", schools.length);
    process.exit(1);
  }
  if (hampshire.length < 500 || hampshire.length > schools.length) {
    console.error("FAIL hampshire subset", hampshire.length, schools.length);
    process.exit(1);
  }

  const sample = schools[0];
  if (!sample?.urn || getSeoSchool(sample.urn)?.urn !== sample.urn) {
    console.error("FAIL getSeoSchool", sample);
    process.exit(1);
  }
  if (schoolPath(sample.urn) !== `/schools/${sample.urn}/`) {
    console.error("FAIL schoolPath");
    process.exit(1);
  }

  const towns = listSeoTowns("hampshire");
  if (towns.length < 10) {
    console.error("FAIL hampshire towns", towns.length);
    process.exit(1);
  }
  const winchester = getSeoTown("winchester", "hampshire");
  if (!winchester || winchester.areaSlug !== "hampshire") {
    console.error("FAIL winchester town", winchester);
    process.exit(1);
  }
  if (townPath("winchester", "hampshire") !== "/areas/hampshire/towns/winchester/") {
    console.error("FAIL townPath");
    process.exit(1);
  }
  if (townsIndexPath("hampshire") !== "/areas/hampshire/towns/") {
    console.error("FAIL townsIndexPath");
    process.exit(1);
  }
  if (!listSeoAreasWithTowns().includes("hampshire")) {
    console.error("FAIL areas with towns");
    process.exit(1);
  }
  if (!listSeoCoverageAreaSlugs().includes("hampshire")) {
    console.error("FAIL coverage slugs");
    process.exit(1);
  }

  // Manifest file should stay valid JSON for the loop.
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const raw = JSON.parse(
    readFileSync(join(root, "public/data/seo-coverage.json"), "utf8"),
  );
  if (!Array.isArray(raw.includedAreaSlugs)) {
    console.error("FAIL seo-coverage.json shape");
    process.exit(1);
  }

  console.log(
    `PASS test-seo-schools (${schools.length} school pages, ${towns.length} Hampshire towns)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
