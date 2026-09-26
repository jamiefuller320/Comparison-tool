"use client";

import { useMemo } from "react";
import { ProductFeedbackForm } from "@/components/ProductFeedbackForm";
import {
  captureOriginFeedbackPage,
  normalizeFeedbackPagePath,
  resolveFeedbackPageOption,
} from "@/lib/feedbackSurface";

function queryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name)?.trim() || "";
}

/**
 * /feedback page — same shared form as the sheet/card.
 * Query `?page=` / `?surface=` pre-select the page picker when present
 * (e.g. from the card’s “Open full-page feedback” link).
 */
export function FeedbackPageForm() {
  const defaults = useMemo(() => {
    const pageQ = queryParam("page");
    const surfaceQ = queryParam("surface");
    if (pageQ) {
      const path = normalizeFeedbackPagePath(pageQ);
      const resolved = resolveFeedbackPageOption(path);
      return {
        path,
        surface: surfaceQ || resolved.surface,
      };
    }
    // Landed on /feedback directly — default to this page (or referrer path).
    if (typeof document !== "undefined" && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          const path = normalizeFeedbackPagePath(`${ref.pathname}${ref.hash}`);
          if (path !== "/feedback/" && path !== "/feedback") {
            return {
              path,
              surface: resolveFeedbackPageOption(path).surface,
            };
          }
        }
      } catch {
        /* ignore bad referrer */
      }
    }
    return captureOriginFeedbackPage();
  }, []);

  return (
    <ProductFeedbackForm
      variant="page"
      trigger="page"
      originPath={defaults.path}
      originSurface={defaults.surface}
    />
  );
}
