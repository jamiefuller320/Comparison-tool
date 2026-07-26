async function main() {
  const {
    NURSERY_VISIT_QUESTIONS,
    questionsForKind,
    toVisitContactRow,
    visitPackKind,
  } = await import("../src/lib/visitPack.ts");
  const {
    VISIT_STATUS_OPTIONS,
    isVisitStatusId,
    upsertVisitLogEntry,
    visitStatusLabel,
  } = await import("../src/lib/visitLog.ts");
  const { CHILDMINDER_VETTING_CHECKLIST } = await import(
    "../src/lib/childminderChecklist.ts"
  );

  if (NURSERY_VISIT_QUESTIONS.length < 6) {
    console.error("FAIL nursery questions too short");
    process.exit(1);
  }
  if (questionsForKind("childminder") !== CHILDMINDER_VETTING_CHECKLIST) {
    console.error("FAIL childminder questions should reuse checklist");
    process.exit(1);
  }
  if (questionsForKind("nursery")[0].id !== "registration") {
    console.error("FAIL nursery questions shape");
    process.exit(1);
  }

  const daycare = {
    urn: "ey:EY1",
    name: "Oak Day Care",
    source: "ofsted-childcare",
    address: "1 High Street",
    town: "Romsey",
    postcode: "SO51 1AA",
    ofstedOverall: "Good",
    ofstedReportUrl: "https://example.test/report",
    places: 24,
  };
  if (visitPackKind(daycare) !== "nursery") {
    console.error("FAIL daycare kind");
    process.exit(1);
  }
  const daycareRow = toVisitContactRow(daycare);
  if (!daycareRow?.addressLine.includes("Romsey") || !daycareRow.ofstedReportUrl) {
    console.error("FAIL daycare contact row", daycareRow);
    process.exit(1);
  }

  const childminder = {
    urn: "cm:EY2",
    name: "Jane Example",
    source: "ofsted-consented-childminder",
    address: "2 Lane",
    postcode: "SO40 2HR",
    ofstedOverall: "Outstanding",
  };
  if (visitPackKind(childminder) !== "childminder") {
    console.error("FAIL childminder kind");
    process.exit(1);
  }

  const schoolEy = {
    urn: "116266",
    name: "Test Infant",
    sector: "state",
    phases: ["early-years", "ks1"],
    ageRange: "4 to 7",
    ofstedOverall: "Good",
    ofstedEarlyYearsProvision: "Good",
  };
  if (visitPackKind(schoolEy) !== "nursery") {
    console.error("FAIL school EY should be nursery pack kind");
    process.exit(1);
  }

  if (!isVisitStatusId("visited") || isVisitStatusId("maybe")) {
    console.error("FAIL visit status ids");
    process.exit(1);
  }
  if (VISIT_STATUS_OPTIONS.length < 4) {
    console.error("FAIL visit statuses");
    process.exit(1);
  }
  const next = upsertVisitLogEntry({}, "ey:EY1", {
    status: "phoned",
    note: "Called Monday",
  });
  if (next["ey:EY1"]?.status !== "phoned" || !next["ey:EY1"].updatedAt) {
    console.error("FAIL upsert visit log", next);
    process.exit(1);
  }
  if (visitStatusLabel("waiting") !== "Waiting list") {
    console.error("FAIL status label");
    process.exit(1);
  }

  console.log(
    `visit pack ok (${NURSERY_VISIT_QUESTIONS.length} nursery Qs; ` +
      `${CHILDMINDER_VETTING_CHECKLIST.length} childminder Qs)`,
  );
}

main();
