"use client";

import type { SchoolRecord } from "@/lib/types";
import { shortName } from "@/lib/format";
import { BoardProvenance } from "@/components/BoardProvenance";
import { DataGapFlags } from "@/components/DataGapFlags";
import { ReportProblemButton } from "@/components/ReportProblemButton";
import type { SourceStamp } from "@/lib/sourceStamp";
import { schoolDeepLink } from "@/lib/sourceStamp";
import { gapsForChildminders, schoolGaps } from "@/lib/dataGaps";
import { InspectionPrecis } from "@/components/InspectionPrecis";

/** Directory-style panel for shortlisted childminders (not Ofsted grade compare). */
export function ChildminderDirectoryBoard({
  providers,
  consentedAsAt,
  ofstedAsAt,
  sourceStamp,
}: {
  providers: SchoolRecord[];
  consentedAsAt?: string | null;
  ofstedAsAt?: string | null;
  sourceStamp?: SourceStamp | null;
}) {
  if (providers.length === 0) return null;
  const dataGaps = gapsForChildminders(providers, {
    consentedAsAt,
    ofstedAsAt,
  });

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h3 className="compare-subhead">Shortlisted childminders</h3>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Registered settings that consented to publish an address — not a
        nursery Ofsted league table. Use the vetting checklist, read each
        Ofsted report, and visit before you decide.
        {consentedAsAt ? ` Register snapshot as at ${consentedAsAt}.` : null}
      </p>
      {sourceStamp ? (
        <BoardProvenance
          stamp={sourceStamp}
          board="childminders"
          gaps={dataGaps}
        />
      ) : (
        <DataGapFlags gaps={dataGaps.filter((g) => g.level === "board")} />
      )}
      <ul className="childminder-directory">
        {providers.map((provider) => (
          <li key={provider.urn}>
            <div className="childminder-directory-head">
              <strong>{shortName(provider.name, 48)}</strong>
              <span>
                {provider.providerSubtype || provider.schoolTypeLabel || "Childminder"}
                {provider.ofstedOverall ? ` · Ofsted ${provider.ofstedOverall}` : null}
              </span>
            </div>
            <p>
              {[provider.address, provider.town, provider.postcode]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="school-meta">
              {[provider.localAuthority, provider.ofstedInspectionDate]
                .filter(Boolean)
                .join(" · ")}
              {provider.ofstedInspectionDate
                ? " (last full inspection date)"
                : null}
            </p>
            {provider.ofstedReportUrl ? (
              <p>
                <a
                  href={provider.ofstedReportUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ofsted report / registration ↗
                </a>
              </p>
            ) : null}
            <InspectionPrecis school={provider} compact />
            {sourceStamp ? (
              <ReportProblemButton
                compact
                board="childminders"
                stamp={{
                  ...sourceStamp,
                  deepLink: schoolDeepLink(provider) || sourceStamp.deepLink,
                }}
                urn={provider.urn}
                schoolName={provider.name}
                field="directory"
                fieldLabel="Directory entry"
                shownValue={
                  [
                    provider.address,
                    provider.town,
                    provider.postcode,
                    provider.ofstedOverall
                      ? `Ofsted ${provider.ofstedOverall}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
            ) : null}
            <DataGapFlags
              compact
              gaps={schoolGaps(dataGaps, provider.urn)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
