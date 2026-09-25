"use client";

import { useMemo, useState } from "react";
import {
  FEEDBACK_SENTIMENT_OPTIONS,
  FEEDBACK_TOPIC_OPTIONS,
  adaptiveFeedbackQuestion,
  getFeedbackUsage,
  requestProductFeedback,
  type FeedbackSentiment,
  type FeedbackTopic,
  type FeedbackTrigger,
  type FeedbackUsage,
} from "@/lib/productFeedback";
import {
  captureOriginFeedbackPage,
  feedbackPageSelectOptions,
  feedbackPageUrlForSubmit,
  normalizeFeedbackPagePath,
  resolveFeedbackPageOption,
  type FeedbackSurface,
} from "@/lib/feedbackSurface";
import { BRAND_NAME } from "@/lib/brand";

export type ProductFeedbackFormProps = {
  /** Sheet (card) or dedicated /feedback page — same fields either way. */
  variant: "sheet" | "page";
  trigger: FeedbackTrigger;
  /**
   * Page the feedback button was pressed from (path + hash).
   * Defaults the page picker; user can change it.
   */
  originPath?: string;
  originSurface?: FeedbackSurface | string;
  usage?: FeedbackUsage;
  /** Sheet only — dismiss without sending. */
  onCancel?: () => void;
  /** Called after a successful send (sheet closes after a short delay). */
  onSubmitted?: () => void;
};

/**
 * Shared feedback fields for the sheet/card and `/feedback` page.
 * Keep options, copy, and validation identical across both surfaces.
 */
export function ProductFeedbackForm({
  variant,
  trigger,
  originPath: originPathProp,
  originSurface: originSurfaceProp,
  usage: usageProp,
  onCancel,
  onSubmitted,
}: ProductFeedbackFormProps) {
  const origin = useMemo(() => {
    if (originPathProp) {
      const path = normalizeFeedbackPagePath(originPathProp);
      return {
        path,
        surface:
          (originSurfaceProp as FeedbackSurface | undefined) ||
          resolveFeedbackPageOption(path).surface,
      };
    }
    if (typeof window !== "undefined") {
      return captureOriginFeedbackPage();
    }
    return { path: "/", surface: "home" as FeedbackSurface };
  }, [originPathProp, originSurfaceProp]);

  const usage = usageProp ?? getFeedbackUsage();
  const question = useMemo(() => adaptiveFeedbackQuestion(usage), [usage]);
  const pageOptions = useMemo(
    () => feedbackPageSelectOptions(origin.path),
    [origin.path],
  );

  const [selectedPage, setSelectedPage] = useState(origin.path);
  const [sentiment, setSentiment] = useState<FeedbackSentiment>("freeform");
  const [topics, setTopics] = useState<FeedbackTopic[]>([]);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");

  const selected = resolveFeedbackPageOption(selectedPage, origin.path);

  function toggleTopic(id: FeedbackTopic) {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!note.trim() && topics.length === 0) {
      setTone("err");
      setMessage("Add a short note or pick a topic so we know what to look at.");
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
        pageUrl: feedbackPageUrlForSubmit(selected.path),
        surface: selected.surface,
      });
      setTone(result.ok ? "ok" : "err");
      setMessage(result.detail);
      if (result.ok) {
        setNote("");
        setTopics([]);
        onSubmitted?.();
      }
    } finally {
      setBusy(false);
    }
  }

  const formBody = (
    <>
      <p className="feedback-page-next">
        What happens next: your note joins a private queue. We propose
        implement or ignore for each item, then a human decides — nothing
        changes on {BRAND_NAME} automatically from free text.
      </p>

      <p className="product-feedback-adaptive">{question}</p>

      <label className="product-feedback-field">
        <span>Which page is this about?</span>
        <select
          value={selected.path}
          onChange={(e) => setSelectedPage(e.target.value)}
          aria-label="Which page is this about"
        >
          {pageOptions.map((opt) => (
            <option key={opt.path} value={opt.path}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="product-feedback-sentiments">
        <legend>How it felt</legend>
        <button
          type="button"
          className={
            sentiment === "freeform"
              ? "product-feedback-chip on"
              : "product-feedback-chip"
          }
          aria-pressed={sentiment === "freeform"}
          onClick={() => setSentiment("freeform")}
        >
          Just a note
        </button>
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
        <span>Your suggestion or problem</span>
        <textarea
          rows={variant === "page" ? 5 : 3}
          value={note}
          maxLength={4000}
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
          type={variant === "page" ? "submit" : "button"}
          className="btn"
          disabled={busy}
          onClick={variant === "sheet" ? () => void submit() : undefined}
        >
          {busy ? "Sending…" : "Send feedback"}
        </button>
        {variant === "sheet" && onCancel ? (
          <button
            type="button"
            className="btn btn-ghost product-feedback-skip"
            disabled={busy}
            onClick={onCancel}
          >
            Not now
          </button>
        ) : null}
      </div>
    </>
  );

  if (variant === "page") {
    return (
      <form className="feedback-page-form" onSubmit={(e) => void submit(e)}>
        {formBody}
      </form>
    );
  }

  return <div className="product-feedback-form">{formBody}</div>;
}
