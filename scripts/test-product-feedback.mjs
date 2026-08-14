/** Unit checks for usage-aware product feedback helpers. */

import assert from "node:assert/strict";

async function main() {
  const mod = await import("../src/lib/productFeedback.ts");
  const {
    adaptiveFeedbackQuestion,
    FEEDBACK_AUTO_PROMPT_ENGAGED_SECONDS,
    FEEDBACK_AUTO_PROMPT_PAGE_GRACE_SECONDS,
    FEEDBACK_CAMPAIGN_ID,
    FEEDBACK_ENGAGED_SECONDS,
    isUsageDeep,
    isUsageEngaged,
    serializeFeedbackForIntake,
    shouldAutoPromptFeedback,
  } = mod;

  assert.ok(FEEDBACK_CAMPAIGN_ID.length > 3);
  assert.ok(FEEDBACK_AUTO_PROMPT_ENGAGED_SECONDS >= 180);
  assert.ok(FEEDBACK_AUTO_PROMPT_PAGE_GRACE_SECONDS >= 60);
  assert.ok(FEEDBACK_ENGAGED_SECONDS >= 60);

  const cold = {
    hadPostcode: false,
    shortlistCountMax: 0,
    openedSideBySide: false,
    sawVisitPack: false,
    printedVisitPack: false,
    stages: [],
    sectors: [],
    sessionStartedAt: new Date().toISOString(),
    engagedSeconds: 10,
  };
  assert.equal(isUsageEngaged(cold), false);
  assert.equal(isUsageDeep(cold), false);

  const mapped = { ...cold, hadPostcode: true };
  assert.equal(isUsageEngaged(mapped), true);
  assert.match(adaptiveFeedbackQuestion(mapped), /shortlist|nearby|map/i);

  const compared = {
    ...cold,
    shortlistCountMax: 3,
    openedSideBySide: true,
    engagedSeconds: 90,
  };
  assert.equal(isUsageDeep(compared), true);
  assert.match(adaptiveFeedbackQuestion(compared), /side by side/i);

  const serialized = serializeFeedbackForIntake({
    campaignId: FEEDBACK_CAMPAIGN_ID,
    appVersion: "0.1.0",
    trigger: "engaged",
    sentiment: "mixed",
    topics: ["compare", "data-trust"],
    note: "Hard to tell what Att8 means",
    email: "parent@example.com",
    usage: compared,
    adaptiveQuestion: adaptiveFeedbackQuestion(compared),
    pageUrl: "https://schoolcompass.uk/",
    requestedAt: "2026-08-01T12:00:00.000Z",
  });
  assert.equal(serialized.kind, "product-feedback");
  assert.equal(serialized.sentiment, "mixed");
  assert.equal(serialized.hasEmail, "yes");
  assert.ok(serialized.machineJson.includes('"openedSideBySide":true'));
  const machine = JSON.parse(serialized.machineJson);
  assert.deepEqual(machine.topics, ["compare", "data-trust"]);

  // Without browser storage, auto-prompt should stay closed (tour / storage gates).
  const decision = shouldAutoPromptFeedback(compared, { pageLoadSeconds: 300 });
  assert.equal(decision.open, false);

  // Deep usage still waits for page-load grace even when engaged long enough.
  // Mark the tour seen so we exercise the grace gate (not tour-pending).
  const g = globalThis;
  const store = new Map();
  g.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  };
  const { TOUR_STORAGE_KEY } = await import("../src/lib/tour.ts");
  g.window.localStorage.setItem(TOUR_STORAGE_KEY, "1");

  const deepReady = {
    ...compared,
    engagedSeconds: FEEDBACK_AUTO_PROMPT_ENGAGED_SECONDS,
  };
  const tooSoon = shouldAutoPromptFeedback(deepReady, {
    pageLoadSeconds: FEEDBACK_AUTO_PROMPT_PAGE_GRACE_SECONDS - 1,
  });
  assert.equal(tooSoon.open, false);
  assert.equal(tooSoon.reason, "page-grace");

  const ready = shouldAutoPromptFeedback(deepReady, {
    pageLoadSeconds: FEEDBACK_AUTO_PROMPT_PAGE_GRACE_SECONDS,
  });
  assert.equal(ready.open, true);
  assert.equal(ready.reason, "deep-engagement");

  console.log("OK product-feedback");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
