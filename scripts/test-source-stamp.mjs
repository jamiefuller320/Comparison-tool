async function main() {
  const {
    formatSourceStamp,
    ks2TablesStamp,
    ks4TablesStamp,
    ofstedStateStamp,
    ofstedChildcareStamp,
    eyfspStamp,
    phonicsStamp,
    childminderConsentStamp,
    schoolDeepLink,
  } = await import("../src/lib/sourceStamp.ts");
  const { serializeChallengeForIntake } = await import(
    "../src/lib/dataChallenge.ts"
  );

  const ks2 = ks2TablesStamp({
    period: "2024/2025",
    primarySite: "https://www.compare-school-performance.service.gov.uk/",
    generatedAt: "2026-07-21",
  });
  if (ks2.id !== "ks2-tables" || !ks2.period || !ks2.deepLink) {
    console.error("FAIL ks2 stamp", ks2);
    process.exit(1);
  }

  const summary = formatSourceStamp(ks2);
  if (!summary.includes("KS2") || !summary.includes("2024/2025")) {
    console.error("FAIL formatSourceStamp", summary);
    process.exit(1);
  }

  const stamps = [
    ks4TablesStamp({ period: "2024/2025", datasetId: "ks4-id" }),
    ofstedStateStamp({ asAt: "30 June 2026" }),
    ofstedChildcareStamp({ asAt: "30 June 2026" }),
    eyfspStamp({ period: "2024/2025" }),
    phonicsStamp({ period: "2024/2025", datasetId: "phonics-id" }),
    childminderConsentStamp({ consentedAsAt: "2026-07-01" }),
  ];
  for (const stamp of stamps) {
    if (!stamp.id || !stamp.label || !stamp.deepLink) {
      console.error("FAIL stamp shape", stamp);
      process.exit(1);
    }
  }

  const link = schoolDeepLink({
    ofstedReportUrl: "https://reports.ofsted.gov.uk/example",
  });
  if (link !== "https://reports.ofsted.gov.uk/example") {
    console.error("FAIL schoolDeepLink", link);
    process.exit(1);
  }

  const serialized = serializeChallengeForIntake({
    board: "ks2",
    urn: "116338",
    schoolName: "Example Primary",
    field: "rwmExpected",
    fieldLabel: "RWM expected",
    shownValue: "72%",
    stamp: ks2,
    note: "Figure does not match CSP.",
    email: "parent@example.com",
    pageUrl: "https://example.test/?schools=116338",
    requestedAt: "2026-07-27T12:00:00.000Z",
  });

  if (
    serialized.board !== "ks2" ||
    serialized.urn !== "116338" ||
    serialized.stampId !== "ks2-tables" ||
    serialized.hasEmail !== "yes" ||
    !serialized.stampSummary.includes("KS2") ||
    serialized.note !== "Figure does not match CSP."
  ) {
    console.error("FAIL serializeChallengeForIntake", serialized);
    process.exit(1);
  }

  console.log("source stamp + challenge serialize ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
