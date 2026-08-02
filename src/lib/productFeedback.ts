/**
 * Product feedback — usage-aware soft prompt + structured GitHub intake.
 * Parallel to data-challenge, but for UX / soft-launch learning loops.
 */

import { APP_VERSION, FEEDBACK_CAMPAIGN_ID } from "@/lib/buildMeta";
import { hasSeenTour } from "@/lib/tour";

export const FEEDBACK_OPEN_EVENT = "schoolside:open-feedback";
export const FEEDBACK_USAGE_EVENT = "schoolside:feedback-usage";
export const FEEDBACK_PRINTED_EVENT = "schoolside:visit-pack-printed";

export type FeedbackTrigger =
  | "manual"
  | "engaged"
  | "exit-return"
  | "update"
  | "after-print";

export type FeedbackSentiment =
  | "helpful"
  | "mixed"
  | "stuck"
  | "not-for-me"
  | "skipped";

export type FeedbackTopic =
  | "map"
  | "shortlist"
  | "compare"
  | "print-pack"
  | "data-trust"
  | "coverage"
  | "account"
  | "other";

export interface FeedbackUsage {
  hadPostcode: boolean;
  shortlistCountMax: number;
  openedSideBySide: boolean;
  sawVisitPack: boolean;
  printedVisitPack: boolean;
  stages: string[];
  sectors: string[];
  sessionStartedAt: string;
  /** Rough engaged seconds accumulated while the tab is visible. */
  engagedSeconds: number;
}

export interface ProductFeedbackPayload {
  campaignId: string;
  appVersion: string;
  trigger: FeedbackTrigger;
  sentiment: FeedbackSentiment;
  topics: FeedbackTopic[];
  note: string;
  email?: string | null;
  usage: FeedbackUsage;
  adaptiveQuestion: string;
  pageUrl?: string | null;
  requestedAt: string;
}

const USAGE_KEY = "schoolside.feedback.usage.v1";
const EXIT_PENDING_KEY = "schoolside.feedback.exitPending.v1";

function campaignKey(kind: "responded" | "dismissed" | "prompted"): string {
  return `schoolside.feedback.${kind}.${FEEDBACK_CAMPAIGN_ID}`;
}

