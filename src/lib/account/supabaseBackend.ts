import type {
  AccountBackend,
  AccountSession,
  SavedShortlist,
  ShortlistSnapshot,
  SignInRequestResult,
} from "@/lib/account/types";
import { normalizeEmail } from "@/lib/account/snapshot";

const SESSION_KEY = "schoolside.account.supabaseSession.v1";

type SupabaseEnv = { url: string; anonKey: string };

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
  expiresAt?: number;
};

export function readSupabaseEnv(): SupabaseEnv | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function siteRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${window.location.origin}${base}/`;
}

function readTokens(): TokenBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenBundle;
    if (!parsed.accessToken || !parsed.userId || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeTokens(tokens: TokenBundle | null): void {
  if (typeof window === "undefined") return;
  if (!tokens) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
}

function sessionFromTokens(tokens: TokenBundle): AccountSession {
  return {
    email: tokens.email,
    userId: tokens.userId,
    backend: "supabase",
    signedInAt: new Date().toISOString(),
  };
}

function parseHashTokens(): { accessToken: string; refreshToken: string } | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

async function fetchUser(
  env: SupabaseEnv,
  accessToken: string,
): Promise<{ id: string; email: string } | null> {
  const res = await fetch(`${env.url}/auth/v1/user`, {
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string; email?: string };
  if (!data.id || !data.email) return null;
  return { id: data.id, email: normalizeEmail(data.email) };
}

/**
 * Supabase magic-link backend for GitHub Pages (static).
 *
 * Required table (SQL in Supabase):
 *   create table public.shortlists (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references auth.users(id) on delete cascade,
 *     payload jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 *   alter table public.shortlists enable row level security;
 *   create policy "own rows" on public.shortlists
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 */
export function createSupabaseAccountBackend(env: SupabaseEnv): AccountBackend {
  return {
    kind: "supabase",
    capabilityNote:
      "Magic-link sign-in. We’ll email a link — no password. Your shortlist syncs to your School Compass account.",
    async getSession() {
      const tokens = readTokens();
      if (!tokens) return null;
      return sessionFromTokens(tokens);
    },
    async requestSignIn(email: string): Promise<SignInRequestResult> {
      const normalized = normalizeEmail(email);
      const redirect = encodeURIComponent(siteRedirectUrl());
      const res = await fetch(`${env.url}/auth/v1/otp?redirect_to=${redirect}`, {
        method: "POST",
        headers: {
          apikey: env.anonKey,
          Authorization: `Bearer ${env.anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalized,
          create_user: true,
          data: { product: "schoolside" },
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false,
          mode: "error",
          detail: text || "Could not send a sign-in link. Try again shortly.",
        };
      }
      return {
        ok: true,
        mode: "magic_link",
        detail:
          "Check your email for a School Compass sign-in link. Compare keeps working while you wait — nothing is locked.",
      };
    },
    async completeRedirectSignIn() {
      const fromHash = parseHashTokens();
      if (!fromHash) return this.getSession();
      const user = await fetchUser(env, fromHash.accessToken);
      if (!user) return null;
      writeTokens({
        accessToken: fromHash.accessToken,
        refreshToken: fromHash.refreshToken,
        email: user.email,
        userId: user.id,
      });
      // Clean tokens out of the address bar.
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, "", url.toString());
      }
      return sessionFromTokens(readTokens()!);
    },
    async signOut() {
      const tokens = readTokens();
      if (tokens) {
        try {
          await fetch(`${env.url}/auth/v1/logout`, {
            method: "POST",
            headers: {
              apikey: env.anonKey,
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });
        } catch {
          /* still clear local */
        }
      }
      writeTokens(null);
    },
    async saveShortlist(snapshot: ShortlistSnapshot) {
      const tokens = readTokens();
      if (!tokens) throw new Error("Sign in to save a shortlist.");
      // Upsert latest shortlist for this user (one active row for soft launch).
      const existing = await this.listShortlists();
      if (existing[0]?.id) {
        const res = await fetch(
          `${env.url}/rest/v1/shortlists?id=eq.${encodeURIComponent(existing[0].id)}`,
          {
            method: "PATCH",
            headers: {
              apikey: env.anonKey,
              Authorization: `Bearer ${tokens.accessToken}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              payload: snapshot,
              updated_at: new Date().toISOString(),
            }),
          },
        );
        if (!res.ok) {
          throw new Error("Could not update your saved shortlist.");
        }
        const rows = (await res.json()) as Array<{ id: string; payload: ShortlistSnapshot }>;
        const row = rows[0];
        return { ...snapshot, id: row?.id || existing[0].id };
      }
      const res = await fetch(`${env.url}/rest/v1/shortlists`, {
        method: "POST",
        headers: {
          apikey: env.anonKey,
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: tokens.userId,
          payload: snapshot,
        }),
      });
      if (!res.ok) {
        throw new Error(
          "Could not save shortlist. Check the Supabase shortlists table and RLS policies.",
        );
      }
      const rows = (await res.json()) as Array<{ id: string; payload: ShortlistSnapshot }>;
      const row = rows[0];
      return { ...snapshot, id: row.id };
    },
    async listShortlists() {
      const tokens = readTokens();
      if (!tokens) return [];
      const res = await fetch(
        `${env.url}/rest/v1/shortlists?select=id,payload,updated_at&order=updated_at.desc&limit=5`,
        {
          headers: {
            apikey: env.anonKey,
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        },
      );
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<{
        id: string;
        payload: ShortlistSnapshot;
      }>;
      return rows.map((row) => ({
        ...row.payload,
        id: row.id,
      }));
    },
  };
}
