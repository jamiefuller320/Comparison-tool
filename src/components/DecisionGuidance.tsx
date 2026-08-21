"use client";

import { useEffect, useState } from "react";
import {
  guidanceForPath,
  guidancePrintLines,
  type GuidancePathId,
} from "@/lib/decisionGuidance";
import {
  comparePathLabel,
  type ComparePathId,
} from "@/lib/comparePaths";

/** Interactive “how to read this” panel for compare boards. */
export function DecisionGuidancePanel({
  path,
  paths,
  defaultOpen = false,
}: {
  path: GuidancePathId;
  /** When the shortlist spans multiple stages, offer in-panel stage switching. */
  paths?: ComparePathId[];
  defaultOpen?: boolean;
}) {
  const multi = (paths?.length ?? 0) > 1;
  const [activePath, setActivePath] = useState<GuidancePathId>(path);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setActivePath(path);
  }, [path]);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen, path]);

  const content = guidanceForPath(activePath);

  return (
    <details
      className="decision-guidance"
      data-tour="decision-guidance"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="decision-guidance-summary-title">{content.heading}</span>
        <span className="decision-guidance-summary-hint">
          {multi
            ? "Pick a stage · what this tells you · what it doesn’t · how to decide"
            : "What this tells you · what it doesn’t · how to decide"}
        </span>
      </summary>
      {multi && paths ? (
        <div
          className="decision-guidance-stages"
          role="group"
          aria-label="Guidance stage"
        >
          {paths.map((id) => {
            const selected = activePath === id;
            return (
              <button
                key={id}
                type="button"
                className={
                  selected
                    ? "decision-guidance-stage active"
                    : "decision-guidance-stage"
                }
                aria-pressed={selected}
                onClick={() => setActivePath(id)}
              >
                {comparePathLabel(id)}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="decision-guidance-lead">{content.lead}</p>
      <div className="decision-guidance-grid">
        {content.sections.map((section) => (
          <section key={section.id} className="decision-guidance-block">
            <h4>{section.title}</h4>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

/** Print-visible strip for visit / shortlist packs. */
export function DecisionGuidancePrintBlock({ path }: { path: GuidancePathId }) {
  const full = guidanceForPath(path);
  const compact = guidancePrintLines(path);
  return (
    <section className="decision-guidance-print">
      <h4>{compact.title}</h4>
      <p className="decision-guidance-lead">{full.lead}</p>
      <div className="decision-guidance-print-columns">
        {full.sections
          .filter((s) =>
            ["telling", "caveats", "limits", "conclude", "use"].includes(s.id),
          )
          .map((section) => (
            <div key={section.id}>
              <strong>{section.title}</strong>
              <ul>
                {section.items.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
      </div>
      <p className="decision-guidance-print-foot">
        {compact.lines[compact.lines.length - 1]}
      </p>
    </section>
  );
}

/** Short note above expanded inspection précis detail. */
export function PrecisReadingNote() {
  const precis = guidanceForPath("general").sections.find((s) => s.id === "precis");
  if (!precis) return null;
  return (
    <p className="precis-reading-note">
      <strong>Reading this:</strong> {precis.items[0]} {precis.items[1]}{" "}
      {precis.items[2]}
    </p>
  );
}
