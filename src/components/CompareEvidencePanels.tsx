"use client";

import type { ReactNode } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  InspectionPrecisDetail,
} from "@/components/InspectionPrecis";
import {
  QualitativeEvidenceDetail,
} from "@/components/QualitativeEvidence";
import { SchoolOutboundLinks } from "@/components/SchoolOutboundLinks";
import { PrecisReadingNote } from "@/components/DecisionGuidance";
import {
  schoolHasInspectionPrecis,
} from "@/lib/inspectionHighlights";
import { schoolHasQualitativeCapture } from "@/lib/qualitativeEvidence";
import { CompareSectionEmpty } from "@/components/CompareSectionTabs";

function schoolGrade(school: SchoolRecord): string | null {
  return school.ofstedOverall || school.ofstedIssCompliance || null;
}

function schoolReportHref(school: SchoolRecord): string | null {
  return (
    school.ofstedReportUrl ||
    school.isiLatestReportUrl ||
    school.isiReportsUrl ||
    null
  );
}

function EvidenceSchoolCard({
  school,
  children,
}: {
  school: SchoolRecord;
  children: ReactNode;
}) {
  return (
    <article className="compare-evidence-card">
      <header className="compare-evidence-card-head">
        <h4>{school.name}</h4>
        <p>
          {[school.town, school.localAuthority].filter(Boolean).join(" · ") ||
            "Local listing"}
        </p>
        <SchoolOutboundLinks school={school} includeInspection />
      </header>
      <div className="compare-evidence-card-body">{children}</div>
    </article>
  );
}

/** Full Ofsted / ISI detail for the Ofsted compare tab — always visible. */
export function CompareOfstedPanels({
  schools,
  extraRows,
}: {
  schools: SchoolRecord[];
  /** Optional metric rows (e.g. early-years grades, KS4 inspection metrics). */
  extraRows?: ReactNode;
}) {
  if (!schools.length) {
    return (
      <CompareSectionEmpty>
        Add settings to your shortlist to compare inspection data.
      </CompareSectionEmpty>
    );
  }

  const anyGrade = schools.some((s) => schoolGrade(s) || schoolReportHref(s));
  const anyPrecis = schools.some(schoolHasInspectionPrecis);

  if (!anyGrade && !anyPrecis && !extraRows) {
    return (
      <CompareSectionEmpty>
        No inspection précis or published Ofsted / ISI grades for this shortlist
        yet — open report links from each school page when available.
      </CompareSectionEmpty>
    );
  }

  return (
    <div className="compare-evidence-panels">
      <PrecisReadingNote />
      <div className="compare-evidence-grid">
        {schools.map((school) => {
          const grade = schoolGrade(school);
          const reportHref = schoolReportHref(school);
          const hasPrecis = schoolHasInspectionPrecis(school);
          return (
            <EvidenceSchoolCard key={school.urn} school={school}>
              <div className="compare-evidence-grade">
                <span className="compare-evidence-label">Published overall</span>
                <strong>{grade || "Not published here"}</strong>
                {school.ofstedInspectionDate ? (
                  <span className="compare-cell-meta">
                    Inspected {school.ofstedInspectionDate}
                  </span>
                ) : null}
                {reportHref ? (
                  <a href={reportHref} target="_blank" rel="noreferrer">
                    Open report ↗
                  </a>
                ) : null}
              </div>

              {hasPrecis ? (
                <div className="compare-evidence-block">
                  <span className="compare-evidence-label">Inspection précis</span>
                  <InspectionPrecisDetail school={school} />
                </div>
              ) : (
                <p className="compare-evidence-missing">
                  No report précis captured for this setting yet.
                </p>
              )}
            </EvidenceSchoolCard>
          );
        })}
      </div>
      {extraRows}
    </div>
  );
}

/** Full website evidence for the Website compare tab — always visible. */
export function CompareWebsitePanels({ schools }: { schools: SchoolRecord[] }) {
  if (!schools.length) {
    return (
      <CompareSectionEmpty>
        Add settings to your shortlist to compare website evidence.
      </CompareSectionEmpty>
    );
  }

  const anyCapture = schools.some(schoolHasQualitativeCapture);

  if (!anyCapture) {
    return (
      <div className="compare-evidence-panels">
        <CompareSectionEmpty>
          No website evidence scan for this shortlist yet. Open each school’s
          own site from the links below while scans are still being added.
        </CompareSectionEmpty>
        <div className="compare-evidence-grid">
          {schools.map((school) => (
            <EvidenceSchoolCard key={school.urn} school={school}>
              <p className="compare-evidence-missing">
                Website scan not available for this setting.
              </p>
            </EvidenceSchoolCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="compare-evidence-panels">
      <p className="footnote compare-section-note">
        Paragraph summaries from each setting’s own website and documents —
        expand source lists inside each card. Complements inspection précis, not
        a score.
      </p>
      <div className="compare-evidence-grid">
        {schools.map((school) => {
          const hasCapture = schoolHasQualitativeCapture(school);
          return (
            <EvidenceSchoolCard key={school.urn} school={school}>
              {hasCapture ? (
                <QualitativeEvidenceDetail school={school} />
              ) : (
                <p className="compare-evidence-missing">
                  Website scan not available for this setting yet.
                </p>
              )}
            </EvidenceSchoolCard>
          );
        })}
      </div>
    </div>
  );
}