function emptyUsage(): FeedbackUsage {
  return {
    hadPostcode: false,
    shortlistCountMax: 0,
    openedSideBySide: false,
    sawVisitPack: false,
    printedVisitPack: false,
    stages: [],
    sectors: [],
    sessionStartedAt: new Date().toISOString(),
    engagedSeconds: 0,
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getFeedbackUsage(): FeedbackUsage {
  const base = emptyUsage();
  const stored = readJson<Partial<FeedbackUsage>>(USAGE_KEY, {});
  return {
    ...base,
    ...stored,
    stages: Array.isArray(stored.stages) ? stored.stages.map(String) : [],
    sectors: Array.isArray(stored.sectors) ? stored.sectors.map(String) : [],
    shortlistCountMax: Math.max(0, Number(stored.shortlistCountMax) || 0),
    engagedSeconds: Math.max(0, Number(stored.engagedSeconds) || 0),
  };
}

export function recordFeedbackUsage(
  patch: Partial<FeedbackUsage> & {
    shortlistCount?: number;
  },
): FeedbackUsage {
  if (typeof window === "undefined") return emptyUsage();
  const prev = getFeedbackUsage();
  const next: FeedbackUsage = {
    ...prev,
    // Sticky true flags — a later false patch must not erase engagement.
    hadPostcode: Boolean(prev.hadPostcode || patch.hadPostcode),
    openedSideBySide: Boolean(prev.openedSideBySide || patch.openedSideBySide),
    sawVisitPack: Boolean(prev.sawVisitPack || patch.sawVisitPack),
    printedVisitPack: Boolean(prev.printedVisitPack || patch.printedVisitPack),
    stages: patch.stages ?? prev.stages,
    sectors: patch.sectors ?? prev.sectors,
    sessionStartedAt: prev.sessionStartedAt || new Date().toISOString(),
    engagedSeconds:
      typeof patch.engagedSeconds === "number"
        ? Math.max(prev.engagedSeconds, patch.engagedSeconds)
        : prev.engagedSeconds,
    shortlistCountMax: Math.max(
      prev.shortlistCountMax,
      Number(patch.shortlistCountMax) || 0,
      Number(patch.shortlistCount) || 0,
    ),
  };
  window.localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  return next;
}

export function bumpEngagedSeconds(delta: number): FeedbackUsage {
  const prev = getFeedbackUsage();
  return recordFeedbackUsage({
    engagedSeconds: prev.engagedSeconds + Math.max(0, delta),
  });
}

export function hasRespondedFeedback(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(campaignKey("responded")) === "1";
}

export function hasDismissedFeedback(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(campaignKey("dismissed")) === "1";
}

export function hasPromptedFeedback(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(campaignKey("prompted")) === "1";
}

export function markFeedbackResponded(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(campaignKey("responded"), "1");
  window.localStorage.removeItem(EXIT_PENDING_KEY);
}

export function markFeedbackDismissed(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(campaignKey("dismissed"), "1");
  window.localStorage.setItem(campaignKey("prompted"), "1");
  window.localStorage.removeItem(EXIT_PENDING_KEY);
}

export function markFeedbackPrompted(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(campaignKey("prompted"), "1");
}

export function markExitFeedbackPending(): void {
  if (typeof window === "undefined") return;
  if (hasRespondedFeedback() || hasDismissedFeedback()) return;
  if (!isUsageEngaged(getFeedbackUsage())) return;
  window.sessionStorage.setItem(EXIT_PENDING_KEY, "1");
}

export function consumeExitFeedbackPending(): boolean {
  if (typeof window === "undefined") return false;
  const pending = window.sessionStorage.getItem(EXIT_PENDING_KEY) === "1";
  if (pending) window.sessionStorage.removeItem(EXIT_PENDING_KEY);
  return pending;
}

export function requestOpenFeedback(trigger: FeedbackTrigger = "manual"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FEEDBACK_OPEN_EVENT, { detail: { trigger } }),
  );
}

export function isUsageEngaged(usage: FeedbackUsage): boolean {
  return (
    usage.hadPostcode ||
    usage.shortlistCountMax >= 1 ||
    usage.openedSideBySide ||
    usage.sawVisitPack ||
    usage.printedVisitPack ||
    usage.engagedSeconds >= 45
  );
}

export function isUsageDeep(usage: FeedbackUsage): boolean {
  return (
    usage.shortlistCountMax >= 2 ||
    usage.openedSideBySide ||
    usage.printedVisitPack ||
    (usage.sawVisitPack && usage.engagedSeconds >= 60)
  );
}

export interface FeedbackPromptDecision {
  open: boolean;
  trigger: FeedbackTrigger;
  reason: string;
}

/**
 * Decide whether to auto-open the soft feedback sheet.
 * Avoids colliding with the first-run tour.
 */
