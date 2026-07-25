"use client";

import type { SchoolRecord } from "@/lib/types";
import { EY_PROVIDER_METRICS, isEyProvider } from "@/lib/eyMetrics";
import { fmtNum, shortName } from "@/lib/format";

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
}: {
  providers: SchoolRecord[];
  childcareOfstedAsAt?: string | null;
  stateOfstedAsAt?: string | null;
  childcareSourcePage?: string | null;
  stateSourcePage?: string | null;
}) {
  if (providers.length === 0) {
    return (
      <div className="empty-compare">
        Add Hampshire early years day-care providers or school nursery / infant
        settings to compare Ofsted inspection outcomes side by side.
      </div>
    );
  }

  const hasChildcare = providers.some(isEyProvider);
  const hasSchool = providers.some((p) => !isEyProvider(p));

  return (
    <div>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Compared on published Ofsted inspection outcomes for Hampshire early
        years settings — Early Years Register day care (full and sessional) and
        state-funded schools with a nursery or reception intake. Grades describe
        the setting at the last graded inspection. They are not the same as
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

      <div className="compare-board">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              {providers.map((provider) => (
                <th key={provider.urn} scope="col">
                  {shortName(provider.name, 32)}
                  <div className="school-meta">
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
                      {provider.places != null
                        ? ` · ${provider.places} places`
                        : null}
                      {isEyProvider(provider)
                        ? " · day care"
                        : " · school"}
                    </span>
                    {provider.ofstedReportUrl ? (
                      <span>
                        <a
                          href={provider.ofstedReportUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ofsted report ↗
                        </a>
                      </span>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
