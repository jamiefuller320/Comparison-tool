"use client";

import Link from "next/link";
import { feedbackPageHref, inferFeedbackSurface } from "@/lib/feedbackSurface";
import { requestOpenFeedback } from "@/lib/productFeedback";

/**
 * Discreet persistent feedback control — footer-style text + small bottom-end
 * link. Avoids a noisy FAB that fights the map/compare UI.
 */
export function FeedbackControl() {
  function openSheet() {
    requestOpenFeedback("manual");
  }

  function pageHref(): string {
    if (typeof window === "undefined") return "/feedback/";
    const surface = inferFeedbackSurface(
      window.location.pathname,
      window.location.hash,
    );
    return feedbackPageHref({
      surface,
      page: window.location.pathname + window.location.hash,
    });
  }

  return (
    <div className="feedback-control no-print" role="complementary" aria-label="Feedback">
      <button
        type="button"
        className="feedback-control-open"
        onClick={openSheet}
      >
        Feedback
      </button>
      <Link
        href="/feedback/"
        className="feedback-control-page"
        onClick={(e) => {
          // Prefer query defaults from the current location when client-side.
          if (typeof window === "undefined") return;
          e.preventDefault();
          window.location.href = pageHref();
        }}
      >
        Full page
      </Link>
    </div>
  );
}
