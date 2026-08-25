/** Live walkthrough demos — postcode, range, shortlist, compare navigation. */

export const TOUR_DEMO_EVENT = "schoolside:tour-demo";
export const TOUR_DEMO_DONE_EVENT = "schoolside:tour-demo-done";

/** Sample Hampshire postcode used by the guided live demo (Totton). */
export const TOUR_DEMO_POSTCODE = "SO40 3DW";

export type TourDemoId =
  | "fill-postcode"
  | "set-stages-ks2-ks3"
  | "set-radius-5km"
  | "set-radius-8km"
  | "pick-shortlist"
  | "open-path-ks2"
  | "open-path-ks4"
  | "open-section-context"
  | "open-section-ofsted"
  | "open-section-stats"
  | "expand-year-trend";

export type TourDemoRequestDetail = {
  requestId: string;
  demo: TourDemoId;
};

export type TourDemoDoneDetail = {
  requestId: string;
  ok: boolean;
};

export function completeTourDemo(requestId: string, ok: boolean): void {
  window.dispatchEvent(
    new CustomEvent<TourDemoDoneDetail>(TOUR_DEMO_DONE_EVENT, {
      detail: { requestId, ok },
    }),
  );
}

/**
 * Ask the page to run a named live demo, then wait for completion
 * (or timeout). Returns false when no handler responds in time.
 */
export function requestTourDemo(
  demo: TourDemoId,
  timeoutMs = 14000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tour-demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let settled = false;
    function finish(ok: boolean) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener(TOUR_DEMO_DONE_EVENT, onDone);
      resolve(ok);
    }

    function onDone(event: Event) {
      const detail = (event as CustomEvent<TourDemoDoneDetail>).detail;
      if (!detail || detail.requestId !== requestId) return;
      finish(Boolean(detail.ok));
    }

    window.addEventListener(TOUR_DEMO_DONE_EVENT, onDone);

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    // Handlers may complete synchronously during dispatch — timer must exist.
    window.dispatchEvent(
      new CustomEvent<TourDemoRequestDetail>(TOUR_DEMO_EVENT, {
        detail: { requestId, demo },
      }),
    );
  });
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    function tick(left: number) {
      if (left <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => tick(left - 1));
    }
    tick(count);
  });
}

/** Click a compare-section binder tab by visible label (Context / Ofsted / Stats). */
export async function clickCompareSectionTab(
  label: RegExp,
): Promise<boolean> {
  const tab = Array.from(
    document.querySelectorAll(".compare-section-binder [role='tab']"),
  ).find(
    (el) => el instanceof HTMLElement && label.test(el.textContent || ""),
  );
  if (!(tab instanceof HTMLElement)) return false;
  if (tab.getAttribute("aria-selected") !== "true") {
    tab.click();
    await waitFrames(2);
  }
  return true;
}

/** Expand the first Year trend measure on the Stats table when present. */
export async function expandFirstYearTrend(): Promise<HTMLButtonElement | null> {
  await clickCompareSectionTab(/stats/i);
  await waitFrames(2);
  const el = document.querySelector(
    'button.metric-history-trigger[data-tour="year-trend"]',
  );
  if (!(el instanceof HTMLButtonElement)) {
    const fallback = document.querySelector("button.metric-history-trigger");
    if (!(fallback instanceof HTMLButtonElement)) return null;
    if (fallback.getAttribute("aria-expanded") !== "true") fallback.click();
    await waitFrames(2);
    return fallback;
  }
  if (el.getAttribute("aria-expanded") !== "true") el.click();
  await waitFrames(2);
  return el;
}

/** Pure helper: pick up to N KS2-only and N secondary URNs from a nearby list. */
export function pickDemoShortlistUrns<
  T extends { urn: string; ageRange?: string | null },
>(
  schools: T[],
  opts: {
    ks2: number;
    ks3: number;
    alreadySelected?: string[];
    isKs2: (school: T) => boolean;
    isSecondary: (school: T) => boolean;
  },
): string[] {
  const selected = new Set(opts.alreadySelected ?? []);
  const out: string[] = [];

  const ks2Pool = schools.filter(
    (s) => opts.isKs2(s) && !opts.isSecondary(s) && !selected.has(s.urn),
  );
  const ks3Pool = schools.filter(
    (s) => opts.isSecondary(s) && !selected.has(s.urn),
  );

  for (const school of ks2Pool.slice(0, Math.max(0, opts.ks2))) {
    out.push(school.urn);
    selected.add(school.urn);
  }
  for (const school of ks3Pool.slice(0, Math.max(0, opts.ks3))) {
    if (out.length >= 4) break;
    out.push(school.urn);
    selected.add(school.urn);
  }
  return out.slice(0, 4);
}
