"use client";

import type { SchoolRecord } from "@/lib/types";
import { EY_PROVIDER_METRICS } from "@/lib/eyMetrics";
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
  ofstedAsAt,
  sourcePage,
}: {
  providers: SchoolRecord[];
  ofstedAsAt?: string | null;
  sourcePage?: string | null;
}) {
  if (providers.length === 0) {
    return (
      <div className="empty-compare">
        Add Hampshire early years day-care providers to compare Ofsted
        inspection outcomes side by side.
      </div>
    );
  }

  return (
    <div>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Compared on published Ofsted childcare inspection outcomes for
        Hampshire Early Years Register day-care settings (full and sessional).
        Grades are judgements about the setting at the last full inspection —
        not the same as reception EYFSP attainment (which DfE only publishes for
        areas, not providers).
        {ofstedAsAt ? ` Ofsted management information as at ${ofstedAsAt}.` : null}{" "}
        {sourcePage ? (
          <a href={sourcePage} target="_blank" rel="noreferrer">
            Ofsted childcare MI source ↗
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
                      {provider.providerSubtype || provider.schoolTypeLabel || "Early years"}
                      {provider.places != null ? ` · ${provider.places} places` : null}
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
