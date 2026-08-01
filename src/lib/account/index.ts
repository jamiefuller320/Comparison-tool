import { createLocalAccountBackend } from "@/lib/account/localBackend";
import {
  createSupabaseAccountBackend,
  readSupabaseEnv,
} from "@/lib/account/supabaseBackend";
import type { AccountBackend } from "@/lib/account/types";

export type {
  AccountBackend,
  AccountBackendKind,
  AccountSession,
  SavedShortlist,
  ShortlistSnapshot,
  SignInRequestResult,
} from "@/lib/account/types";
export {
  buildShortlistSnapshot,
  isValidEmail,
  normalizeEmail,
} from "@/lib/account/snapshot";
export { createLocalAccountBackend } from "@/lib/account/localBackend";
export { readSupabaseEnv } from "@/lib/account/supabaseBackend";

const PROMPT_DISMISS_KEY = "schoolside.account.promptDismissed.v1";

export function getAccountBackend(): AccountBackend {
  const env = readSupabaseEnv();
  if (env) return createSupabaseAccountBackend(env);
  return createLocalAccountBackend();
}

export function isAccountPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PROMPT_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissAccountPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROMPT_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Soft CTA threshold: only after real shortlist engagement. */
export const ACCOUNT_PROMPT_MIN_SCHOOLS = 2;
