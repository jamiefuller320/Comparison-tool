async function main() {
  const {
    admissionsSummaryGapLabel,
    capacityBlankLabel,
    classifyCapacityMissing,
    classifyOffersMissing,
    demandPressureHint,
    fillPressureHint,
    formatDemandRatio,
    offersBlankLabel,
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

  const indie = {
    urn: "i1",
    name: "Indie Prep",
    sector: "independent",
    schoolTypeLabel: "Other independent school",
    phase: "all-through",
  };
  if (classifyCapacityMissing(indie) !== "independent") {
    console.error("FAIL indie capacity", classifyCapacityMissing(indie));
    process.exit(1);
  }
  if (classifyOffersMissing(indie) !== "independent") {
    console.error("FAIL indie offers", classifyOffersMissing(indie));
    process.exit(1);
  }
  if (!capacityBlankLabel(indie)?.includes("state capacity")) {
    console.error("FAIL capacityBlankLabel indie", capacityBlankLabel(indie));
    process.exit(1);
  }

  const junior = {
    urn: "j1",
    name: "Test Junior School",
    sector: "state",
    phase: "junior",
    ageRange: "7 to 11",
    schoolTypeLabel: "Community school",
  };
  if (classifyOffersMissing(junior) !== "junior-transfer") {
    console.error("FAIL junior offers", classifyOffersMissing(junior));
    process.exit(1);
  }
  if (!offersBlankLabel(junior)?.includes("Junior transfer")) {
    console.error("FAIL offersBlankLabel junior", offersBlankLabel(junior));
    process.exit(1);
  }
  // Juniors often still have capacity — summary should prefer junior-transfer
  // only when capacity is also missing.
  if (!admissionsSummaryGapLabel(junior)?.includes("Junior transfer")) {
    console.error(
      "FAIL summary junior",
      admissionsSummaryGapLabel(junior),
    );
    process.exit(1);
  }

  const juniorWithCap = {
    ...junior,
    schoolPlaces: 360,
    pupilsOnRoll: 340,
    placesFillPercent: 94.4,
  };
  if (admissionsSummaryGapLabel(juniorWithCap) != null) {
    console.error(
      "FAIL junior with capacity should not use full summary gap",
      admissionsSummaryGapLabel(juniorWithCap),
    );
    process.exit(1);
  }
  if (offersBlankLabel(juniorWithCap) !== offersBlankLabel(junior)) {
    console.error("FAIL junior with capacity still needs offers gap label");
    process.exit(1);
  }

  const special = {
    urn: "s1",
    name: "Special School",
    sector: "state",
    schoolTypeLabel: "Community special school",
    phase: "all-through",
  };
  if (classifyCapacityMissing(special) !== "special-ap") {
    console.error("FAIL special capacity", classifyCapacityMissing(special));
    process.exit(1);
  }

  console.log("OK admissions-places");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
