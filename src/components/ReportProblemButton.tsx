"use client";

import { useState } from "react";
import type { ChallengeBoardId, SourceStamp } from "@/lib/sourceStamp";
import { formatSourceStamp } from "@/lib/sourceStamp";
import { requestDataChallenge } from "@/lib/dataChallenge";
import { SourceStampLine } from "@/components/SourceStampLine";

export function ReportProblemButton({
  board,
  stamp,
  urn,
  schoolName,
  field,
  fieldLabel,
  shownValue,
  compact = false,
}: {
  board: ChallengeBoardId;
  stamp: SourceStamp;
  urn?: string | null;
  schoolName?: string | null;
  field?: string | null;
  fieldLabel?: string | null;
  shownValue?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "err">("ok");

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestDataChallenge({
        board,
        urn,
        schoolName,
        field,
        fieldLabel,
        shownValue,
        stamp,
        note,
        email: email.trim() || null,
        requestedAt: new Date().toISOString(),
      });
      setTone(result.ok ? "ok" : result.status === "limited" ? "warn" : "err");
      setMessage(result.detail);
      if (result.ok && result.status === "queued") {
        setNote("");
        setEmail("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-problem">
      <button
        type="button"
        className={
          compact
            ? "report-problem-trigger report-problem-trigger-compact"
            : "btn btn-ghost report-problem-trigger"
        }
        onClick={() => {
          setOpen((v) => !v);
          setMessage(null);
        }}
      >
        {compact ? "Report" : "Report a problem"}
      </button>

      {open ? (
        <div
          className="report-problem-panel"
          role="dialog"
          aria-label="Report a data problem"
        >
          <p>
            Tell us if a figure, grade, or analysis looks wrong. Challenges go to
            a private review queue with the source stamp below — not a public
            thread.
          </p>
          <dl className="report-problem-context">
            {schoolName ? (
              <>
                <dt>Setting</dt>
                <dd>
                  {schoolName}
                  {urn ? ` · URN ${urn}` : null}
                </dd>
              </>
            ) : null}
            {fieldLabel || field ? (
              <>
                <dt>Field</dt>
                <dd>{fieldLabel || field}</dd>
              </>
            ) : null}
            {shownValue ? (
              <>
                <dt>Shown value</dt>
                <dd>{shownValue}</dd>
              </>
            ) : null}
            <dt>Source stamp</dt>
            <dd>{formatSourceStamp(stamp)}</dd>
          </dl>
          <SourceStampLine stamp={stamp} />
          <label className="report-problem-field">
            <span>What looks wrong?</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Ofsted grade is out of date; KS2 figure doesn’t match the official tables…"
            />
          </label>
          <label className="report-problem-field">
            <span>Email (optional — for a reply only)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <p className="footnote" style={{ margin: 0 }}>
            Prefer omitting email unless the maintainer has configured a private
            intake repo. Do not include children’s names or other sensitive
            personal data.
          </p>
          <div className="report-problem-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !note.trim()}
              onClick={() => void submit()}
            >
              {busy ? "Sending…" : "Submit challenge"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
          {message ? (
            <p
              className={
                tone === "err"
                  ? "postcode-error"
                  : tone === "warn"
                    ? "missing-school-warn"
                    : "missing-school-ok"
              }
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
