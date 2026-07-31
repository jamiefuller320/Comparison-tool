"use client";

import { useState } from "react";
import { useAccount } from "@/components/AccountProvider";

/** Header account chip — never a “Register” gate on first visit. */
export function AccountMenu() {
  const account = useAccount();
  const [open, setOpen] = useState(false);

  if (!account.hydrated) return null;

  if (!account.session) {
    return null;
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
        Saved
      </button>
      {open ? (
        <div className="account-menu-panel" role="dialog" aria-label="Account">
          <p className="account-menu-email">{account.session.email}</p>
          <p className="footnote" style={{ margin: "0 0 0.65rem" }}>
            {account.backendKind === "local"
              ? "Browser save on this device."
              : "Signed in with magic link."}
            {account.saved[0]?.schools?.length
              ? ` · ${account.saved[0].schools.length} schools saved`
              : ""}
          </p>
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
