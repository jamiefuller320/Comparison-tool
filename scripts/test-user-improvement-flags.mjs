/** Unit checks for summary thumbs / user improvement flag helpers. */

import assert from "node:assert/strict";

async function main() {
  const mod = await import("../src/lib/qualitativeImprovementFlag.ts");
  const {
    DOWN_REASON_OPTIONS,
    IMPROVEMENT_FLAG_KIND_DOWN,
    IMPROVEMENT_FLAG_KIND_UP,
    buildSummaryVoteNote,
    buildSummaryVotePayload,
    improvementFlagFromUsage,
    isImprovementFlag,
    reasonLabelFor,
    voteDedupeKey,
  } = mod;

  assert.ok(DOWN_REASON_OPTIONS.some((o) => o.id === "chrome-nav"));
  assert.ok(DOWN_REASON_OPTIONS.some((o) => o.id === "other"));
  assert.match(reasonLabelFor("gibberish-pdf"), /PDF/i);

  const downFlag = {
    kind: IMPROVEMENT_FLAG_KIND_DOWN,
    vote: "down",
    urn: "136450",
    schoolName: "Example School",
    area: "enrichment",
    snippet: "Dinner Menu, Pay Online",
    surface: "compare",
    reasonCode: "chrome-nav",
    reasonLabel: reasonLabelFor("chrome-nav"),
    reasonDetail: null,
  };
  assert.equal(isImprovementFlag(downFlag), true);

  const note = buildSummaryVoteNote(downFlag);
  assert.match(note, /URN 136450/);
  assert.match(note, /chrome-nav/);
  assert.match(note, /Dinner Menu/);

  const payload = buildSummaryVotePayload(downFlag, {
    hadPostcode: true,
    shortlistCountMax: 2,
    openedSideBySide: true,
    sawVisitPack: false,
    printedVisitPack: false,
    stages: ["primary"],
    sectors: ["state"],
    shortlistLas: ["Surrey"],
    sessionStartedAt: "2026-09-26T10:00:00.000Z",
    engagedSeconds: 40,
  });
  assert.equal(payload.trigger, "summary-vote");
  assert.ok(payload.topics.includes("website-scan"));
  assert.equal(payload.sentiment, "stuck");
  assert.equal(payload.usage.improvementFlag?.reasonCode, "chrome-nav");

  const fromUsage = improvementFlagFromUsage(payload.usage);
  assert.ok(fromUsage);
  assert.equal(fromUsage.vote, "down");
  assert.equal(fromUsage.urn, "136450");

  const upFlag = {
    ...downFlag,
    kind: IMPROVEMENT_FLAG_KIND_UP,
    vote: "up",
    reasonCode: null,
    reasonLabel: null,
  };
  assert.match(buildSummaryVoteNote(upFlag), /useful/i);
  assert.equal(
    voteDedupeKey({ urn: "1", area: null, vote: "down" }).includes("|summary|"),
    true,
  );

  const { classifyFeedback } = await import(
    "../scripts/process-product-feedback.ts"
  );
  const deferred = classifyFeedback({
    id: "x",
    created_at: "",
    campaign_id: "c",
    app_version: "",
    trigger: "summary-vote",
    sentiment: "stuck",
    topics: ["website-scan"],
    note: "Parent flagged",
    contact_email: null,
    adaptive_question: "",
    page_url: "/",
    surface: "compare",
    usage: { improvementFlag: downFlag },
    status: "open",
    proposed_action: null,
    triage_note: "",
    github_issue_url: null,
  });
  assert.match(deferred.note, /process-user-improvement-flags/);

  const {
    improvementFlagFromRow,
    isImprovementFeedbackRow,
  } = await import("../scripts/process-user-improvement-flags.ts");
  const row = {
    id: "y",
    created_at: "",
    campaign_id: "c",
    app_version: "",
    trigger: "summary-vote",
    sentiment: "stuck",
    topics: ["website-scan", "compare"],
    note: payload.note,
    contact_email: null,
    adaptive_question: "",
    page_url: "/",
    surface: "compare",
    usage: payload.usage,
    status: "open",
    proposed_action: null,
    triage_note: "",
    github_issue_url: null,
  };
  assert.equal(isImprovementFeedbackRow(row), true);
  const parsed = improvementFlagFromRow(row);
  assert.equal(parsed?.reasonCode, "chrome-nav");

  console.log("OK user-improvement-flags");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
