"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FEEDBACK_OPEN_EVENT,
  FEEDBACK_PRINTED_EVENT,
  bumpEngagedSeconds,
  getFeedbackUsage,
  hasDismissedFeedback,
  hasRespondedFeedback,
  markExitFeedbackPending,
  markFeedbackDismissed,
  markFeedbackPrompted,
  recordFeedbackUsage,
  shouldAutoPromptFeedback,
  type FeedbackTrigger,
  type FeedbackUsage,
} from "@/lib/productFeedback";
import { captureOriginFeedbackPage, feedbackPageHref } from "@/lib/feedbackSurface";
import { ProductFeedbackForm } from "@/components/ProductFeedbackForm";
import { FEEDBACK_CAMPAIGN_ID } from "@/lib/buildMeta";
import { BRAND_NAME } from "@/lib/brand";

export function ProductFeedbackPrompt({
  shortlistCount = 0,
  shortlistLas = [],
  hadPostcode = false,
  openedSideBySide = false,
  sawVisitPack = false,
  stages = [],
  sectors = [],
}: {
  shortlistCount?: number;
  /** Distinct DfE LA labels from the live shortlist (voluntary intake signal). */
  shortlistLas?: string[];
  hadPostcode?: boolean;
  openedSideBySide?: boolean;
  sawVisitPack?: boolean;
  stages?: string[];
  sectors?: string[];
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<FeedbackTrigger>("manual");
  const [usage, setUsage] = useState<FeedbackUsage>(() => getFeedbackUsage());
  const [originPath, setOriginPath] = useState("/");
  const [originSurface, setOriginSurface] = useState("home");
  const autoOpenedRef = useRef(false);
  const mountedAtRef = useRef(
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );
  const [pageLoadSeconds, setPageLoadSeconds] = useState(0);

  function openWithOrigin(nextTrigger: FeedbackTrigger) {
    const origin = captureOriginFeedbackPage();
    setOriginPath(origin.path);
    setOriginSurface(origin.surface);
    setTrigger(nextTrigger);
    setOpen(true);
    markFeedbackPrompted();
  }

  // Keep usage snapshot fresh from the live journey.
  useEffect(() => {
    const next = recordFeedbackUsage({
      shortlistCount,
      shortlistLas,
      hadPostcode,
      openedSideBySide,
      sawVisitPack,
      stages,
      sectors,
    });
    setUsage(next);
  }, [
    shortlistCount,
    shortlistLas,
    hadPostcode,
    openedSideBySide,
    sawVisitPack,
    stages,
    sectors,
  ]);

  // Page-load clock — auto-prompt waits for grace even if past visits qualify.
  useEffect(() => {
    const tick = window.setInterval(() => {
      const elapsed =
        ((typeof performance !== "undefined" ? performance.now() : Date.now()) -
          mountedAtRef.current) /
        1000;
      setPageLoadSeconds(elapsed);
    }, 5000);
    return () => window.clearInterval(tick);
  }, []);

  // Accumulate engaged time while the tab is visible.
  useEffect(() => {
    let tick: number | null = null;
    const pulse = () => {
      if (document.visibilityState !== "visible") return;
      const next = bumpEngagedSeconds(5);
      setUsage(next);
    };
    tick = window.setInterval(pulse, 5000);
    return () => {
      if (tick != null) window.clearInterval(tick);
    };
  }, []);

  // Exit / tab-hide → ask on return if they were engaged (after grace).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        markExitFeedbackPending();
      } else if (!autoOpenedRef.current) {
        const elapsed =
          ((typeof performance !== "undefined"
            ? performance.now()
            : Date.now()) -
            mountedAtRef.current) /
          1000;
        const decision = shouldAutoPromptFeedback(getFeedbackUsage(), {
          pageLoadSeconds: elapsed,
        });
        if (decision.open) {
          autoOpenedRef.current = true;
          openWithOrigin(decision.trigger);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Engaged / after-print auto prompt (delayed).
  useEffect(() => {
    if (autoOpenedRef.current || open) return;
    if (hasRespondedFeedback() || hasDismissedFeedback()) return;
    const decision = shouldAutoPromptFeedback(usage, { pageLoadSeconds });
    if (!decision.open) return;
    autoOpenedRef.current = true;
    openWithOrigin(decision.trigger);
  }, [usage, open, pageLoadSeconds]);

  // Manual open + print signal from elsewhere.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ trigger?: FeedbackTrigger }>).detail;
      openWithOrigin(detail?.trigger || "manual");
    };
    const onPrinted = () => {
      const next = recordFeedbackUsage({ printedVisitPack: true });
      setUsage(next);
    };
    window.addEventListener(FEEDBACK_OPEN_EVENT, onOpen);
    window.addEventListener(FEEDBACK_PRINTED_EVENT, onPrinted);
    return () => {
      window.removeEventListener(FEEDBACK_OPEN_EVENT, onOpen);
      window.removeEventListener(FEEDBACK_PRINTED_EVENT, onPrinted);
    };
  }, []);

  function closeQuietly() {
    markFeedbackDismissed();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="product-feedback-root" role="presentation">
      <button
        type="button"
        className="product-feedback-backdrop"
        aria-label="Dismiss feedback"
        onClick={closeQuietly}
      />
      <div
        className="product-feedback-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p className="product-feedback-fullpage">
          <a
            href={feedbackPageHref({
              surface: originSurface,
              page: originPath,
            })}
            className="product-feedback-fullpage-link"
          >
            Open full-page feedback
          </a>
        </p>
        <p className="product-feedback-kicker">
          {BRAND_NAME} · under development · {FEEDBACK_CAMPAIGN_ID}
        </p>
        <h3 id={titleId}>A quick sense-check?</h3>
        <p>
          This site is still being built. Your answer feeds a private,
          structured queue we collate into the next improvement cycle — not a
          public comments board.
        </p>

        <ProductFeedbackForm
          key={`${originPath}:${trigger}`}
          variant="sheet"
          trigger={trigger}
          originPath={originPath}
          originSurface={originSurface}
          usage={usage}
          onCancel={closeQuietly}
          onSubmitted={() => {
            window.setTimeout(() => setOpen(false), 1400);
          }}
        />
      </div>
    </div>
  );
}
