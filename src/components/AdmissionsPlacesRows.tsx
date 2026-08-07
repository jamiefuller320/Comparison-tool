"use client";

import { type ReactNode } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  demandPressureHint,
  fillPressureHint,
  formatDemandRatio,
  schoolHasAdmissionsPlaces,
} from "@/lib/admissionsPlaces";
import { fmtNum, fmtPct } from "@/lib/format";

function Cell({ children }: { children: ReactNode }) {
  return <td className="metric-cell admissions-places-cell">{children}</td>;
}

function AdmissionsPlacesSummary({ school }: { school: SchoolRecord }) {
  if (!schoolHasAdmissionsPlaces(school)) {
    return <span className="hint">No places / offers figures in this release.</span>;
  }
  const bits: string[] = [];
  if (school.placesFillPercent != null) {
    bits.push(`${fmtPct(school.placesFillPercent)} full`);
  }
  if (school.firstPreferenceDemandRatio != null) {
    bits.push(
      `${formatDemandRatio(school.firstPreferenceDemandRatio)} first prefs / place`,
    );
  } else if (school.firstPreferenceApplications != null) {
    bits.push(`${fmtNum(school.firstPreferenceApplications)} first prefs`);
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
  const any = schools.some(schoolHasAdmissionsPlaces);
  if (!any) return null;

  return (
    <>
      <tr className="group-label admissions-places-group-row">
        <td colSpan={schools.length + 1}>
          Places &amp; offer pressure
          <span className="hint">
            Published capacity fill and National Offer Day preference counts —
            context for how contested a school has been, not a chance of getting
            in. Catchment participation rates (&gt;100% = more on roll than live
            in catchment) are LA place-planning figures and are not published
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
          <Cell key={school.urn}>{fmtNum(school.schoolPlaces)}</Cell>
        ))}
      </tr>
      <tr>
        <th scope="row">
          Pupils on roll
          <span className="hint">Census count paired with the capacity release.</span>
        </th>
        {schools.map((school) => (
          <Cell key={school.urn}>{fmtNum(school.pupilsOnRoll)}</Cell>
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
          <Cell key={school.urn}>{fmtPct(school.placesFillPercent)}</Cell>
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
            {fmtNum(school.firstPreferenceApplications)}
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
            {fmtNum(school.admissionPlacesOffered)}
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
            {formatDemandRatio(school.firstPreferenceDemandRatio)}
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
          <Cell key={school.urn}>{fmtNum(school.offersToOtherLa)}</Cell>
        ))}
      </tr>
    </>
  );
}
