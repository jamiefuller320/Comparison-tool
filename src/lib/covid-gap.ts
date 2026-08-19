/** COVID performance-table gap helpers for year-on-year charts (Bartley pattern). */

export const COVID_GAP_LABEL = "COVID";

export const YEAR_STEP = 1;
export const COVID_GAP_STEP = YEAR_STEP / 2;

/** Short chart footnote when the hatched gap is present. */
export const COVID_GAP_NOTE =
  "Hatched band marks 2019/20–2021/22, when KS2 performance tables were cancelled or unpublished — lines do not connect across that stretch, and those years are not “missing data” for your shortlist.";

/**
 * Board tip above KS2 year trends — fuller layperson context than the chart note.
 */
export const KS2_YEAR_TREND_TIP =
  "Click a measure name (or Year trend) for a year-by-year graph of shortlisted schools and England. A hatched COVID band covers 2019/20–2021/22 when national KS2 tables were not published — gaps there are calendar cancellations, not school failures. Small cohorts bounce year to year; blank cells are usually suppression, a new school, or no Year 6 table — not a join error.";

/** Shared quantitative honesty lines for decision guidance / empty states. */
export const KS2_DATA_CAVEATS = [
  "2019/20–2021/22 KS2 tables were cancelled or unpublished nationally (COVID) — year charts leave a hatched gap and do not invent values.",
  "A blank cell is usually an unpublished or suppressed table (new school, tiny cohort, or statistical disclosure), not proof the school has no Year 6.",
  "Independent prep schools rarely have comparable state KS2 RWM columns here — that is a sector data gap, not a ranking.",
];

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