export function shouldAutoPromptFeedback(
  usage: FeedbackUsage,
  opts: { tourOpen?: boolean; forceTrigger?: FeedbackTrigger | null } = {},
): FeedbackPromptDecision {
  if (opts.forceTrigger) {
    return {
      open: true,
      trigger: opts.forceTrigger,
      reason: "forced",
    };
  }
  if (hasRespondedFeedback() || hasDismissedFeedback()) {
    return { open: false, trigger: "engaged", reason: "already-handled" };
  }
  if (opts.tourOpen) {
    return { open: false, trigger: "engaged", reason: "tour-open" };
  }
  // Let first-time visitors finish or skip the tour before we ask.
  if (!hasSeenTour() && !hasPromptedFeedback()) {
    return { open: false, trigger: "engaged", reason: "tour-pending" };
  }

  if (typeof window !== "undefined") {
    const exitPending = window.sessionStorage.getItem(EXIT_PENDING_KEY) === "1";
    if (exitPending && isUsageEngaged(usage) && !hasPromptedFeedback()) {
      window.sessionStorage.removeItem(EXIT_PENDING_KEY);
      return {
        open: true,
        trigger: "exit-return",
        reason: "returned-after-exit",
      };
    }
  }

  if (usage.printedVisitPack && !hasPromptedFeedback()) {
    return {
      open: true,
      trigger: "after-print",
      reason: "printed-visit-pack",
    };
  }

  if (isUsageDeep(usage) && usage.engagedSeconds >= 75 && !hasPromptedFeedback()) {
    return {
      open: true,
      trigger: "engaged",
      reason: "deep-engagement",
    };
  }

  return { open: false, trigger: "engaged", reason: "waiting" };
}

export function adaptiveFeedbackQuestion(usage: FeedbackUsage): string {
  if (usage.printedVisitPack) {
    return "Was the printable visit pack useful on a real visit — or what would you change?";
  }
  if (usage.openedSideBySide && usage.shortlistCountMax >= 2) {
    return "When you compared schools side by side, what helped — and what felt unclear or missing?";
  }
  if (usage.shortlistCountMax >= 1 && !usage.openedSideBySide) {
    return "You shortlisted settings but didn’t open the compare board — what stopped you, or what would help next?";
  }
  if (usage.hadPostcode && usage.shortlistCountMax === 0) {
    return "You looked nearby but didn’t shortlist — what was missing on the map or list?";
  }
  if (!isUsageEngaged(usage)) {
    return "School Compass is still under development. What would make you try a full shortlist next time?";
  }
  return "What’s the one improvement that would help most while School Compass is still under development?";
}

export const FEEDBACK_TOPIC_OPTIONS: { id: FeedbackTopic; label: string }[] = [
  { id: "map", label: "Map / near home" },
  { id: "shortlist", label: "Shortlist" },
  { id: "compare", label: "Side by side" },
  { id: "print-pack", label: "Visit pack" },
  { id: "data-trust", label: "Trusting the numbers" },
  { id: "coverage", label: "Area coverage" },
  { id: "account", label: "Saving / account" },
  { id: "other", label: "Something else" },
];

export const FEEDBACK_SENTIMENT_OPTIONS: {
  id: Exclude<FeedbackSentiment, "skipped">;
  label: string;
}[] = [
  { id: "helpful", label: "Helpful so far" },
  { id: "mixed", label: "Mixed" },
  { id: "stuck", label: "I got stuck" },
  { id: "not-for-me", label: "Not for me" },
];

