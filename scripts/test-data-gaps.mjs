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
  if (!schoolGaps(ks2, "1").length || schoolGaps(ks2, "2").length) {
    console.error("FAIL ks2 school gaps should be state-only", ks2);
    process.exit(1);
  }

  const nilKs4 = {
    urn: "3",
    name: "No figures High",
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

  console.log("data gaps detectors ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
