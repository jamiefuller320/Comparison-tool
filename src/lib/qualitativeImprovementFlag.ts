/**
 * Parent thumbs on qualitative / website-evidence summaries.
 *
 * Thumbs-down opens a light reason card, then queues a structured
 * product_feedback row that the quality processor routes into
 * qa:human-flags / gated URN refresh. Thumbs-up is a light positive signal.
 * Anon key only; rate-limited + deduped in the browser.
 */

import { APP_VERSION, FEEDBACK_CAMPAIGN_ID } from "@/lib/buildMeta";
import { utcToday } from "@/lib/data";
import { inferFeedbackSurface } from "@/lib/feedbackSurface";
import {
  getFeedbackUsage,
  type FeedbackUsage,
  type ProductFeedbackPayload,
} from "@/lib/productFeedback";
import { submitProductFeedbackToSupabase } from "@/lib/productFeedbackSupabase";

export const IMPROVEMENT_FLAG_KIND_DOWN = "qualitative-nonsensical" as const;
export const IMPROVEMENT_FLAG_KIND_UP = "qualitative-useful" as const;

export type SummaryVote = "up" | "down";

/** Pre-populated thumbs-down reasons for nonsensical qualitative content. */
export type DownReasonCode =
  | "chrome-nav"
  | "wrong-topic"
  | "outdated"
  | "gibberish-pdf"
  | "missing-point"
  | "other";

export const DOWN_REASON_OPTIONS: {
  id: DownReasonCode;
  label: string;
}[] = [
  { id: "chrome-nav", label: "Looks like website chrome / nav" },
  { id: "wrong-topic", label: "Irrelevant or wrong topic" },
  { id: "outdated", label: "Outdated" },
  { id: "gibberish-pdf", label: "Gibberish / PDF junk" },
  { id: "missing-point", label: "Missing an important point" },
  { id: "other", label: "Other" },
];

export interface QualitativeImprovementFlag {
  kind: typeof IMPROVEMENT_FLAG_KIND_DOWN | typeof IMPROVEMENT_FLAG_KIND_UP;
  vote: SummaryVote;
  urn: string;
  schoolName: string;
  /** Qualitative area key when voting on an area block; null for cell summary. */
  area: string | null;
  snippet: string;
  surface: string;
  /** Present on thumbs-down after the reason card. */
  reasonCode?: DownReasonCode | null;
  reasonLabel?: string | null;
  /** Extra detail; required in UI when reasonCode is other. */
  reasonDetail?: string | null;
}

export type SummaryVoteResult = {
  ok: boolean;
  status: "queued" | "limited" | "duplicate" | "unavailable" | "error";
  detail: string;
};

const DATES_KEY = "schoolside.summaryVoteDates.v1";
const DEDUPE_KEY = "schoolside.summaryVoteDedupe.v1";
/** Cap combined up+down votes per browser day — prevents unbounded queue spam. */
const MAX_VOTES_PER_DAY = 8;
const SNIPPET_CAP = 400;
const DETAIL_CAP = 500;
const DEDUPE_CAP = 40;

