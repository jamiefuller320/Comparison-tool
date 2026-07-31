/** Optional parent account — save shortlist after engagement, never a login wall. */

export type AccountBackendKind = "local" | "supabase";

export interface AccountSession {
  email: string;
  /** Stable id for the signed-in principal (local:<email> or Supabase user id). */
  userId: string;
  backend: AccountBackendKind;
  signedInAt: string;
}

export interface ShortlistSnapshot {
  version: 1;
  savedAt: string;
  label?: string;
  schools: string[];
  stages: string[];
  sectors: string[];
  postcode?: string | null;
  /** Optional visit-pack contact log (EY/CM). */
  visitLog?: Record<string, { status: string; note?: string; updatedAt?: string }>;
}

export interface SavedShortlist extends ShortlistSnapshot {
  id: string;
}

export interface SignInRequestResult {
  ok: boolean;
  /** local = signed in immediately in this browser; magic_link = check email */
  mode: "local" | "magic_link" | "error";
  detail: string;
}

export interface AccountBackend {
  kind: AccountBackendKind;
  /** Human-readable capability line for the save panel. */
  capabilityNote: string;
  getSession(): Promise<AccountSession | null>;
  /** Email magic link (supabase) or browser session (local). */
  requestSignIn(email: string): Promise<SignInRequestResult>;
  /** Complete magic-link return from URL hash/query when present. */
  completeRedirectSignIn(): Promise<AccountSession | null>;
  signOut(): Promise<void>;
  saveShortlist(snapshot: ShortlistSnapshot): Promise<SavedShortlist>;
  listShortlists(): Promise<SavedShortlist[]>;
}
