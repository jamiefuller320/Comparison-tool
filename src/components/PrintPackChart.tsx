/** Print-safe SVG bar chart for visit packs (no Recharts / ResponsiveContainer). */

import type { PrintChartSeries } from "@/lib/printPackMetrics";

const SCHOOL_FILLS = ["#0b4f6c", "#c45c26", "#3d7a5c", "#6b5b95"] as const;

export function PrintPackChart({ series }: { series: PrintChartSeries }) {
  const schoolCount = series.schools.length;
  const measureCount = series.measures.length;
  if (!schoolCount || !measureCount) return null;

  const width = 520;
  const rowH = 28;
  const labelW = 110;
  const chartW = width - labelW - 16;
  const height = 28 + measureCount * rowH + 36;
  const maxVal =
    series.unit === "score"
      ? Math.max(
          80,
          ...series.schools.flatMap((s) =>
            s.values.filter((v): v is number => v != null),
          ),
        )
      : 100;

  const barGap = 2;
  const groupPad = 4;
  const usable = rowH - groupPad * 2;
  const barH = Math.max(4, (usable - barGap * (schoolCount - 1)) / schoolCount);

  return (
    <section className="visit-pack-chart">
      <h3 className="compare-subhead">{series.title}</h3>
      <p className="visit-pack-figures-caption">{series.caption}</p>
      <svg
        className="visit-pack-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label={series.title}
      >
        {series.measures.map((measure, mi) => {
          const y0 = 24 + mi * rowH;
          return (
            <g key={measure}>
              <text
                x={0}
                y={y0 + rowH / 2}
                dominantBaseline="middle"
                className="visit-pack-chart-label"
              >
                {measure}
              </text>
              {series.schools.map((school, si) => {
                const value = school.values[mi];
                const x = labelW;
                const y = y0 + groupPad + si * (barH + barGap);
                if (value == null) {
                  return (
                    <text
                      key={school.urn}
                      x={x + 4}
                      y={y + barH / 2}
                      dominantBaseline="middle"
                      className="visit-pack-chart-missing"
                    >
                      —
                    </text>
                  );
                }
                const w = Math.max(2, (value / maxVal) * chartW);
                return (
                  <g key={school.urn}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={barH}
                      fill={SCHOOL_FILLS[si % SCHOOL_FILLS.length]}
                      rx={2}
                    />
                    <text
                      x={x + w + 4}
                      y={y + barH / 2}
                      dominantBaseline="middle"
                      className="visit-pack-chart-value"
                    >
                      {series.unit === "pct"
                        ? `${Math.round(value)}%`
                        : value.toFixed(1)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <ul className="visit-pack-chart-legend">
        {series.schools.map((school, si) => (
          <li key={school.urn}>
            <span
              className="visit-pack-chart-swatch"
              style={{ background: SCHOOL_FILLS[si % SCHOOL_FILLS.length] }}
              aria-hidden
            />
            {school.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
