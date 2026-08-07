"use client";

import { type ReactNode } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  admissionsSummaryGapLabel,
  capacityBlankLabel,
  demandPressureHint,
  fillPressureHint,
  formatDemandRatio,
  offersBlankLabel,
  schoolHasAdmissionsPlaces,
} from "@/lib/admissionsPlaces";
import { fmtNum, fmtPct } from "@/lib/format";

function Cell({ children }: { children: ReactNode }) {
  return <td className="metric-cell admissions-places-cell">{children}</td>;
}

function GapLabel({
  label,
  title,
}: {
  label: string;
  title?: string;
}) {
  return (
    <span className="admissions-gap-label" title={title || label}>
      {label}
    </span>
  );
}

function valueOrGap(
  value: string,
  gap: string | null,
  emptyToken = "—",
): ReactNode {
  if (value !== emptyToken) return value;
  if (gap) return <GapLabel label={gap} />;
  return emptyToken;
}

function AdmissionsPlacesSummary({ school }: { school: SchoolRecord }) {
  const gap = admissionsSummaryGapLabel(school);
  if (gap) {
    return <GapLabel label={gap} />;
  }
  const bits: string[] = [];
  if (school.placesFillPercent != null) {
    bits.push(`${fmtPct(school.placesFillPercent)} full`);
  } else if (capacityBlankLabel(school)) {
    bits.push(capacityBlankLabel(school)!);
  }
  if (school.firstPreferenceDemandRatio != null) {
    bits.push(
      `${formatDemandRatio(school.firstPreferenceDemandRatio)} first prefs / place`,
    );
  } else if (school.firstPreferenceApplications != null) {
    bits.push(`${fmtNum(school.firstPreferenceApplications)} first prefs`);
  } else if (offersBlankLabel(school)) {
    bits.push(offersBlankLabel(school)!);
  }
  return (
    <div className="admissions-places-summary">
      <strong>{bits.join(" · ") || "Places context"}</strong>
      {fillPressureHint(school.placesFillPercent) ? (
        <span className="hint">{fillPressureHint(school.placesFillPercent)}</span>
      ) : null}
      {demandPressureHint(school.firstPreferenceDemandRatio) ? (
        <span className="hint">
          {demandPressureHint(school.firstPreferenceDemandRatio)}
        </span>
      ) : null}
    </div>
  );
}

export function AdmissionsPlacesRows({
  schools,
}: {
  schools: SchoolRecord[];
}): ReactNode {
  // Show the block when any shortlisted school could have places context,
  // including positive "why blank" labels for independents / juniors / etc.
  const anyRelevant = schools.some(
    (school) =>
      schoolHasAdmissionsPlaces(school) ||
      admissionsSummaryGapLabel(school) != null,
  );
  if (!anyRelevant) return null;

  return (
    <>
      <tr className="group-label admissions-places-group-row">
        <td colSpan={schools.length + 1}>
          Places &amp; offer pressure
          <span className="hint">
            Published capacity fill and National Offer Day preference counts —
            context for how contested a school has been, not a chance of getting
            in. Blank cells say why the figure is missing when we can tell.
            Catchment participation rates (&gt;100% = more on roll than live in
            catchment) are LA place-planning figures and are not published
            school-by-school nationally.
          </span>
        </td>
      </tr>
      <tr>
        <th scope="row">
          Summary
          <span className="hint">Fill and first-preference demand at a glance.</span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            <AdmissionsPlacesSummary school={school} />
          </Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          School places (capacity)
          <span className="hint">
            DfE school capacity survey
            {schools.find((s) => s.placesPeriod)?.placesPeriod
              ? ` · ${schools.find((s) => s.placesPeriod)?.placesPeriod}`
              : ""}
            .
          </span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            {valueOrGap(fmtNum(school.schoolPlaces), capacityBlankLabel(school))}
          </Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          Pupils on roll
          <span className="hint">Census count paired with the capacity release.</span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            {valueOrGap(fmtNum(school.pupilsOnRoll), capacityBlankLabel(school))}
          </Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          Fill vs capacity
          <span className="hint">
            On roll ÷ places. Over 100% means the school was over published
            capacity — not the same as out-of-catchment participation.
          </span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            {valueOrGap(
              fmtPct(school.placesFillPercent),
              capacityBlankLabel(school),
            )}
          </Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          First preference applications
          <span className="hint">
            Times listed as first preference for entry
            {schools.find((s) => s.admissionEntryYear)?.admissionEntryYear
              ? ` year ${schools.find((s) => s.admissionEntryYear)?.admissionEntryYear}`
              : ""}
            .
          </span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            {valueOrGap(
              fmtNum(school.firstPreferenceApplications),
              offersBlankLabel(school),
            )}
          </Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          Places offered (offer day)
          <span className="hint">
            Total places offered for that entry year
            {schools.find((s) => s.admissionsPeriod)?.admissionsPeriod
              ? ` · ${schools.find((s) => s.admissionsPeriod)?.admissionsPeriod}`
              : ""}
            .
          </span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            {valueOrGap(
              fmtNum(school.admissionPlacesOffered),
              offersBlankLabel(school),
            )}
          </Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          First prefs per place offered
          <span className="hint">
            Applications ÷ offers. Above 1.0 suggests more first preferences
            than places that year.
          </span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            {valueOrGap(
              formatDemandRatio(school.firstPreferenceDemandRatio),
              offersBlankLabel(school),
            )}
          </Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          Offers to other-LA applicants
          <span className="hint">
            Cross-border offers only — a weak proxy for out-of-area intake, not
            catchment participation.
          </span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>
            {valueOrGap(fmtNum(school.offersToOtherLa), offersBlankLabel(school))}
          </Cell>
        ))}
      </tr>
    </>
  );
}