export function serializeFeedbackForIntake(
  payload: ProductFeedbackPayload,
): Record<string, string> {
  const usage = payload.usage;
  return {
    kind: "product-feedback",
    campaignId: payload.campaignId,
    appVersion: payload.appVersion,
    trigger: payload.trigger,
    sentiment: payload.sentiment,
    topics: payload.topics.join(","),
    note: payload.note.slice(0, 2000),
    hasEmail: payload.email?.trim() ? "yes" : "no",
    email: (payload.email ?? "").trim().slice(0, 200),
    adaptiveQuestion: payload.adaptiveQuestion.slice(0, 400),
    pageUrl: payload.pageUrl ?? "",
    requestedAt: payload.requestedAt,
    usageHadPostcode: usage.hadPostcode ? "yes" : "no",
    usageShortlistMax: String(usage.shortlistCountMax),
    usageOpenedSideBySide: usage.openedSideBySide ? "yes" : "no",
    usageSawVisitPack: usage.sawVisitPack ? "yes" : "no",
    usagePrintedVisitPack: usage.printedVisitPack ? "yes" : "no",
    usageStages: usage.stages.join(","),
    usageSectors: usage.sectors.join(","),
    usageEngagedSeconds: String(Math.round(usage.engagedSeconds)),
    usageSessionStartedAt: usage.sessionStartedAt,
    machineJson: JSON.stringify({
      kind: "product-feedback",
      campaignId: payload.campaignId,
      appVersion: payload.appVersion,
      trigger: payload.trigger,
      sentiment: payload.sentiment,
      topics: payload.topics,
      adaptiveQuestion: payload.adaptiveQuestion,
      usage: {
        hadPostcode: usage.hadPostcode,
        shortlistCountMax: usage.shortlistCountMax,
        openedSideBySide: usage.openedSideBySide,
        sawVisitPack: usage.sawVisitPack,
        printedVisitPack: usage.printedVisitPack,
        stages: usage.stages,
        sectors: usage.sectors,
        engagedSeconds: Math.round(usage.engagedSeconds),
        sessionStartedAt: usage.sessionStartedAt,
      },
      requestedAt: payload.requestedAt,
      pageUrl: payload.pageUrl ?? null,
      hasEmail: Boolean(payload.email?.trim()),
    }),
  };
}

export async function requestProductFeedback(
  input: Omit<
    ProductFeedbackPayload,
    "campaignId" | "appVersion" | "usage" | "requestedAt" | "pageUrl"
  > & {
    usage?: FeedbackUsage;
    pageUrl?: string | null;
    requestedAt?: string;
  },
): Promise<{
  ok: boolean;
  status: "queued" | "unavailable" | "error";
  detail: string;
}> {
  if (input.sentiment === "skipped" && !input.note.trim()) {
    markFeedbackDismissed();
    return {
      ok: true,
      status: "queued",
      detail: "No problem — you can share feedback anytime from the header.",
    };
  }

  if (input.sentiment !== "skipped" && !input.note.trim() && !input.topics.length) {
    return {
      ok: false,
      status: "error",
      detail: "Pick a topic or add a short note so we can act on it.",
    };
  }

  const payload: ProductFeedbackPayload = {
    campaignId: FEEDBACK_CAMPAIGN_ID,
    appVersion: APP_VERSION,
    trigger: input.trigger,
    sentiment: input.sentiment,
    topics: input.topics,
    note: input.note.trim() || "(no free-text note)",
    email: input.email?.trim() || null,
    usage: input.usage || getFeedbackUsage(),
    adaptiveQuestion: input.adaptiveQuestion,
    pageUrl:
      input.pageUrl ||
      (typeof window !== "undefined" ? window.location.href : null),
    requestedAt: input.requestedAt || new Date().toISOString(),
  };

  const token = process.env.NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN;
  const repo =
    process.env.NEXT_PUBLIC_GITHUB_REPO || "jamiefuller320/Comparison-tool";
  const clientPayload = serializeFeedbackForIntake(payload);

  if (!token) {
    markFeedbackResponded();
    return {
      ok: true,
      status: "unavailable",
      detail:
        "Feedback intake is not configured for this deploy. Your note was kept locally as dismissed for this campaign — ask the maintainer to set MISSING_SCHOOL_DISPATCH_TOKEN.",
    };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "product-feedback",
        client_payload: clientPayload,
      }),
    });

    if (res.status === 204 || res.ok) {
      markFeedbackResponded();
      return {
        ok: true,
        status: "queued",
        detail:
          "Thanks — your feedback was queued for the soft-launch improvement cycle. Optional email is kept off the public issue body.",
      };
    }

    const body = await res.text();
    return {
      ok: false,
      status: "error",
      detail: `Could not send feedback (${res.status}). ${body.slice(0, 180)}`,
    };
  } catch {
    return {
      ok: false,
      status: "error",
      detail: "Network error while sending feedback. Try again later.",
    };
  }
}

export { FEEDBACK_CAMPAIGN_ID, APP_VERSION };
