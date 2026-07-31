import type {
  AccountBackend,
  AccountSession,
  SavedShortlist,
  ShortlistSnapshot,
  SignInRequestResult,
} from "@/lib/account/types";
import { normalizeEmail } from "@/lib/account/snapshot";

const SESSION_KEY = "schoolside.account.session.v1";
const SHORTLISTS_KEY = "schoolside.account.shortlists.v1";

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

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

type ShortlistStore = Record<string, SavedShortlist[]>;

export function createLocalAccountBackend(): AccountBackend {
  return {
    kind: "local",
    capabilityNote:
      "Saved in this browser under your email. Add Supabase env vars for magic-link sign-in across devices.",
    async getSession() {
      const session = readJson<AccountSession | null>(SESSION_KEY, null);
      if (!session?.email || !session.userId) return null;
      return { ...session, backend: "local" };
    },
    async requestSignIn(email: string): Promise<SignInRequestResult> {
      const normalized = normalizeEmail(email);
      const session: AccountSession = {
        email: normalized,
        userId: `local:${normalized}`,
        backend: "local",
        signedInAt: new Date().toISOString(),
      };
      writeJson(SESSION_KEY, session);
      return {
        ok: true,
        mode: "local",
        detail:
          "Saved in this browser. Compare still works without an account — this just keeps your shortlist under your email on this device.",
      };
    },
    async completeRedirectSignIn() {
      return this.getSession();
    },
    async signOut() {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(SESSION_KEY);
    },
    async saveShortlist(snapshot: ShortlistSnapshot) {
      const session = await this.getSession();
      if (!session) throw new Error("Sign in to save a shortlist.");
      const store = readJson<ShortlistStore>(SHORTLISTS_KEY, {});
      const list = store[session.userId] ?? [];
      const saved: SavedShortlist = {
        ...snapshot,
        id: `local-${Date.now().toString(36)}`,
      };
      // Keep one active shortlist per browser account for soft launch.
      store[session.userId] = [saved, ...list.filter((s) => s.id !== saved.id)].slice(
        0,
        5,
      );
      writeJson(SHORTLISTS_KEY, store);
      return saved;
    },
    async listShortlists() {
      const session = await this.getSession();
      if (!session) return [];
      const store = readJson<ShortlistStore>(SHORTLISTS_KEY, {});
      return store[session.userId] ?? [];
    },
  };
}
