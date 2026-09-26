"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  DOWN_REASON_OPTIONS,
  submitSummaryVote,
  type DownReasonCode,
  type SummaryVote,
} from "@/lib/qualitativeImprovementFlag";

function ThumbUpIcon() {
  return (
    <svg
      className="summary-vote-icon"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M2 10.5V21h4.5V10.5H2zm18.5 0h-6.2l.9-4.3c.1-.6 0-1.2-.3-1.7L14 3l-5.4 5.4c-.4.4-.6.9-.6 1.5v9.6c0 1.1.9 2 2 2h7.3c.9 0 1.7-.6 1.9-1.5l1.5-6.5c.3-1.1-.5-2.1-1.6-2.1z"
      />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg
      className="summary-vote-icon"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M22 13.5V3h-4.5v10.5H22zM3.5 13.5h6.2l-.9 4.3c-.1.6 0 1.2.3 1.7L10 21l5.4-5.4c.4-.4.6-.9.6-1.5V4.5c0-1.1-.9-2-2-2H6.7c-.9 0-1.7.6-1.9 1.5L3.3 10.5c-.3 1.1.5 2.1 1.6 2.1z"
      />
    </svg>
  );
}

/**
 * Discreet thumbs up/down under a qualitative summary parents read.
 * Thumbs-down opens a light reason card (not a heavy modal).
 * Always `no-print` — stripped from visit-pack / comparison print CSS + DOM.
 */
export function SummaryUsefulVote({
  urn,
  schoolName,
  area = null,
  snippet,
  surface = "compare",
}: {
  urn: string;
  schoolName: string;
  area?: string | null;
  snippet: string;
  surface?: string;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<SummaryVote | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<DownReasonCode | null>(null);
  const [reasonDetail, setReasonDetail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");

  function dismissReason() {
    setReasonOpen(false);
    setReasonCode(null);
    setReasonDetail("");
  }

  useEffect(() => {
    if (!reasonOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissReason();
      }
    }

    function onPointer(e: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = e.target;
      if (target instanceof Node && !root.contains(target)) {
        dismissReason();
      }
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [reasonOpen]);

  async function sendVote(
    next: SummaryVote,
    opts?: { reasonCode?: DownReasonCode; reasonDetail?: string },
  ) {
    if (busy || chosen) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await submitSummaryVote({
        vote: next,
        urn,
        schoolName,
        area,
        snippet,
        surface,
        reasonCode: opts?.reasonCode ?? null,
        reasonDetail: opts?.reasonDetail ?? null,
      });
      if (result.ok) {
        setChosen(next);
        setReasonOpen(false);
        setTone(result.status === "unavailable" ? "warn" : "ok");
      } else if (result.status === "duplicate" || result.status === "limited") {
        setChosen(next);
        setReasonOpen(false);
        setTone("warn");
      } else {
        setTone("err");
      }
      setMessage(result.detail);
    } finally {
      setBusy(false);
    }
  }

  function onThumbUp() {
    if (busy || chosen) return;
    dismissReason();
    void sendVote("up");
  }

  function onThumbDown() {
    if (busy || chosen) return;
    setMessage(null);
    setReasonOpen(true);
  }

  function onSubmitReason(e: FormEvent) {
    e.preventDefault();
    if (!reasonCode) {
      setTone("err");
      setMessage("Pick a short reason so we know what to check.");
      return;
    }
    if (reasonCode === "other" && !reasonDetail.trim()) {
      setTone("err");
      setMessage("Add a short note when you choose Other.");
      return;
    }
    void sendVote("down", {
      reasonCode,
      reasonDetail: reasonDetail.trim(),
    });
  }

  const otherRequired = reasonCode === "other";

  return (
    <div
      className="summary-vote no-print"
      data-testid="summary-useful-vote"
      ref={rootRef}
    >
      <div
        className="summary-vote-row"
        role="group"
        aria-label="Was this website evidence summary useful?"
      >
        <button
          type="button"
          className={
            chosen === "up"
              ? "summary-vote-btn summary-vote-btn-up on"
              : "summary-vote-btn summary-vote-btn-up"
          }
          aria-label="This summary was useful"
          aria-pressed={chosen === "up"}
          disabled={busy || chosen !== null}
          onClick={onThumbUp}
        >
          <ThumbUpIcon />
        </button>
        <button
          type="button"
          className={
            chosen === "down" || reasonOpen
              ? "summary-vote-btn summary-vote-btn-down on"
              : "summary-vote-btn summary-vote-btn-down"
          }
          aria-label="This summary looks wrong"
          aria-pressed={chosen === "down"}
          aria-expanded={reasonOpen}
          aria-controls={reasonOpen ? panelId : undefined}
          disabled={busy || chosen !== null}
          onClick={onThumbDown}
        >
          <ThumbDownIcon />
        </button>
      </div>

      {reasonOpen ? (
        <form
          id={panelId}
          className="summary-vote-reason no-print"
          role="dialog"
          aria-label="Why does this summary look wrong?"
          onSubmit={onSubmitReason}
        >
          <p className="summary-vote-reason-lead">
            What looks wrong? (queues a private quality check — not a public
            comment)
          </p>
          <fieldset className="summary-vote-reason-options">
            <legend className="visually-hidden">Reason</legend>
            {DOWN_REASON_OPTIONS.map((opt) => (
              <label key={opt.id} className="summary-vote-reason-option">
                <input
                  type="radio"
                  name={`summary-down-reason-${panelId}`}
                  value={opt.id}
                  checked={reasonCode === opt.id}
                  onChange={() => setReasonCode(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="summary-vote-reason-detail">
            <span>
              {otherRequired
                ? "Tell us briefly (required)"
                : "Extra detail (optional)"}
            </span>
            <textarea
              rows={2}
              maxLength={500}
              value={reasonDetail}
              required={otherRequired}
              placeholder={
                otherRequired
                  ? "What should we look at?"
                  : "Anything else that helps…"
              }
              onChange={(e) => setReasonDetail(e.target.value)}
            />
          </label>
          <div className="summary-vote-reason-actions">
            <button
              type="submit"
              className="btn btn-primary summary-vote-reason-submit"
              disabled={busy || !reasonCode}
            >
              {busy ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={dismissReason}
            >
              Not now
            </button>
          </div>
        </form>
      ) : null}

      {message ? (
        <p
          className={
            tone === "err"
              ? "summary-vote-msg err"
              : tone === "warn"
                ? "summary-vote-msg warn"
                : "summary-vote-msg ok"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
