/**
 * Supabase REST insert for product_feedback (Pages-safe: anon key only).
 * Mirrors home_learning’s submitLanguageNoteToSupabase pattern.
 */

import { readSupabaseEnv } from "@/lib/account/supabaseBackend";
import type { ProductFeedbackPayload } from "@/lib/productFeedback";

export type SupabaseFeedbackSubmitResult =
  | { ok: true; reason: "ok" }
  | { ok: false; reason: "missing-env" | "http"; detail?: string };

/** Columns the anon INSERT policy allows (triage fields must stay defaults). */
export function feedbackToInsertRow(payload: ProductFeedbackPayload): Record<
  string,
  unknown
> {
  return {
    campaign_id: payload.campaignId,
    app_version: payload.appVersion,
    trigger: payload.trigger,
    sentiment: payload.sentiment,
    topics: payload.topics,
    note: payload.note.slice(0, 4000),
    contact_email: payload.email?.trim() || null,
    adaptive_question: (payload.adaptiveQuestion || "").slice(0, 400),
    page_url: (payload.pageUrl || "").slice(0, 1000),
    surface: (payload.surface || "").slice(0, 120),
    usage: payload.usage,
    status: "open",
    proposed_action: null,
    triage_note: "",
    github_issue_url: null,
  };
}

export async function submitProductFeedbackToSupabase(
  payload: ProductFeedbackPayload,
): Promise<SupabaseFeedbackSubmitResult> {
  const env = readSupabaseEnv();
  if (!env) return { ok: false, reason: "missing-env" };

  try {
    // Prefer return=minimal: anon has INSERT but not SELECT. return=representation
    // triggers RETURNING and fails with 401/42501 even when the row would insert.
    const response = await fetch(`${env.url}/rest/v1/product_feedback`, {
      method: "POST",
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(feedbackToInsertRow(payload)),
    });

    if (response.ok || response.status === 201) {
      return { ok: true, reason: "ok" };
    }

    const text = await response.text().catch(() => "");
    if (typeof console !== "undefined") {
      console.warn(
        "[product-feedback] Supabase insert failed",
        response.status,
        text.slice(0, 180),
      );
    }
    return {
      ok: false,
      reason: "http",
      detail: `Supabase insert failed (${response.status}). ${text.slice(0, 180)}`,
    };
  } catch {
    return {
      ok: false,
      reason: "http",
      detail: "Network error while writing feedback to Supabase.",
    };
  }
}
