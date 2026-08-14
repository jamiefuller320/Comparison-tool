"use client";

import { useEffect, useState } from "react";
import { shareOrCopyComparison } from "@/lib/shareComparison";

type ShareStatus = "idle" | "shared" | "copied" | "failed";

export function ShareShortlistButton({
  schoolNames,
  hash = "side-by-side",
  className = "btn btn-ghost share-shortlist-btn",
  label = "Share",
  idleLabel,
}: {
  schoolNames: string[];
  /** Fragment for the shared URL (without #). */
  hash?: string;
  className?: string;
  label?: string;
  idleLabel?: string;
}) {
  const [status, setStatus] = useState<ShareStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [status]);

  if (schoolNames.length === 0) return null;

  const shown =
    status === "copied"
      ? "Link copied"
      : status === "shared"
        ? "Shared"
        : status === "failed"
          ? "Couldn’t share"
          : (idleLabel ?? label);

  return (
    <button
      type="button"
      className={className}
      data-tour="share-shortlist"
      aria-live="polite"
      onClick={() => {
        void (async () => {
          const result = await shareOrCopyComparison({
            schoolNames,
            hash,
          });
          setStatus(result);
        })();
      }}
    >
      {shown}
    </button>
  );
}
