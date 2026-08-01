async function main() {
  const {
    gapsForKs2Board,
    gapsForKs4Board,
    gapsForEyOfstedBoard,
    gapsForChildminders,
    gapsForPhonics,
    gapsForEyfsp,
    isUngradedOfsted,
    hasKs4NilCleared,
    classifyKs4Missing,
    isSpecialApOrPru,
    isKs3OnlySecondary,
    isHospitalOrSecure,
    isRecentlyOpenedForKs4,
    ks4OutcomeBlankHint,
    ofstedBlankHintForIsi,
    passesComparableKs4Filter,
    hasPublishedKs4,
    boardGaps,
    schoolGaps,
  } = await import("../src/lib/dataGaps.ts");

  const stateNilKs2 = {
    urn: "1",
    name: "Nil Primary",
    sector: "state",
    ageRange: "4-11",
    phases: ["ks1", "ks2"],
    rwmExpected: null,
  };
  const indieKs2 = {
    urn: "2",
    name: "Indie Prep",
    sector: "independent",
    ageRange: "4-11",
    phases: ["ks1", "ks2"],
    rwmExpected: null,
  };

  const ks2 = gapsForKs2Board([stateNilKs2, indieKs2]);
  if (!boardGaps(ks2).some((g) => g.id === "nil-ks2-rwm-board")) {
    console.error("FAIL ks2 board gap", ks2);
    process.exit(1);
  }
  if (!boardGaps(ks2).some((g) => g.id === "nil-ks2-ofsted-board")) {
    console.error("FAIL ks2 ofsted board gap", ks2);
    process.exit(1);
  }
  if (!schoolGaps(ks2, "1").length || schoolGaps(ks2, "2").length) {
    console.error("FAIL ks2 school gaps should be state-only", ks2);
    process.exit(1);
  }
  if (!schoolGaps(ks2, "1").some((g) => g.id === "nil-ks2-ofsted:1")) {
    console.error("FAIL ks2 ofsted school gap", schoolGaps(ks2, "1"));
    process.exit(1);
  }

  const nilKs4 = {
    urn: "3",
    name: "No figures High",
    ageRange: "11 to 16",
    att8Average: null,
    ks5ApsPerEntry: null,
    engMathMeasureUnavailable: true,
    ks4ClearedNilFields: ["engMath94Percent"],
  };
  const ks4 = gapsForKs4Board([nilKs4]);
  if (!hasKs4NilCleared(nilKs4)) {
    console.error("FAIL hasKs4NilCleared");
    process.exit(1);
  }
  if (!boardGaps(ks4).some((g) => g.id === "nil-ks4-board")) {
    console.error("FAIL ks4 board gap", ks4);
    process.exit(1);
  }
  if (classifyKs4Missing(nilKs4) !== "no-published") {
    console.error("FAIL classify ordinary missing", classifyKs4Missing(nilKs4));
    process.exit(1);
  }

  const special = {
    urn: "s1",
    name: "Forest Park School",
    ageRange: "2 to 19",
    schoolTypeLabel: "Community special school",
    att8Average: null,
    ks5ApsPerEntry: null,
  };
  if (!isSpecialApOrPru(special) || classifyKs4Missing(special) !== "special-ap-pru") {
    console.error("FAIL special/AP classify", special);
    process.exit(1);
  }
  const specialGaps = gapsForKs4Board([special]);
  if (
    !schoolGaps(specialGaps, "s1").some(
      (g) =>
        g.label === "Special or alternative provision" &&
        g.reasonCode === "not-comparable",
    )
  ) {
    console.error("FAIL special gap label", specialGaps);
    process.exit(1);
  }

  const hospital = {
    urn: "h1",
    name: "Leigh House Hospital",
    ageRange: "12 to 19",
    schoolTypeLabel: "Miscellaneous",
    att8Average: null,
    ks5ApsPerEntry: null,
  };
  if (!isHospitalOrSecure(hospital) || classifyKs4Missing(hospital) !== "hospital-secure") {
    console.error("FAIL hospital classify", hospital, classifyKs4Missing(hospital));
    process.exit(1);
  }

  const newAcademy = {
    urn: "n1",
    name: "Brand New Academy",
    ageRange: "11 to 16",
    schoolTypeLabel: "Academy sponsor led",
    openDate: "2024-01-01",
    reasonEstablishmentOpened: "New Provision",
    att8Average: null,
    ks5ApsPerEntry: null,
  };
  if (!isRecentlyOpenedForKs4(newAcademy) || classifyKs4Missing(newAcademy) !== "new-establishment") {
    console.error("FAIL new establishment classify", newAcademy);
    process.exit(1);
  }

  const ks3Only = {
    urn: "m1",
    name: "Middle Years",
    ageRange: "11 to 14",
    att8Average: null,
    ks5ApsPerEntry: null,
  };
  if (!isKs3OnlySecondary(ks3Only) || classifyKs4Missing(ks3Only) !== "ks3-only") {
    console.error("FAIL ks3-only classify", ks3Only);
    process.exit(1);
  }
  const hint = ks4OutcomeBlankHint(ks3Only);
  if (!hint || !hint.toLowerCase().includes("year 11")) {
    console.error("FAIL ks3-only blank hint", hint);
    process.exit(1);
  }

  const isi = {
    urn: "i1",
    name: "ISI College",
    sector: "independent",
    ageRange: "11 to 18",
    inspectorateName: "ISI",
    isiReportsUrl: "https://www.isi.net/school/x",
    ofstedOverall: null,
    att8Average: 55,
  };
  const isiGaps = gapsForKs4Board([isi]);
  if (!schoolGaps(isiGaps, "i1").some((g) => g.label.includes("ISI"))) {
    console.error("FAIL ISI gap", isiGaps);
    process.exit(1);
  }
  const isiHint = ofstedBlankHintForIsi(isi);
  if (!isiHint || !isiHint.includes("ISI")) {
    console.error("FAIL ISI ofsted blank hint", isiHint);
    process.exit(1);
  }
  // ISI must not be blamed for missing KS4 when Att8 is present.
  if (schoolGaps(isiGaps, "i1").some((g) => g.id.startsWith("nil-ks4:"))) {
    console.error("FAIL ISI should not get nil-ks4 when Att8 present", isiGaps);
    process.exit(1);
  }

  const ungraded = {
    urn: "ey:9",
    name: "Report-led Nursery",
    source: "ofsted-childcare",
    ofstedOverall: null,
    ofstedQualityOfEducation: "Good",
    ofstedReportUrl: "https://reports.ofsted.gov.uk/x",
    ofstedInspectionDate: null,
  };
  if (!isUngradedOfsted(ungraded)) {
    console.error("FAIL isUngradedOfsted");
    process.exit(1);
  }
  const ey = gapsForEyOfstedBoard([ungraded], {
    childcareOfstedAsAt: null,
    stateOfstedAsAt: "30 June 2026",
  });
  if (!ey.some((g) => g.id === "missing-ofsted-as-at-childcare")) {
    console.error("FAIL childcare as-at gap", ey);
    process.exit(1);
  }
  if (!schoolGaps(ey, "ey:9").some((g) => g.label.includes("Ungraded"))) {
    console.error("FAIL ungraded school gap", ey);
    process.exit(1);
  }
  if (!schoolGaps(ey, "ey:9").some((g) => g.id.startsWith("ofsted-date-missing"))) {
    console.error("FAIL inspection date gap", ey);
    process.exit(1);
  }

  const cm = gapsForChildminders(
    [
      {
        urn: "cm:1",
        name: "CM",
        source: "ofsted-consented-childminder",
        ofstedOverall: null,
      },
    ],
    { consentedAsAt: null },
  );
  if (!cm.some((g) => g.id === "missing-consented-as-at")) {
    console.error("FAIL childminder as-at", cm);
    process.exit(1);
  }

  const phonics = gapsForPhonics(
    [{ urn: "4", name: "X", localAuthority: "Nowhereshire" }],
    {
      period: "2024/2025",
      england: { year1Expected: 80 },
      localAuthorities: { Hampshire: { year1Expected: 79 } },
    },
  );
  if (!phonics.some((g) => g.id === "phonics-la-missing-board")) {
    console.error("FAIL phonics LA gap", phonics);
    process.exit(1);
  }

  const eyfspMissing = gapsForEyfsp(null);
  if (!eyfspMissing.some((g) => g.id === "missing-eyfsp-benches")) {
    console.error("FAIL eyfsp missing", eyfspMissing);
    process.exit(1);
  }
  const eyfspOk = gapsForEyfsp({
    england: { gldPercent: 67 },
    localAuthorities: { Hampshire: { gldPercent: 68 } },
  });
  if (eyfspOk.length) {
    console.error("FAIL eyfsp should be empty", eyfspOk);
    process.exit(1);
  }

  const mainstream = {
    urn: "m2",
    name: "Att8 High",
    ageRange: "11 to 16",
    att8Average: 50,
  };
  const specialNoAtt8 = {
    urn: "s2",
    name: "Special High",
    ageRange: "11 to 16",
    schoolTypeLabel: "Community special school",
    att8Average: null,
  };
  if (
    !passesComparableKs4Filter(mainstream, {
      comparableOnly: true,
      secondaryStagesActive: true,
    }) ||
    passesComparableKs4Filter(specialNoAtt8, {
      comparableOnly: true,
      secondaryStagesActive: true,
    })
  ) {
    console.error("FAIL passesComparableKs4Filter");
    process.exit(1);
  }
  if (
    !passesComparableKs4Filter(specialNoAtt8, {
      comparableOnly: false,
      secondaryStagesActive: true,
    })
  ) {
    console.error("FAIL comparable off should pass");
    process.exit(1);
  }
  if (!hasPublishedKs4(mainstream) || hasPublishedKs4(specialNoAtt8)) {
    console.error("FAIL hasPublishedKs4");
    process.exit(1);
  }

  console.log("data gaps detectors ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
