/**
 * Browser intake for missing-school, area coverage, and data challenges.
 * Anon INSERT into product_feedback. No GitHub token and no repository_dispatch.
 */

import { APP_VERSION, FEEDBACK_CAMPAIGN_ID } from "@/lib/buildMeta";
import {
  getFeedbackUsage,
  type FeedbackSentiment,
  type FeedbackTopic,
  type FeedbackUsage,
  type ProductFeedbackPayload,
} from "@/lib/productFeedback";
import {
  submitProductFeedbackToSupabase,
  type SupabaseFeedbackSubmitResult,
} from "@/lib/productFeedbackSupabase";

export type OperationalIntakeKind =
  | "missing-school"
  | "area-coverage"
  | "data-challenge";

export async function submitOperationalIntake(input: {
  kind: OperationalIntakeKind;
  note: string;
  topics: FeedbackTopic[];
  surface: string;
  email?: string | null;
  /** Structured fields stored on usage.intake. Do not include an email address. */
  intake: Record<string, string>;
  adaptiveQuestion: string;
  sentiment?: FeedbackSentiment;
}): Promise<SupabaseFeedbackSubmitResult> {
  const note = input.note.trim().slice(0, 4000);
  if (!note) {
    return { ok: false, reason: "http", detail: "Nothing to send." };
  }

  const intake: NonNullable<FeedbackUsage["intake"]> = { kind: input.kind };
  for (const [key, value] of Object.entries(input.intake)) {
    if (key === "email" || key === "kind") continue;
    intake[key] = String(value ?? "").slice(0, 2000);
  }

  const payload: ProductFeedbackPayload = {
    campaignId: FEEDBACK_CAMPAIGN_ID,
    appVersion: APP_VERSION,
    trigger: input.kind,
    sentiment: input.sentiment ?? "freeform",
    topics: input.topics,
    note,
    email: input.email?.trim() || null,
    usage: {
      ...getFeedbackUsage(),
      intake,
    },
    adaptiveQuestion: input.adaptiveQuestion.slice(0, 400),
    pageUrl: typeof window !== "undefined" ? window.location.href : null,
    surface: input.surface.slice(0, 120),
    requestedAt: new Date().toISOString(),
  };

  return submitProductFeedbackToSupabase(payload);
}
