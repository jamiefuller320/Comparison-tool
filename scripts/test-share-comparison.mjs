/** Unit checks for comparison share/copy helpers. */
async function main() {
  const {
    buildComparisonShareText,
    buildComparisonShareUrl,
  } = await import("../src/lib/shareComparison.ts");

  if (!/School Compass/.test(buildComparisonShareText([]))) {
    console.error("FAIL empty shortlist brand");
    process.exit(1);
  }
  if (
    buildComparisonShareText(["Alpha Primary"]) !==
    "Have a look at Alpha Primary on School Compass."
  ) {
    console.error("FAIL single school share text");
    process.exit(1);
  }
  if (
    buildComparisonShareText(["Alpha Primary", "Beta School"]) !==
    "Comparing Alpha Primary and Beta School on School Compass."
  ) {
    console.error("FAIL two-school share text");
    process.exit(1);
  }
  if (
    buildComparisonShareText(["A", "B", "C"]) !==
    "Comparing A, B, and C on School Compass."
  ) {
    console.error("FAIL three-school share text");
    process.exit(1);
  }

  const withHash = buildComparisonShareUrl({
    href: "https://schoolcompass.uk/?schools=1,2&stages=ks2",
    hash: "side-by-side",
  });
  if (
    withHash !==
    "https://schoolcompass.uk/?schools=1,2&stages=ks2#side-by-side"
  ) {
    console.error("FAIL share url hash", withHash);
    process.exit(1);
  }

  const keepsQuery = buildComparisonShareUrl({
    href: "https://schoolcompass.uk/?schools=9&stages=ks1,ks2&sectors=state",
  });
  if (
    keepsQuery !==
    "https://schoolcompass.uk/?schools=9&stages=ks1,ks2&sectors=state"
  ) {
    console.error("FAIL share url query", keepsQuery);
    process.exit(1);
  }

  console.log("OK shareComparison");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
