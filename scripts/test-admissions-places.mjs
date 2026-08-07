async function main() {
  const {
    demandPressureHint,
    fillPressureHint,
    formatDemandRatio,
    schoolHasAdmissionsPlaces,
  } = await import("../src/lib/admissionsPlaces.ts");

  if (schoolHasAdmissionsPlaces({})) {
    console.error("FAIL empty school should not have admissions places");
    process.exit(1);
  }
  if (
    !schoolHasAdmissionsPlaces({
      schoolPlaces: 210,
      placesFillPercent: 98.5,
    })
  ) {
    console.error("FAIL capacity-only school should count");
    process.exit(1);
  }

  if (formatDemandRatio(1.25) !== "1.25×") {
    console.error("FAIL formatDemandRatio", formatDemandRatio(1.25));
    process.exit(1);
  }
  if (formatDemandRatio(null) !== "—") {
    console.error("FAIL formatDemandRatio null");
    process.exit(1);
  }

  if (!demandPressureHint(1.4)?.includes("More first preferences")) {
    console.error("FAIL demandPressureHint high", demandPressureHint(1.4));
    process.exit(1);
  }
  if (!fillPressureHint(102)?.includes("above published capacity")) {
    console.error("FAIL fillPressureHint", fillPressureHint(102));
    process.exit(1);
  }

  console.log("OK admissions-places");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
