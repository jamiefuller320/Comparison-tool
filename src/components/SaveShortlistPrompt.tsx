"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/AccountProvider";
import {
  buildShortlistSnapshot,
  isValidEmail,
} from "@/lib/account";

export function SaveShortlistPrompt({
  schools,
  stages,
  sectors,
  postcode,
  includeVisitLog = false,
  variant = "shortlist",
  forceOpen = false,
}: {
  schools: string[];
  stages: string[];
  sectors: string[];
  postcode?: string | null;
  includeVisitLog?: boolean;
  /** shortlist = soft chip CTA; visit-pack = toolbar button */
  variant?: "shortlist" | "visit-pack";
  forceOpen?: boolean;
}) {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");

  const softEligible = account.canSoftPrompt(schools.length);
  const signedIn = Boolean(account.session);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (account.session?.email) setEmail(account.session.email);
  }, [account.session?.email]);

  if (!account.hydrated) return null;
  if (schools.length === 0) return null;
  // Soft shortlist variant stays hidden until engagement threshold (unless signed in — then offer save).
  if (variant === "shortlist" && !signedIn && !softEligible && !open) {
    return null;
  }

  async function saveNow() {
    setBusy(true);
    setMessage(null);
    try {
      if (!account.session) {
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
        if (sign.mode === "magic_link") {
          setTone("ok");
          setMessage(sign.detail);
          return;
        }
      }
      const snapshot = buildShortlistSnapshot({
        schools,
        stages,
        sectors,
        postcode,
        includeVisitLog,
        label: "My shortlist",
      });
      await account.saveShortlist(snapshot);
      setTone("ok");
      setMessage(
        account.backendKind === "local"
          ? "Shortlist saved in this browser under your email."
          : "Shortlist saved to your School Compass account.",
      );
    } catch (err) {
      setTone("err");
      setMessage(err instanceof Error ? err.message : "Could not save shortlist.");
    } finally {
      setBusy(false);
    }
  }

  const triggerLabel = signedIn ? "Save shortlist" : "Save shortlist";

  return (
    <div
      className={
        variant === "visit-pack"
          ? "save-shortlist save-shortlist-visit"
          : "save-shortlist"
      }
      data-tour="save-shortlist"
    >
      <div className="save-shortlist-bar">
        <button
          type="button"
          className={
            variant === "visit-pack" ? "btn btn-ghost" : "save-shortlist-trigger"
          }
          onClick={() => {
            setOpen((v) => !v);
            setMessage(null);
          }}
        >
          {triggerLabel}
        </button>
        {variant === "shortlist" && softEligible && !signedIn ? (
          <button
            type="button"
            className="save-shortlist-dismiss"
            onClick={account.dismissSoftPrompt}
          >
            Not now
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          className="save-shortlist-panel"
          role="dialog"
          aria-label="Save shortlist"
        >
          <p>
            {signedIn ? (
              <>
                Save these {schools.length} settings
                {account.session ? ` for ${account.session.email}` : ""}. Compare
                stays open either way — this is optional.
              </>
            ) : (
              <>
                Optional: keep this shortlist under your email
                {account.backendKind === "supabase"
                  ? " with a magic sign-in link"
                  : " on this device"}
                . You can keep comparing without registering.
              </>
            )}
          </p>
          <p className="footnote" style={{ marginTop: 0 }}>
            {account.capabilityNote}
          </p>
          {!signedIn ? (
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
          ) : null}
          <div className="save-shortlist-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void saveNow()}
            >
              {busy
                ? "Working…"
                : signedIn
                  ? "Save now"
                  : account.backendKind === "supabase"
                    ? "Email me a sign-in link"
                    : "Save with email"}
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
                tone === "ok"
                  ? "save-shortlist-msg ok"
                  : tone === "warn"
                    ? "save-shortlist-msg warn"
                    : "save-shortlist-msg err"
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
