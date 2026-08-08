"use client";

import { type ReactNode } from "react";
import type { SchoolRecord } from "@/lib/types";
import {
  admissionsSummaryGapLabel,
  capacityBlankLabel,
  capacityMissingMeta,
  classifyCapacityMissing,
  classifyOffersMissing,
  demandPressureHint,
  fillPressureHint,
  formatDemandRatio,
  offersBlankLabel,
  offersMissingMeta,
  schoolHasAdmissionsPlaces,
} from "@/lib/admissionsPlaces";
import { fmtNum, fmtPct } from "@/lib/format";

function Cell({ children }: { children: ReactNode }) {
  return <td className="metric-cell admissions-places-cell">{children}</td>;
}

function GapLabel({
  label,
  detail,
  stacked = false,
}: {
  label: string;
  detail?: string;
  /** Sit on its own line under metrics, with quieter type. */
  stacked?: boolean;
}) {
  return (
    <span
      className={
        stacked
          ? "admissions-gap-label admissions-gap-label-stacked"
          : "admissions-gap-label"
      }
      title={detail || label}
    >
      {label}
    </span>
  );
}

function valueOrGap(
  value: string,
  gap: string | null,
  emptyToken = "—",
  detail?: string | null,
): ReactNode {
  if (value !== emptyToken) return value;
  if (gap) return <GapLabel label={gap} detail={detail || undefined} />;
  return emptyToken;
}

function offersGapDetail(school: SchoolRecord): string | undefined {
  const reason = classifyOffersMissing(school);
  return reason ? offersMissingMeta(reason).detail : undefined;
}

function capacityGapDetail(school: SchoolRecord): string | undefined {
  const reason = classifyCapacityMissing(school);
  return reason ? capacityMissingMeta(reason).detail : undefined;
}

function AdmissionsPlacesSummary({ school }: { school: SchoolRecord }) {
  const gap = admissionsSummaryGapLabel(school);
  if (gap) {
    const offersReason = classifyOffersMissing(school);
    const capReason = classifyCapacityMissing(school);
    const detail =
      (offersReason === "junior-transfer" || !capReason) && offersReason
        ? offersMissingMeta(offersReason).detail
        : capReason
          ? capacityMissingMeta(capReason).detail
          : undefined;
    return <GapLabel label={gap} detail={detail} />;
  }

  const metrics: string[] = [];
  if (school.placesFillPercent != null) {
    metrics.push(`${fmtPct(school.placesFillPercent)} full`);
  } else if (capacityBlankLabel(school)) {
    metrics.push(capacityBlankLabel(school)!);
  }

  let offersGap: string | null = null;
  if (school.firstPreferenceDemandRatio != null) {
    metrics.push(
      `${formatDemandRatio(school.firstPreferenceDemandRatio)} first prefs / place`,
    );
  } else if (school.firstPreferenceApplications != null) {
    metrics.push(`${fmtNum(school.firstPreferenceApplications)} first prefs`);
  } else {
    offersGap = offersBlankLabel(school);
  }

  return (
    <div className="admissions-places-summary">
      {metrics.length ? (
        <strong className="admissions-places-metrics">
          {metrics.join(" · ")}
        </strong>
      ) : null}
      {offersGap ? (
        <GapLabel
          label={offersGap}
          detail={offersGapDetail(school)}
          stacked={metrics.length > 0}
        />
      ) : null}
      {!metrics.length && !offersGap ? (
        <strong className="admissions-places-metrics">Places context</strong>
      ) : null}
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
            {valueOrGap(
              fmtNum(school.schoolPlaces),
              capacityBlankLabel(school),
              "—",
              capacityGapDetail(school),
            )}
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
            {valueOrGap(
              fmtNum(school.pupilsOnRoll),
              capacityBlankLabel(school),
              "—",
              capacityGapDetail(school),
            )}
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
              "—",
              capacityGapDetail(school),
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
              "—",
              offersGapDetail(school),
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
              "—",
              offersGapDetail(school),
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
              "—",
              offersGapDetail(school),
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
            {valueOrGap(
              fmtNum(school.offersToOtherLa),
              offersBlankLabel(school),
              "—",
              offersGapDetail(school),
            )}
          </Cell>
        ))}
      </tr>
    </>
  );
}
