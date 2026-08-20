"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SchoolRecord } from "@/lib/types";
import { EY_PROVIDER_METRICS, isEyProvider } from "@/lib/eyMetrics";
import { fmtNum } from "@/lib/format";
import { SourceStampLine } from "@/components/SourceStampLine";
import {
  CompareSectionEmpty,
  CompareSectionTabs,
} from "@/components/CompareSectionTabs";
import { CompareSectionTable } from "@/components/CompareSectionTable";
import { SchoolColumnHeader } from "@/components/SchoolColumnHeader";
import { ReportProblemButton } from "@/components/ReportProblemButton";
import { DataGapFlags } from "@/components/DataGapFlags";
import type { SourceStamp } from "@/lib/sourceStamp";
import { schoolDeepLink } from "@/lib/sourceStamp";
import {
  boardGaps,
  gapsForEyOfstedBoard,
  schoolGaps,
} from "@/lib/dataGaps";
import { CoverageStrip } from "@/components/CoverageStrip";
import { InspectionPrecisRows } from "@/components/InspectionPrecis";
import { QualitativeEvidenceRows } from "@/components/QualitativeEvidence";
import { AdmissionsPlacesRows } from "@/components/AdmissionsPlacesRows";
import {
  compareSectionHasData,
  type CompareSectionId,
} from "@/lib/compareSections";

function formatValue(
  value: string | number | null | undefined,
  unit: "text" | "count" | "date",
): string {
  if (value == null || value === "") return "—";
  if (unit === "count") return fmtNum(Number(value), 0);
  return String(value);
}

