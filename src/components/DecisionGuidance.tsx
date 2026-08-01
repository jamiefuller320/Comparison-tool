"use client";

import {
  guidanceForPath,
  guidancePrintLines,
  type GuidancePathId,
} from "@/lib/decisionGuidance";

/** Interactive “how to read this” panel for compare boards. */
export function DecisionGuidancePanel({
  path,
  defaultOpen = false,
}: {
  path: GuidancePathId;
  defaultOpen?: boolean;
}) {
  const content = guidanceForPath(path);
  return (
    <details
      className="decision-guidance"
      data-tour="decision-guidance"
      open={defaultOpen || undefined}
    >
      <summary>
        <span className="decision-guidance-summary-title">{content.heading}</span>
        <span className="decision-guidance-summary-hint">
          What this tells you · what it doesn’t · how to decide
        </span>
      </summary>
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
    <section className="decision-guidance-print print-only">
      <h4>{compact.title}</h4>
      <p className="decision-guidance-lead">{full.lead}</p>
      <div className="decision-guidance-print-columns">
        {full.sections
          .filter((s) =>
            ["telling", "limits", "conclude", "use"].includes(s.id),
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
