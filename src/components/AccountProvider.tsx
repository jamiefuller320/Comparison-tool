"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACCOUNT_PROMPT_MIN_SCHOOLS,
  dismissAccountPrompt,
  getAccountBackend,
  isAccountPromptDismissed,
  isValidEmail,
  type AccountBackendKind,
  type AccountSession,
  type SavedShortlist,
  type ShortlistSnapshot,
} from "@/lib/account";

type AccountContextValue = {
  hydrated: boolean;
  backendKind: AccountBackendKind;
  capabilityNote: string;
  session: AccountSession | null;
  saved: SavedShortlist[];
  /** Soft prompt may show when shortlist is engaged and not dismissed. */
  canSoftPrompt: (schoolCount: number) => boolean;
  dismissSoftPrompt: () => void;
  requestSignIn: (email: string) => Promise<{ ok: boolean; detail: string; mode: string }>;
  signOut: () => Promise<void>;
  saveShortlist: (snapshot: ShortlistSnapshot) => Promise<SavedShortlist>;
  refreshSaved: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => getAccountBackend(), []);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<AccountSession | null>(null);
  const [saved, setSaved] = useState<SavedShortlist[]>([]);
  const [promptDismissed, setPromptDismissed] = useState(false);

  const refreshSaved = useCallback(async () => {
    const list = await backend.listShortlists();
    setSaved(list);
  }, [backend]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromRedirect = await backend.completeRedirectSignIn();
      const current = fromRedirect || (await backend.getSession());
      if (cancelled) return;
      setSession(current);
      setPromptDismissed(isAccountPromptDismissed());
      if (current) {
        const list = await backend.listShortlists();
        if (cancelled) return;
        setSaved(list);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [backend]);

  const requestSignIn = useCallback(
    async (email: string) => {
      if (!isValidEmail(email)) {
        return {
          ok: false,
          mode: "error",
          detail: "Enter a valid email address.",
        };
      }
      const result = await backend.requestSignIn(email);
      if (result.ok && result.mode === "local") {
        const next = await backend.getSession();
        setSession(next);
        await refreshSaved();
      }
      return result;
    },
    [backend, refreshSaved],
  );

  const signOut = useCallback(async () => {
    await backend.signOut();
    setSession(null);
    setSaved([]);
  }, [backend]);

  const saveShortlist = useCallback(
    async (snapshot: ShortlistSnapshot) => {
      const savedRow = await backend.saveShortlist(snapshot);
      await refreshSaved();
      return savedRow;
    },
    [backend, refreshSaved],
  );

  const canSoftPrompt = useCallback(
    (schoolCount: number) => {
      if (!hydrated) return false;
      if (session) return false;
      if (promptDismissed) return false;
      return schoolCount >= ACCOUNT_PROMPT_MIN_SCHOOLS;
    },
    [hydrated, session, promptDismissed],
  );

  const dismissSoftPrompt = useCallback(() => {
    dismissAccountPrompt();
    setPromptDismissed(true);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      backendKind: backend.kind,
      capabilityNote: backend.capabilityNote,
      session,
      saved,
      canSoftPrompt,
      dismissSoftPrompt,
      requestSignIn,
      signOut,
      saveShortlist,
      refreshSaved,
    }),
    [
      hydrated,
      backend.kind,
      backend.capabilityNote,
      session,
      saved,
      canSoftPrompt,
      dismissSoftPrompt,
      requestSignIn,
      signOut,
      saveShortlist,
      refreshSaved,
    ],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return ctx;
}