export function EarlyYearsComparisonBoard({
  providers,
  childcareOfstedAsAt,
  stateOfstedAsAt,
  childcareSourcePage,
  stateSourcePage,
  childcareStamp,
  stateStamp,
  contextSlot,
}: {
  providers: SchoolRecord[];
  childcareOfstedAsAt?: string | null;
  stateOfstedAsAt?: string | null;
  childcareSourcePage?: string | null;
  stateSourcePage?: string | null;
  childcareStamp?: SourceStamp | null;
  stateStamp?: SourceStamp | null;
  contextSlot: ReactNode;
}) {
  const [activeSection, setActiveSection] =
    useState<CompareSectionId>("context");
  const urnKey = providers.map((p) => p.urn).join(",");

  useEffect(() => {
    setActiveSection("context");
  }, [urnKey]);

  if (providers.length === 0) {
    return (
      <CompareSectionTabs
        schools={[]}
        activeId={activeSection}
        onActiveChange={setActiveSection}
        contextSlot={contextSlot}
      >
        {{
          ofsted: (
            <CompareSectionEmpty>
              Add a nursery or school with nursery / reception to compare Ofsted
              grades.
            </CompareSectionEmpty>
          ),
          performance: (
            <CompareSectionEmpty>
              Individual EYFSP scores are not published for providers — use the
              area EYFSP table in Context for local reception context.
            </CompareSectionEmpty>
          ),
        }}
      </CompareSectionTabs>
    );
  }

  const hasChildcare = providers.some(isEyProvider);
  const hasSchool = providers.some((p) => !isEyProvider(p));
  const dataGaps = gapsForEyOfstedBoard(providers, {
    childcareOfstedAsAt,
    stateOfstedAsAt,
  });
  const hasWebsite = compareSectionHasData("website", providers);
  const hasPlaces = compareSectionHasData("places", providers);
  const providerHeaders = providers.map((provider) => (
    <th key={provider.urn} scope="col">
      <SchoolColumnHeader title={provider.name}>
        <span>
          {[provider.town, provider.localAuthority, provider.postcode]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span>
          {provider.providerSubtype ||
            provider.schoolTypeLabel ||
            provider.phase ||
            "Early years"}
          {provider.places != null ? ` · ${provider.places} places` : null}
          {isEyProvider(provider) ? " · day care" : " · school"}
        </span>
        {provider.ofstedReportUrl ? (
          <span>
            <a href={provider.ofstedReportUrl} target="_blank" rel="noreferrer">
              Ofsted report ↗
            </a>
          </span>
        ) : null}
        {(isEyProvider(provider) ? childcareStamp : stateStamp) ? (
          <ReportProblemButton
            compact
            board="early-years-ofsted"
            stamp={{
              ...(isEyProvider(provider) ? childcareStamp! : stateStamp!),
              deepLink:
                schoolDeepLink(provider) ||
                (isEyProvider(provider)
                  ? childcareStamp?.deepLink
                  : stateStamp?.deepLink) ||
                null,
            }}
            urn={provider.urn}
            schoolName={provider.name}
            field="ofstedOverall"
            fieldLabel="Ofsted overall"
            shownValue={provider.ofstedOverall ?? "—"}
          />
        ) : null}
        <DataGapFlags compact gaps={schoolGaps(dataGaps, provider.urn)} />
      </SchoolColumnHeader>
    </th>
  ));

  return (
    <CompareSectionTabs
      schools={providers}
      activeId={activeSection}
      onActiveChange={setActiveSection}
      contextSlot={
        <>
          {contextSlot}
          <p className="footnote">
            Compared on published Ofsted inspection outcomes for early years
            settings in the directory — Early Years Register day care (full and
            sessional) and state-funded schools with a nursery or reception
            intake.
            {hasChildcare && childcareOfstedAsAt
              ? ` Childcare MI as at ${childcareOfstedAsAt}.`
              : null}
            {hasSchool && stateOfstedAsAt
              ? ` State school MI as at ${stateOfstedAsAt}.`
              : null}{" "}
            {hasChildcare && childcareSourcePage ? (
              <a href={childcareSourcePage} target="_blank" rel="noreferrer">
                Ofsted childcare MI ↗
              </a>
            ) : null}
            {hasChildcare && hasSchool && childcareSourcePage && stateSourcePage
              ? " · "
              : null}
            {hasSchool && stateSourcePage ? (
              <a href={stateSourcePage} target="_blank" rel="noreferrer">
                Ofsted school inspections MI ↗
              </a>
            ) : null}
          </p>
          {hasChildcare && childcareStamp ? (
            <SourceStampLine stamp={childcareStamp} />
          ) : null}
          {hasSchool && stateStamp ? <SourceStampLine stamp={stateStamp} /> : null}
          <DataGapFlags gaps={boardGaps(dataGaps)} />
          {childcareStamp || stateStamp ? (
            <div className="board-provenance-actions">
              <ReportProblemButton
                board="early-years-ofsted"
                stamp={(stateStamp || childcareStamp)!}
              />
            </div>
          ) : null}
          <CoverageStrip
            schools={providers}
            board="early-years-ofsted"
            gaps={dataGaps}
          />
        </>
      }
    >
      {{
          ofsted: (
            <CompareSectionTable
              tableId="early-years-ofsted"
              headerCells={providerHeaders}
            >
              <InspectionPrecisRows schools={providers} />
              {EY_PROVIDER_METRICS.map((metric) => (
                <tr key={metric.key}>
                  <th scope="row">
                    {metric.label}
                    <span className="hint">{metric.parentHint}</span>
                  </th>
                  {providers.map((provider) => (
                    <td key={provider.urn} className="metric-cell">
                      {formatValue(metric.get(provider), metric.unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </CompareSectionTable>
          ),
          website: (
            <CompareSectionTable
              tableId="early-years-ofsted"
              headerCells={providerHeaders}
            >
              {hasWebsite ? (
                <QualitativeEvidenceRows schools={providers} />
              ) : (
                <tr>
                  <td colSpan={providers.length + 1}>
                    <CompareSectionEmpty>
                      No website evidence captured for these early-years settings
                      yet.
                    </CompareSectionEmpty>
                  </td>
                </tr>
              )}
            </CompareSectionTable>
          ),
          places: hasPlaces ? (
            <CompareSectionTable
              tableId="early-years-ofsted"
              headerCells={providerHeaders}
            >
              <AdmissionsPlacesRows schools={providers} />
            </CompareSectionTable>
          ) : (
            <CompareSectionEmpty>
              Places and offer-day figures are rarely published for nurseries
              and childminders — school nurseries may show capacity in the
              admissions release.
            </CompareSectionEmpty>
          ),
          performance: (
            <CompareSectionEmpty>
              Individual EYFSP scores are not published for providers — use the
              area EYFSP table above for local reception context. This board
              focuses on inspection grades.
            </CompareSectionEmpty>
          ),
        }}
    </CompareSectionTabs>
  );
}
