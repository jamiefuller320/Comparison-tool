/** Unit checks for provision filter + in-page nav helpers. */
async function main() {
  const {
    schoolMatchesProvision,
    normalizeProvisionFilter,
    DEFAULT_PROVISION,
  } = await import("../src/lib/provisionFilter.ts");
  const { isHomePath, homeSectionHref, scrollToHomeSection } = await import(
    "../src/lib/inPageNav.ts"
  );
  const { normalizeStageMatchMode, schoolMatchesPhases } = await import(
    "../src/lib/phases.ts"
  );

  if (DEFAULT_PROVISION !== "any") {
    console.error("FAIL default provision");
    process.exit(1);
  }
  if (normalizeProvisionFilter("specialist") !== "specialist") {
    console.error("FAIL normalize specialist");
    process.exit(1);
  }
  if (normalizeProvisionFilter("nope") !== "any") {
    console.error("FAIL normalize fallback");
    process.exit(1);
  }

  const special = {
    urn: "1",
    name: "Example Special School",
    schoolTypeLabel: "Community special school",
  };
  const mainstream = {
    urn: "2",
    name: "Example Primary",
    schoolTypeLabel: "Community school",
  };
  if (!schoolMatchesProvision(special, "specialist")) {
    console.error("FAIL specialist match");
    process.exit(1);
  }
  if (schoolMatchesProvision(mainstream, "specialist")) {
    console.error("FAIL mainstream should not match specialist-only");
    process.exit(1);
  }
  if (!schoolMatchesProvision(mainstream, "mainstream")) {
    console.error("FAIL mainstream filter");
    process.exit(1);
  }
  if (schoolMatchesProvision(special, "mainstream")) {
    console.error("FAIL specialist should not match mainstream-only");
    process.exit(1);
  }

  if (normalizeStageMatchMode("all") !== "all") {
    console.error("FAIL stage match all");
    process.exit(1);
  }
  if (normalizeStageMatchMode(null) !== "any") {
    console.error("FAIL stage match default");
    process.exit(1);
  }
  if (
    !schoolMatchesPhases({ ageRange: "7 to 11" }, ["ks1", "ks2"], "any") ||
    schoolMatchesPhases({ ageRange: "7 to 11" }, ["ks1", "ks2"], "all")
  ) {
    console.error("FAIL junior OR/AND");
    process.exit(1);
  }

  if (!isHomePath("/") || !isHomePath("/Comparison-tool/")) {
    console.error("FAIL isHomePath");
    process.exit(1);
  }
  if (isHomePath("/areas/")) {
    console.error("FAIL isHomePath areas");
    process.exit(1);
  }
  if (typeof scrollToHomeSection !== "function") {
    console.error("FAIL scrollToHomeSection export");
    process.exit(1);
  }
  // Without window, homeSectionHref falls back to absolute home hash.
  const href = homeSectionHref("side-by-side", "?schools=1");
  if (href !== "/#side-by-side") {
    console.error("FAIL homeSectionHref offline", href);
    process.exit(1);
  }

  console.log("OK provision + in-page nav");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
