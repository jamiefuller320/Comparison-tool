/** Challenge / “report a problem” payload + private intake dispatch. */

import { utcToday } from "@/lib/data";
import { submitOperationalIntake } from "@/lib/operationalIntake";
import type { ChallengeBoardId, SourceStamp } from "@/lib/sourceStamp";
import { formatSourceStamp } from "@/lib/sourceStamp";

export interface DataChallengePayload {
  board: ChallengeBoardId;
  urn?: string | null;
  schoolName?: string | null;
  field?: string | null;
  fieldLabel?: string | null;
  shownValue?: string | null;
  stamp: SourceStamp;
  note: string;
  email?: string | null;
  pageUrl?: string | null;
  requestedAt: string;
}

const LOCAL_KEY = "schoolside.challengeDates";
const MAX_PER_DAY = 5;

function readChallengeDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((d): d is string => typeof d === "string")
      : [];
  } catch {
    return [];
  }
}

export function challengesSubmittedToday(): number {
  const today = utcToday();
  return readChallengeDates().filter((d) => d === today).length;
}

export function markChallengeSubmittedToday(): void {
  if (typeof window === "undefined") return;
  const today = utcToday();
  const next = [...readChallengeDates().filter((d) => d === today), today];
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next.slice(-MAX_PER_DAY)));
}

export function serializeChallengeForIntake(
  payload: DataChallengePayload,
): Record<string, string> {
  return {
    board: payload.board,
    urn: payload.urn ?? "",
    schoolName: payload.schoolName ?? "",
    field: payload.field ?? "",
    fieldLabel: payload.fieldLabel ?? "",
    shownValue: payload.shownValue ?? "",
    stampId: payload.stamp.id,
    stampLabel: payload.stamp.label,
    stampPeriod: payload.stamp.period ?? "",
    stampAsAt: payload.stamp.asAt ?? "",
    stampDataset: payload.stamp.dataset ?? "",
    stampDeepLink: payload.stamp.deepLink ?? "",
    stampSummary: formatSourceStamp(payload.stamp),
    note: payload.note.slice(0, 2000),
    // Email is optional; workflow should keep it out of public issue bodies
    // when the intake repo is public.
    hasEmail: payload.email?.trim() ? "yes" : "no",
    email: (payload.email ?? "").trim().slice(0, 200),
    pageUrl: payload.pageUrl ?? "",
    requestedAt: payload.requestedAt,
  };
}

/**
 * Save a data-quality challenge via the Supabase anon insert on product_feedback.
 * The note is private to maintainers (anon cannot read the table). No GitHub call.
 */
export async function requestDataChallenge(
  payload: DataChallengePayload,
): Promise<{
  ok: boolean;
  status: "queued" | "limited" | "unavailable" | "error";
  detail: string;
}> {
  if (!payload.note.trim()) {
    return {
      ok: false,
      status: "error",
      detail: "Please describe what looks wrong.",
    };
  }

  if (challengesSubmittedToday() >= MAX_PER_DAY) {
    return {
      ok: false,
      status: "limited",
      detail: `This browser already submitted ${MAX_PER_DAY} challenges today. Try again tomorrow.`,
    };
  }

  const clientPayload = serializeChallengeForIntake({
    ...payload,
    note: payload.note.trim(),
    pageUrl:
      payload.pageUrl ||
      (typeof window !== "undefined" ? window.location.href : null),
    requestedAt: payload.requestedAt || new Date().toISOString(),
  });

  const result = await submitOperationalIntake({
    kind: "data-challenge",
    note: clientPayload.note,
    topics: ["data-trust"],
    surface: "report-problem",
    email: payload.email,
    intake: clientPayload,
    adaptiveQuestion: "Does a published figure, grade, or analysis look wrong?",
  });

  if (result.ok) {
    markChallengeSubmittedToday();
    return {
      ok: true,
      status: "queued",
      detail:
        "Thanks — your challenge was saved for private review. We use it to check sources and fix mistakes, not as a public complaints board.",
    };
  }

  if (result.reason === "missing-env") {
    markChallengeSubmittedToday();
    return {
      ok: true,
      status: "unavailable",
      detail:
        "Challenge intake is not configured for this deploy. Your note was not sent.",
    };
  }

  return {
    ok: false,
    status: "error",
    detail: result.detail || "Could not send the challenge. Try again later.",
  };
}
