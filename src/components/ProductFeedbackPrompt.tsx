"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  FEEDBACK_OPEN_EVENT,
  FEEDBACK_PRINTED_EVENT,
  FEEDBACK_SENTIMENT_OPTIONS,
  FEEDBACK_TOPIC_OPTIONS,
  adaptiveFeedbackQuestion,
  bumpEngagedSeconds,
  getFeedbackUsage,
  hasDismissedFeedback,
  hasRespondedFeedback,
  markExitFeedbackPending,
  markFeedbackDismissed,
  markFeedbackPrompted,
  recordFeedbackUsage,
  requestProductFeedback,
  shouldAutoPromptFeedback,
  type FeedbackSentiment,
  type FeedbackTopic,
  type FeedbackTrigger,
  type FeedbackUsage,
} from "@/lib/productFeedback";
import { FEEDBACK_CAMPAIGN_ID } from "@/lib/buildMeta";
import { BRAND_NAME } from "@/lib/brand";

export function ProductFeedbackPrompt({
  shortlistCount = 0,
  hadPostcode = false,
  openedSideBySide = false,
  sawVisitPack = false,
  stages = [],
  sectors = [],
}: {
  shortlistCount?: number;
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
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(null);
  const [topics, setTopics] = useState<FeedbackTopic[]>([]);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");
  const autoOpenedRef = useRef(false);

  // Keep usage snapshot fresh from the live journey.
  useEffect(() => {
    const next = recordFeedbackUsage({
      shortlistCount,
      hadPostcode,
      openedSideBySide,
      sawVisitPack,
      stages,
      sectors,
    });
    setUsage(next);
  }, [
    shortlistCount,
    hadPostcode,
    openedSideBySide,
    sawVisitPack,
    stages,
    sectors,
  ]);

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

  // Exit / tab-hide → ask on return if they were engaged.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        markExitFeedbackPending();
      } else if (!autoOpenedRef.current) {
        const decision = shouldAutoPromptFeedback(getFeedbackUsage());
        if (decision.open) {
          autoOpenedRef.current = true;
          markFeedbackPrompted();
          setTrigger(decision.trigger);
          setOpen(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Engaged / after-print auto prompt.
  useEffect(() => {
    if (autoOpenedRef.current || open) return;
    if (hasRespondedFeedback() || hasDismissedFeedback()) return;
    const decision = shouldAutoPromptFeedback(usage);
    if (!decision.open) return;
    autoOpenedRef.current = true;
    markFeedbackPrompted();
    setTrigger(decision.trigger);
    setOpen(true);
  }, [usage, open]);

  // Manual open + print signal from elsewhere.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ trigger?: FeedbackTrigger }>).detail;
      setTrigger(detail?.trigger || "manual");
      setMessage(null);
      setOpen(true);
      markFeedbackPrompted();
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

  const question = useMemo(() => adaptiveFeedbackQuestion(usage), [usage]);

  function toggleTopic(id: FeedbackTopic) {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function closeQuietly() {
    markFeedbackDismissed();
    setOpen(false);
  }

  async function submit() {
    if (!sentiment) {
      setTone("err");
      setMessage("Choose how it felt so far — one tap is enough.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestProductFeedback({
        trigger,
        sentiment,
        topics,
        note,
        email: email.trim() || null,
        adaptiveQuestion: question,
        usage: getFeedbackUsage(),
      });
      setTone(result.ok ? "ok" : "err");
      setMessage(result.detail);
      if (result.ok) {
        setNote("");
        setTopics([]);
        window.setTimeout(() => setOpen(false), 1400);
      }
    } finally {
      setBusy(false);
    }
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
        <p className="product-feedback-kicker">
          {BRAND_NAME} · under development · {FEEDBACK_CAMPAIGN_ID}
        </p>
        <h3 id={titleId}>A quick sense-check?</h3>
        <p>
          This site is still being built. Your answer feeds a private,
          structured queue we collate into the next improvement cycle — not a
          public comments board.
        </p>
        <p className="product-feedback-adaptive">{question}</p>

        <fieldset className="product-feedback-sentiments">
          <legend className="visually-hidden">How it felt</legend>
          {FEEDBACK_SENTIMENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={
                sentiment === opt.id
                  ? "product-feedback-chip on"
                  : "product-feedback-chip"
              }
              aria-pressed={sentiment === opt.id}
              onClick={() => setSentiment(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </fieldset>

        <fieldset className="product-feedback-topics">
          <legend>What should we look at? (optional)</legend>
          <div className="product-feedback-topic-row">
            {FEEDBACK_TOPIC_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={
                  topics.includes(opt.id)
                    ? "product-feedback-chip on"
                    : "product-feedback-chip"
                }
                aria-pressed={topics.includes(opt.id)}
                onClick={() => toggleTopic(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="product-feedback-field">
          <span>Anything specific? (optional)</span>
          <textarea
            rows={3}
            value={note}
            maxLength={2000}
            placeholder="One concrete moment — stuck, missing, or surprisingly useful…"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <label className="product-feedback-field">
          <span>Email if we may follow up (optional)</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            maxLength={200}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <p className="product-feedback-usage footnote">
          Context we attach automatically: shortlist {usage.shortlistCountMax}
          {usage.hadPostcode ? " · postcode used" : ""}
          {usage.openedSideBySide ? " · compared" : ""}
          {usage.printedVisitPack
            ? " · printed pack"
            : usage.sawVisitPack
              ? " · saw visit pack"
              : ""}
          {usage.engagedSeconds >= 30
            ? ` · ~${Math.round(usage.engagedSeconds / 60) || 1} min on page`
            : ""}
          .
        </p>

        {message ? (
          <p className={`product-feedback-msg ${tone}`} role="status">
            {message}
          </p>
        ) : null}

        <div className="product-feedback-actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Sending…" : "Send feedback"}
          </button>
          <button
            type="button"
            className="btn btn-ghost product-feedback-skip"
            disabled={busy}
            onClick={closeQuietly}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
