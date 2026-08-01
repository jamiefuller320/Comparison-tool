"use client";

import { useId, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  hasSecondaryContext,
  secondaryContextItems,
  shouldSuggestSecondaryContext,
} from "@/lib/coverageStrip";
import type { ChallengeBoardId } from "@/lib/sourceStamp";
import { shortName } from "@/lib/format";
import { resolveSchoolSector } from "@/lib/sectors";

/**
 * Opt-in, visually quarantined directory / ISI / website context.
 * Never writes secondary claims into DfE attainment cells.
 */
export function SecondaryContextPane({
  schools,
  board,
}: {
  schools: SchoolRecord[];
  board: ChallengeBoardId;
}) {
  const toggleId = useId();
  const [enabled, setEnabled] = useState(false);
  const suggest = shouldSuggestSecondaryContext(schools, board);
  const eligible = schools.filter(hasSecondaryContext);

  if (!eligible.length) return null;

  return (
    <div
      className={
        enabled
          ? "secondary-context secondary-context-on"
          : "secondary-context"
      }
    >
      <div className="secondary-context-controls">
        <label htmlFor={toggleId} className="secondary-context-toggle">
          <input
            id={toggleId}
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>
            Show directory &amp; inspection context
            <em> — not DfE table figures</em>
          </span>
        </label>
        {suggest && !enabled ? (
          <p className="secondary-context-hint">
            Some shortlisted schools have thin published outcomes but do have
            ISI/Ofsted links, a website, or a report précis. Turn this on for
            caveated context only.
          </p>
        ) : null}
      </div>

      {enabled ? (
        <div className="secondary-context-panel" role="region" aria-label="Secondary directory context">
          <p className="secondary-context-banner">
            <strong>Caveated context.</strong> Links and verbatim précis below
            come from inspectorate directories, GIAS, or the school’s own site.
            They are <em>not</em> DfE Attainment 8 / RWM / grade cells and must
            not be read as a substitute league figure.
          </p>
          <div className="secondary-context-grid">
            {eligible.map((school) => {
              const items = secondaryContextItems(school);
              const indie = resolveSchoolSector(school) === "independent";
              return (
                <article key={school.urn} className="secondary-context-card">
                  <header>
                    <h4>{shortName(school.name, 36)}</h4>
                    <p>
                      {indie ? "Independent" : "State"}
                      {school.town ? ` · ${school.town}` : ""}
                    </p>
                  </header>
                  {!items.length ? (
                    <p className="footnote">No directory links for this setting.</p>
                  ) : (
                    <ul>
                      {items.map((item) => (
                        <li key={item.id}>
                          <span className="secondary-context-label">
                            {item.label}
                          </span>
                          {item.href ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.text || "Open ↗"}
                            </a>
                          ) : (
                            <span>{item.text}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
