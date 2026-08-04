async function main() {
  const {
    NURSERY_VISIT_QUESTIONS,
    SCHOOL_VISIT_QUESTIONS,
    computePrintNoteHeightPx,
    guidancePathForPack,
    questionsForKind,
    toVisitContactRow,
    visitPackKind,
  } = await import("../src/lib/visitPack.ts");
  const { guidanceForPath, guidancePrintLines } = await import(
    "../src/lib/decisionGuidance.ts"
  );
  const { printVisitPackElement } = await import("../src/lib/printVisitPack.ts");
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

  const primary = {
    urn: "116000",
    name: "Test Junior",
    sector: "state",
    phase: "primary",
    phases: ["ks2"],
    ageRange: "7 to 11",
    address: "3 Road",
    town: "Eastleigh",
    postcode: "SO50 1AA",
  };
  if (visitPackKind(primary) !== "school") {
    console.error("FAIL primary should be school pack kind");
    process.exit(1);
  }
  const schoolRow = toVisitContactRow(primary, "school");
  if (!schoolRow?.addressLine.includes("Eastleigh") || schoolRow.kind !== "school") {
    console.error("FAIL school contact row", schoolRow);
    process.exit(1);
  }

  const withContacts = toVisitContactRow(
    {
      ...primary,
      telephone: "01962 000000",
      contactCapture: {
        urn: "116000",
        name: "Test Junior",
        assessedAt: "2026-08-04",
        engineVersion: "0.1.0",
        contacts: [
          {
            role: "headteacher",
            name: "Alex Example",
            sourceType: "gias",
            sourceUrl: "https://example.test/gias/116000",
            capturedAt: "2026-08-04",
          },
          {
            role: "senco",
            name: "Sam Senco",
            email: "senco@example.test",
            sourceType: "school-website",
            sourceUrl: "https://example.test/contact",
            capturedAt: "2026-08-04",
          },
        ],
      },
    },
    "school",
  );
  if (!withContacts?.headteacher?.includes("Alex") || !withContacts.senco) {
    console.error("FAIL contact capture merge on visit row", withContacts);
    process.exit(1);
  }
  if (questionsForKind("school").length < 6) {
    console.error("FAIL school visit questions too short");
    process.exit(1);
  }
  if (guidancePathForPack({ schools: [primary], preferPath: "ks2" }) !== "ks2") {
    console.error("FAIL guidance path prefer");
    process.exit(1);
  }
  const ks2Guide = guidanceForPath("ks2");
  if (!ks2Guide.sections.some((s) => s.id === "telling" && s.items.length >= 2)) {
    console.error("FAIL ks2 guidance telling section");
    process.exit(1);
  }
  if (!guidancePrintLines("ks2").lines.length) {
    console.error("FAIL print guidance lines");
    process.exit(1);
  }
  if (SCHOOL_VISIT_QUESTIONS[0].id !== "feel") {
    console.error("FAIL school questions shape");
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

  const noteOne = computePrintNoteHeightPx(1);
  const noteMany = computePrintNoteHeightPx(8);
  if (noteOne < 300) {
    console.error("FAIL one-school-per-page notes should be tall", noteOne);
    process.exit(1);
  }
  if (noteMany !== noteOne) {
    console.error(
      "FAIL note height is per page now, independent of shortlist size",
      noteMany,
      noteOne,
    );
    process.exit(1);
  }

  if (typeof printVisitPackElement !== "function") {
    console.error("FAIL printVisitPackElement missing");
    process.exit(1);
  }

  console.log(
    `visit pack ok (${NURSERY_VISIT_QUESTIONS.length} nursery Qs; ` +
      `${CHILDMINDER_VETTING_CHECKLIST.length} childminder Qs; ` +
      `${SCHOOL_VISIT_QUESTIONS.length} school Qs; ` +
      `note heights ${noteOne}/${noteMany}px)`,
  );
}

main();
