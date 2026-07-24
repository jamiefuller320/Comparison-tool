/** COVID performance-table gap helpers for year-on-year charts (Bartley pattern). */

export const COVID_GAP_LABEL = "COVID";

export const YEAR_STEP = 1;
export const COVID_GAP_STEP = YEAR_STEP / 2;

export const COVID_GAP_NOTE =
  "Hatched band = COVID gap (2019/20–2021/22 unpublished in KS2 tables).";

export type CovidGapPoint = {
  year: string;
  gap: true;
};

export type ScaledChartPoint<T> = T & {
  x: number;
  year: string;
  gap?: boolean;
};

export function hasYearSkip(
  currentYearLabel: string,
  nextYearLabel: string,
): boolean {
  const a = parseInt(String(currentYearLabel).split("/")[0], 10);
  const b = parseInt(String(nextYearLabel).split("/")[0], 10);
  return !Number.isNaN(a) && !Number.isNaN(b) && b - a > 1;
}

/**
 * Place published years on a numeric X axis and insert a half-width COVID
 * gap so lines do not falsely connect across the unpublished stretch.
 */
export function withHalfWidthCovidGap<T extends { year: string }>(
  rows: T[],
  makeGap: () => T & CovidGapPoint,
): {
  rows: Array<ScaledChartPoint<T>>;
  gapRange: { x0: number; x1: number } | null;
  tickLabels: Map<number, string>;
} {
  const out: Array<ScaledChartPoint<T>> = [];
  const tickLabels = new Map<number, string>();
  let gapRange: { x0: number; x1: number } | null = null;
  let x = 0;

  for (let i = 0; i < rows.length; i += 1) {
    out.push({ ...rows[i], x, gap: false });
    tickLabels.set(x, rows[i].year);

    if (i >= rows.length - 1) continue;

    if (hasYearSkip(rows[i].year, rows[i + 1].year)) {
      const x0 = x;
      const x1 = x + COVID_GAP_STEP;
      const mid = (x0 + x1) / 2;
      out.push({ ...makeGap(), x: mid, gap: true });
      tickLabels.set(mid, COVID_GAP_LABEL);
      gapRange = { x0, x1 };
      x = x1;
    } else {
      x += YEAR_STEP;
    }
  }

  return { rows: out, gapRange, tickLabels };
}

export function periodShortLabel(period: string): string {
  const [a, b] = period.split("/");
  return b && b.length === 4 ? `${a}/${b.slice(2)}` : period;
}
