"use client";

import { useState } from "react";
import { useAccount } from "@/components/AccountProvider";
import { isValidEmail, requestRestoreShortlist } from "@/lib/account";

/** Header account chip — never a “Register” gate on first visit. */
export function AccountMenu() {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err">("ok");

  if (!account.hydrated) return null;

  const savedCount = account.saved[0]?.schools?.length ?? 0;

  if (!account.session) {
    return (
      <div className="account-menu">
        <button
          type="button"
          className="account-menu-trigger"
          aria-expanded={open}
          onClick={() => {
            setOpen((v) => !v);
            setMessage(null);
          }}
          title="Recall a shortlist saved under your email"
        >
          Recall shortlist
        </button>
        {open ? (
          <div className="account-menu-panel" role="dialog" aria-label="Recall shortlist">
            <p style={{ margin: "0 0 0.65rem" }}>
              Already saved a shortlist? Enter that email
              {account.backendKind === "supabase"
                ? " — we’ll send a magic sign-in link"
                : " to open the shortlist saved in this browser"}
              .
            </p>
            <label className="save-shortlist-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <div className="save-shortlist-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    setMessage(null);
                    try {
                      if (!isValidEmail(email)) {
                        setTone("err");
                        setMessage("Enter a valid email address.");
                        return;
                      }
                      const sign = await account.requestSignIn(email);
                      if (!sign.ok) {
                        setTone("err");
                        setMessage(sign.detail);
                        return;
                      }
                      setTone("ok");
                      setMessage(sign.detail);
                      if (sign.mode === "local") {
                        requestRestoreShortlist();
                        setOpen(false);
                      }
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                {busy
                  ? "Working…"
                  : account.backendKind === "supabase"
                    ? "Email me a sign-in link"
                    : "Open saved shortlist"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            {message ? (
              <p
                className={
                  tone === "ok" ? "save-shortlist-msg ok" : "save-shortlist-msg err"
                }
                role="status"
              >
                {message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="account-menu">
      <button
        type="button"
        className="account-menu-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={account.session.email}
      >
        Saved{savedCount ? ` · ${savedCount}` : ""}
      </button>
      {open ? (
        <div className="account-menu-panel" role="dialog" aria-label="Account">
          <p className="account-menu-email">{account.session.email}</p>
          <p className="footnote" style={{ margin: "0 0 0.65rem" }}>
            {account.backendKind === "local"
              ? "Browser save on this device."
              : "Signed in with magic link."}
            {savedCount ? ` · ${savedCount} schools saved` : ""}
          </p>
          {savedCount > 0 ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginBottom: "0.5rem", width: "100%" }}
              onClick={() => {
                requestRestoreShortlist();
                setOpen(false);
              }}
            >
              Restore shortlist
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void account.signOut().then(() => setOpen(false));
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