function readStringList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((d): d is string => typeof d === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStringList(key: string, values: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

export function summaryVotesSubmittedToday(): number {
  const today = utcToday();
  return readStringList(DATES_KEY).filter((d) => d === today).length;
}

function markVoteSubmittedToday(): void {
  const today = utcToday();
  const next = [
    ...readStringList(DATES_KEY).filter((d) => d === today),
    today,
  ];
  writeStringList(DATES_KEY, next.slice(-MAX_VOTES_PER_DAY));
}

export function voteDedupeKey(flag: {
  urn: string;
  area: string | null;
  vote: SummaryVote;
}): string {
  return `${utcToday()}|${flag.urn}|${flag.area || "summary"}|${flag.vote}`;
}

function alreadyVoted(key: string): boolean {
  return readStringList(DEDUPE_KEY).includes(key);
}

function rememberVote(key: string): void {
  const next = [...readStringList(DEDUPE_KEY).filter((k) => k !== key), key];
  writeStringList(DEDUPE_KEY, next.slice(-DEDUPE_CAP));
}

export function reasonLabelFor(code: DownReasonCode): string {
  return (
    DOWN_REASON_OPTIONS.find((o) => o.id === code)?.label || String(code)
  );
}

export function isImprovementFlag(
  value: unknown,
): value is QualitativeImprovementFlag {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const kind = row.kind;
  const vote = row.vote;
  return (
    (kind === IMPROVEMENT_FLAG_KIND_DOWN || kind === IMPROVEMENT_FLAG_KIND_UP) &&
    (vote === "up" || vote === "down") &&
    typeof row.urn === "string" &&
    row.urn.trim().length > 0
  );
}

/** Pull structured flag from a product_feedback.usage blob. */
export function improvementFlagFromUsage(
  usage: unknown,
): QualitativeImprovementFlag | null {
  if (!usage || typeof usage !== "object") return null;
  const flag = (usage as Record<string, unknown>).improvementFlag;
  return isImprovementFlag(flag) ? flag : null;
}

export function buildSummaryVoteNote(flag: QualitativeImprovementFlag): string {
  const areaBit = flag.area ? ` · area ${flag.area}` : " · cell summary";
  const voteBit =
    flag.vote === "down"
      ? "Parent marked website evidence as nonsensical / wrong"
      : "Parent marked website evidence as useful";
  const reasonBit =
    flag.vote === "down" && flag.reasonCode
      ? `\nReason: ${flag.reasonLabel || reasonLabelFor(flag.reasonCode)} (${flag.reasonCode})`
      : "";
  const detailBit =
    flag.reasonDetail && flag.reasonDetail.trim()
      ? `\nDetail: ${flag.reasonDetail.trim().slice(0, DETAIL_CAP)}`
      : "";
  const snippet = flag.snippet.trim()
    ? `\nSnippet: ${flag.snippet.trim().slice(0, SNIPPET_CAP)}`
    : "";
  return `${voteBit} — URN ${flag.urn}${areaBit}.${reasonBit}${detailBit}${snippet}`;
}

export function buildSummaryVotePayload(
  flag: QualitativeImprovementFlag,
  usage?: FeedbackUsage,
): ProductFeedbackPayload {
  const base = usage || getFeedbackUsage();
  return {
    campaignId: FEEDBACK_CAMPAIGN_ID,
    appVersion: APP_VERSION,
    trigger: "summary-vote",
    sentiment: flag.vote === "up" ? "helpful" : "stuck",
    topics: ["website-scan", "compare"],
    note: buildSummaryVoteNote(flag),
    email: null,
    usage: {
      ...base,
      improvementFlag: flag,
    },
    adaptiveQuestion:
      flag.vote === "down"
        ? "Does this website-evidence summary look wrong or nonsensical?"
        : "Was this website-evidence summary useful?",
    pageUrl: typeof window !== "undefined" ? window.location.href : null,
    surface: flag.surface || "compare",
    requestedAt: new Date().toISOString(),
  };
}

/**
 * Queue a thumbs vote. Does **not** mark the soft-launch feedback campaign
 * as responded — votes are orthogonal to the usage-aware prompt.
 */
export async function submitSummaryVote(input: {
  vote: SummaryVote;
  urn: string;
  schoolName: string;
  area?: string | null;
  snippet?: string | null;
  surface?: string | null;
  reasonCode?: DownReasonCode | null;
  reasonDetail?: string | null;
}): Promise<SummaryVoteResult> {
  const urn = String(input.urn || "").trim();
  if (!urn) {
    return {
      ok: false,
      status: "error",
      detail: "Missing school URN for this summary.",
    };
  }

  if (input.vote === "down") {
    if (!input.reasonCode) {
      return {
        ok: false,
        status: "error",
        detail: "Pick a short reason so we know what to check.",
      };
    }
    if (
      input.reasonCode === "other" &&
      !(input.reasonDetail || "").trim()
    ) {
      return {
        ok: false,
        status: "error",
        detail: "Add a short note when you choose Other.",
      };
    }
  }

  let surface = (input.surface || "").trim();
  if (!surface && typeof window !== "undefined") {
    surface = inferFeedbackSurface(
      window.location.pathname,
      window.location.hash,
    );
  }

  const reasonCode = input.vote === "down" ? input.reasonCode || null : null;
  const flag: QualitativeImprovementFlag = {
    kind:
      input.vote === "down"
        ? IMPROVEMENT_FLAG_KIND_DOWN
        : IMPROVEMENT_FLAG_KIND_UP,
    vote: input.vote,
    urn,
    schoolName: (input.schoolName || "").trim().slice(0, 200),
    area: input.area ? String(input.area).trim().slice(0, 80) : null,
    snippet: (input.snippet || "").trim().slice(0, SNIPPET_CAP),
    surface: surface || "compare",
    reasonCode,
    reasonLabel: reasonCode ? reasonLabelFor(reasonCode) : null,
    reasonDetail: (input.reasonDetail || "").trim().slice(0, DETAIL_CAP) || null,
  };

  const dedupe = voteDedupeKey(flag);
  if (alreadyVoted(dedupe)) {
    return {
      ok: false,
      status: "duplicate",
      detail:
        input.vote === "down"
          ? "You already flagged this summary today — thank you."
          : "You already marked this summary useful today — thank you.",
    };
  }

  if (summaryVotesSubmittedToday() >= MAX_VOTES_PER_DAY) {
    return {
      ok: false,
      status: "limited",
      detail: `This browser already sent ${MAX_VOTES_PER_DAY} summary votes today. Try again tomorrow.`,
    };
  }

  const payload = buildSummaryVotePayload(flag);
  const result = await submitProductFeedbackToSupabase(payload);

  if (result.ok) {
    markVoteSubmittedToday();
    rememberVote(dedupe);
    return {
      ok: true,
      status: "queued",
      detail:
        input.vote === "down"
          ? "Thanks — we’ll check this summary in the quality queue. Nothing changes automatically without a review step for risky fixes."
          : "Thanks — glad that was useful.",
    };
  }

  if (result.reason === "missing-env") {
    // Still count locally so missing env doesn’t invite spam retries.
    markVoteSubmittedToday();
    rememberVote(dedupe);
    return {
      ok: true,
      status: "unavailable",
      detail:
        "Vote intake isn’t configured on this deploy yet (Supabase env). Your click was noted locally only.",
    };
  }

  return {
    ok: false,
    status: "error",
    detail: result.detail || "Could not queue that vote. Try again later.",
  };
}
