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
    shortlistLas: [],
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
    usage: { ...compared, shortlistLas: ["Surrey", "Hampshire"] },
    adaptiveQuestion: adaptiveFeedbackQuestion(compared),
    pageUrl: "https://schoolcompass.uk/areas/surrey/",
    requestedAt: "2026-08-01T12:00:00.000Z",
  });
  assert.equal(serialized.kind, "product-feedback");
  assert.equal(serialized.sentiment, "mixed");
  assert.equal(serialized.hasEmail, "yes");
  assert.ok(serialized.machineJson.includes('"openedSideBySide":true'));
  assert.ok(serialized.machineJson.includes('"shortlistLas"'));
  assert.match(serialized.usageShortlistLas, /Surrey/);
  const machine = JSON.parse(serialized.machineJson);
  assert.deepEqual(machine.topics, ["compare", "data-trust"]);
  assert.deepEqual(machine.shortlistLas, ["Surrey", "Hampshire"]);
  assert.equal(serialized.surface, "");

  const { feedbackToInsertRow } = await import(
    "../src/lib/productFeedbackSupabase.ts"
  );
  const row = feedbackToInsertRow({
    campaignId: FEEDBACK_CAMPAIGN_ID,
    appVersion: "0.1.0",
    trigger: "page",
    sentiment: "freeform",
    topics: ["map"],
    note: "Pins overlap on mobile",
    email: null,
    usage: compared,
    adaptiveQuestion: "q",
    pageUrl: "https://schoolcompass.uk/",
    surface: "find",
    requestedAt: "2026-09-25T12:00:00.000Z",
  });
  assert.equal(row.status, "open");
  assert.equal(row.proposed_action, null);
  assert.equal(row.surface, "find");
  assert.equal(row.triage_note, "");

  const { inferFeedbackSurface, feedbackPageHref } = await import(
    "../src/lib/feedbackSurface.ts"
  );
  assert.equal(inferFeedbackSurface("/feedback/", ""), "feedback-page");
  assert.equal(inferFeedbackSurface("/", "compare"), "compare");
  assert.equal(inferFeedbackSurface("/areas/surrey/", ""), "areas");
  assert.match(feedbackPageHref({ surface: "find" }), /surface=find/);

  const { classifyFeedback } = await import(
    "../scripts/process-product-feedback.ts"
  );
  const {
    projectRefFromUrl,
    projectRefFromServiceKey,
    envUrl,
    serviceKey,
  } = await import("../scripts/process-product-feedback.ts");

  assert.equal(
    projectRefFromUrl("https://djjpznwiujujfoyvkmsp.supabase.co"),
    "djjpznwiujujfoyvkmsp",
  );
  assert.equal(projectRefFromUrl("https://example.com"), null);
  // Synthetic JWT payload {"ref":"abc123ref","role":"service_role"}
  const fakeJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    Buffer.from(
      JSON.stringify({ ref: "abc123ref", role: "service_role" }),
    ).toString("base64url") +
    ".sig";
  assert.equal(projectRefFromServiceKey(fakeJwt), "abc123ref");
  assert.equal(projectRefFromServiceKey("sb_secret_not_a_jwt"), null);

  const prevUrl = process.env.SCHOOL_COMPASS_SUPABASE_URL;
  const prevKey = process.env.SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY;
  const prevGeneric = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SCHOOL_COMPASS_SUPABASE_URL =
    "https://djjpznwiujujfoyvkmsp.supabase.co";
  process.env.SUPABASE_URL = "https://wrong.supabase.co";
  process.env.SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY = "sc-role-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "hl-role-key";
  assert.equal(envUrl(), "https://djjpznwiujujfoyvkmsp.supabase.co");
  assert.equal(serviceKey(), "sc-role-key");
  if (prevUrl === undefined) delete process.env.SCHOOL_COMPASS_SUPABASE_URL;
  else process.env.SCHOOL_COMPASS_SUPABASE_URL = prevUrl;
  if (prevKey === undefined)
    delete process.env.SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY = prevKey;
  if (prevGeneric === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = prevGeneric;
  delete process.env.SUPABASE_URL;

  const ignore = classifyFeedback({
    id: "1",
    created_at: "",
    campaign_id: "c",
    app_version: "",
    trigger: "manual",
    sentiment: "mixed",
    topics: [],
    note: "test",
    contact_email: null,
    adaptive_question: "",
    page_url: "",
    surface: "",
    usage: {},
    status: "open",
    proposed_action: null,
    triage_note: "",
    github_issue_url: null,
  });
  assert.equal(ignore.action, "ignore");

  const implement = classifyFeedback({
    id: "2",
    created_at: "",
    campaign_id: "c",
    app_version: "",
    trigger: "engaged",
    sentiment: "stuck",
    topics: ["print-pack"],
    note: "Visit pack print is blank on iPhone Safari",
    contact_email: null,
    adaptive_question: "",
    page_url: "/",
    surface: "visit-pack",
    usage: {},
    status: "open",
    proposed_action: null,
    triage_note: "",
    github_issue_url: null,
  });
  assert.equal(implement.action, "implement");

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
