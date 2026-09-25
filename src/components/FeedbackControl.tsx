"use client";

import { requestOpenFeedback } from "@/lib/productFeedback";

/**
 * Discreet persistent feedback control — opens the shared feedback sheet only.
 * Full-page feedback lives as a button at the top of that sheet (and via footer).
 */
export function FeedbackControl() {
  return (
    <div className="feedback-control no-print" role="complementary" aria-label="Feedback">
      <button
        type="button"
        className="feedback-control-open"
        onClick={() => requestOpenFeedback("manual")}
      >
        Feedback
      </button>
    </div>
  );
}
