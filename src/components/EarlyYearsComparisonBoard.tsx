"use client";

import { useEffect, useState } from "react";
import type { SchoolRecord } from "@/lib/types";
import { EY_PROVIDER_METRICS, isEyProvider } from "@/lib/eyMetrics";
import { fmtNum, shortName } from "@/lib/format";
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
}: {
  providers: SchoolRecord[];
  childcareOfstedAsAt?: string | null;
  stateOfstedAsAt?: string | null;
  childcareSourcePage?: string | null;
  stateSourcePage?: string | null;
  childcareStamp?: SourceStamp | null;
  stateStamp?: SourceStamp | null;
}) {
  const [activeSection, setActiveSection] =
    useState<CompareSectionId>("ofsted");
  const urnKey = providers.map((p) => p.urn).join(",");

  useEffect(() => {
    setActiveSection("ofsted");
  }, [urnKey]);

  if (providers.length === 0) {
    return (
      <div className="empty-compare">
        Add a nursery, preschool, or school with nursery / reception to compare
        published Ofsted grades side by side. This is inspection history, not
        each setting’s EYFSP scores (those exist only for areas).
      </div>
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
      <SchoolColumnHeader title={shortName(provider.name, 32)}>
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
    <div>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Compared on published Ofsted inspection outcomes for early years
        settings in the directory — Early Years Register day care (full and
        sessional) and state-funded schools with a nursery or reception intake.
        Grades describe the setting at the last graded inspection. Where Ofsted
        publishes domain judgements or a report without a single overall grade,
        overall shows as ungraded / report-led. They are not the same as
        reception EYFSP attainment (DfE only publishes EYFSP for areas, not
        individual providers or schools).
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
      {(childcareStamp || stateStamp) ? (
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

      <CompareSectionTabs
        schools={providers}
        activeId={activeSection}
        onActiveChange={setActiveSection}
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
          website: hasWebsite ? (
            <CompareSectionTable
              tableId="early-years-ofsted"
              headerCells={providerHeaders}
            >
              <QualitativeEvidenceRows schools={providers} />
            </CompareSectionTable>
          ) : (
            <CompareSectionEmpty>
              No website evidence captured for these early-years settings yet.
            </CompareSectionEmpty>
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
    </div>
  );
}
