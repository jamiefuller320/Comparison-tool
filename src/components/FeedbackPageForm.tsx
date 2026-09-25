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
} from "@/lib/productFeedback";
import { BRAND_NAME } from "@/lib/brand";

function queryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name)?.trim() || "";
}

/**
 * Free-text-first feedback form for /feedback — same queue as the sheet.
 * Not a public wall of other parents’ comments.
 */
export function FeedbackPageForm() {
  const usage = useMemo(() => getFeedbackUsage(), []);
  const question = useMemo(() => adaptiveFeedbackQuestion(usage), [usage]);
  const [sentiment, setSentiment] = useState<FeedbackSentiment | "freeform">(
    "freeform",
  );
  const [topics, setTopics] = useState<FeedbackTopic[]>([]);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err">("ok");

  function toggleTopic(id: FeedbackTopic) {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setTone("err");
      setMessage("Add a short note so we know what to look at.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const surface = queryParam("surface") || "feedback-page";
      const page = queryParam("page");
      const result = await requestProductFeedback({
        trigger: "page",
        sentiment: sentiment === "freeform" ? "freeform" : sentiment,
        topics,
        note,
        email: email.trim() || null,
        adaptiveQuestion: question,
        usage: getFeedbackUsage(),
        pageUrl:
          page ||
          (typeof window !== "undefined" ? window.location.href : null),
        surface,
      });      setTone(result.ok ? "ok" : "err");
      setMessage(result.detail);
      if (result.ok) {
        setNote("");
        setTopics([]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="feedback-page-form" onSubmit={(e) => void submit(e)}>
      <p className="feedback-page-next">
        What happens next: your note joins a private queue. We propose
        implement or ignore for each item, then a human decides — nothing
        changes on {BRAND_NAME} automatically from free text.
      </p>

      <label className="product-feedback-field">
        <span>Your suggestion or problem</span>
        <textarea
          rows={5}
          value={note}
          maxLength={4000}
          required
          placeholder="One concrete moment — stuck, missing, or surprisingly useful…"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <fieldset className="product-feedback-sentiments">
        <legend>How it felt (optional)</legend>
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
        <legend>Topic (optional)</legend>
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

      {message ? (
        <p className={`product-feedback-msg ${tone}`} role="status">
          {message}
        </p>
      ) : null}

      <div className="product-feedback-actions">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  );
}
