"use client";

import { useState } from "react";
import { useAccount } from "@/components/AccountProvider";

/** Offer to restore a cloud/browser-saved shortlist when the URL is empty. */
export function RestoreShortlistBanner({
  ready,
  currentCount,
  onRestore,
}: {
  /** True after CompareApp has hydrated from the URL (avoids a restore flash). */
  ready: boolean;
  currentCount: number;
  onRestore: (schools: string[], stages: string[], sectors: string[]) => void;
}) {
  const account = useAccount();
  const [dismissed, setDismissed] = useState(false);
  const pending = account.saved[0] ?? null;

  if (!ready || !account.hydrated || !account.session || !pending) return null;
  if (dismissed || currentCount > 0) return null;
  if (!pending.schools.length) return null;

  return (
    <div className="restore-shortlist" role="status" data-tour="restore-shortlist">
      <p>
        Welcome back{account.session.email ? `, ${account.session.email}` : ""}.
        Restore your saved shortlist ({pending.schools.length} settings)?
      </p>
      <div className="restore-shortlist-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onRestore(
              pending.schools,
              pending.stages?.length ? pending.stages : [],
              pending.sectors?.length ? pending.sectors : [],
            );
            setDismissed(true);
          }}
        >
          Restore shortlist
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDismissed(true)}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
