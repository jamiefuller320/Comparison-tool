"use client";

import type { EyfspBenchmarkSet } from "@/lib/types";
import {
  EYFSP_METRICS,
  eyfspEngland,
  eyfspForSeedLa,
  type EyfspMetric,
} from "@/lib/eyfspMetrics";
import { SEED_GEOGRAPHY_LABEL } from "@/lib/seedScope";
import { fmtNum, fmtPct, fmtPp, ppGap } from "@/lib/format";
import { BoardProvenance } from "@/components/BoardProvenance";
import type { SourceStamp } from "@/lib/sourceStamp";
import { gapsForEyfsp } from "@/lib/dataGaps";

function formatValue(
  value: number | null | undefined,
  unit: EyfspMetric["unit"],
): string {
  if (value == null) return "—";
  if (unit === "pct") return fmtPct(value);
  if (unit === "count") return fmtNum(value, 0);
  return fmtNum(value, 1);
}

export function EyfspComparisonBoard({
  eyfsp,
  sourceStamp,
}: {
  eyfsp?: EyfspBenchmarkSet;
  sourceStamp?: SourceStamp | null;
}) {
  const england = eyfspEngland(eyfsp);
  const seed = eyfspForSeedLa(eyfsp);
  const period = eyfsp?.period ?? "latest";
  const dataGaps = gapsForEyfsp(eyfsp);

  if (!england?.gldPercent && !seed?.gldPercent) {
    return (
      <div className="empty-compare" role="status">
        EYFSP area benchmarks are not in this data build yet. Re-run{" "}
        <code>npm run harvest:ey</code>.
      </div>
    );
  }

  return (
    <div>
      <p className="footnote" style={{ marginBottom: "1rem" }}>
        Early Years Foundation Stage Profile figures are for{" "}
        <strong>{SEED_GEOGRAPHY_LABEL}</strong> and <strong>England</strong>{" "}
        only — the DfE does not publish each provider or school&apos;s EYFSP
        results. Use this as area context while you shortlist nurseries and
        reception settings.
        {england?.gldPercent != null
          ? ` England good level of development is ${fmtPct(england.gldPercent)} (${period}).`
          : null}{" "}
        {eyfsp?.sourceUrl ? (
          <a href={eyfsp.sourceUrl} target="_blank" rel="noreferrer">
            EYFSP publication ↗
          </a>
        ) : null}
      </p>
      {sourceStamp ? (
        <BoardProvenance stamp={sourceStamp} board="eyfsp" gaps={dataGaps} />
      ) : null}

      <div className="compare-board">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">{SEED_GEOGRAPHY_LABEL}</th>
              <th scope="col">England</th>
            </tr>
          </thead>
          <tbody>
            {EYFSP_METRICS.map((metric) => {
              const seedValue = metric.get(seed);
              const engValue = metric.get(england);
              const gap =
                metric.unit === "pct"
                  ? ppGap(
                      typeof seedValue === "number" ? seedValue : null,
                      typeof engValue === "number" ? engValue : null,
                    )
                  : null;
              return (
                <tr key={metric.key}>
                  <th scope="row">
                    {metric.label}
                    <span className="hint">{metric.parentHint}</span>
                  </th>
                  <td className="metric-cell">
                    {formatValue(seedValue, metric.unit)}
                    {gap != null ? (
                      <span
                        className={
                          gap > 1
                            ? "vs vs-up"
                            : gap < -1
                              ? "vs vs-down"
                              : "vs vs-flat"
                        }
                      >
                        {fmtPp(gap)} vs England
                      </span>
                    ) : null}
                  </td>
                  <td className="metric-cell">
                    {formatValue(engValue, metric.unit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {eyfsp?.note ? (
        <p className="footnote" style={{ marginTop: "1rem" }}>
          {eyfsp.note}
        </p>
      ) : null}
    </div>
  );
}
