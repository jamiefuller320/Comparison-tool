/** Interactive “How to use” walkthrough — steps, cache, and localStorage helpers. */

export const TOUR_STORAGE_KEY = "schoolside.tourSeen";
export const TOUR_START_EVENT = "schoolside:start-tour";
export const TOUR_PAD = 10;
/** Sticky header clearance when centering a target. */
export const TOUR_HEADER_OFFSET = 72;

export interface TourStep {
  id: string;
  /** Matches `[data-tour="…"]` on the page. */
  target: string;
  title: string;
  body: string;
  /** Skip when the target is missing or not laid out (e.g. nearby before postcode). */
  optional?: boolean;
}

/** Document-space box for a tour target, captured once when the tour starts. */
export interface TourTargetCache {
  target: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export type ViewportRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: "hero",
    title: "Welcome to Schoolside",
    body: "This walkthrough points out the main controls. You can leave anytime with Skip, or restart later from How to use in the header.",
  },
  {
    id: "postcode",
    target: "postcode",
    title: "Start with your home postcode",
    body: "Enter a full UK postcode (spaces or hyphens are fine). Find nearby maps schools around home so you can tick ones worth comparing.",
  },
  {
    id: "stages",
    target: "stages",
    title: "Choose the stages you care about",
    body: "Pick Early years, KS1, KS2, KS3 and/or KS4. Several stages use AND logic — a school must offer every selected stage. Tables follow your choice: KS1 → LA phonics context, KS2 → Year 6, KS3/KS4 → GCSE / 16–18.",
  },
  {
    id: "sector",
    target: "sector",
    title: "State, independent, or both",
    body: "School type filters the list and map. State defaults to KS2 tables; independent defaults to secondary GCSE measures. You can switch anytime.",
  },
  {
    id: "nearby",
    target: "nearby",
    title: "Nearby map and tick list",
    body: "After a postcode lookup, the map shows schools in range and the list adds road distance. Tick a school to add it to your shortlist (up to four).",
    optional: true,
  },
  {
    id: "radius",
    target: "radius",
    title: "Widen or tighten the range ring",
    body: "Use the kilometre chips to grow or shrink the search ring. The map and list update together.",
    optional: true,
  },
  {
    id: "search",
    target: "search",
    title: "Search any English school",
    body: "Below the map you can search by name, town, postcode or URN. Results respect your stage and school-type filters.",
  },
  {
    id: "shortlist",
    target: "shortlist",
    title: "Your shortlist (up to four)",
    body: "Selected schools appear as chips here. Remove one with × if you want to try another. Your shortlist is kept in the page URL so you can share or bookmark it.",
  },
  {
    id: "boards",
    target: "boards",
    title: "Side-by-side comparison",
    body: "Tables appear once schools are on the shortlist. On KS2, click a measure name for a multi-year trend. Gaps versus England (or a sector mean) help you spot patterns — not a final verdict.",
  },
  {
    id: "how",
    target: "how",
    title: "How to read the numbers",
    body: "This section explains expected and higher standards, scaled scores, and what sits outside the data (admissions, ethos, visits). Take a look whenever you need a refresher.",
  },
];

export function hasSeenTour(): boolean {
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    // Private mode / blocked storage — ignore.
  }
}

export function requestTourStart(): void {
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT));
}

export function tourTargetSelector(target: string): string {
  return `[data-tour="${target}"]`;
}

type TourQueryDoc = {
  querySelector: (selectors: string) => Element | null;
};

/** Resolve visible steps, dropping optional targets that are not on screen. */
export function resolveActiveTourSteps(
  steps: TourStep[] = TOUR_STEPS,
  doc: TourQueryDoc = document,
): TourStep[] {
  return steps.filter((step) => {
    const el = doc.querySelector(tourTargetSelector(step.target));
    if (!el) return !step.optional;

    const measure =
      "getBoundingClientRect" in el &&
      typeof (el as HTMLElement).getBoundingClientRect === "function"
        ? (el as HTMLElement).getBoundingClientRect()
        : null;

    // Zero-size optional targets (hidden / not laid out) are skipped.
    if (step.optional) {
      if (!measure) return false;
      return measure.width > 0 && measure.height > 0;
    }
    return true;
  });
}

/**
 * Snapshot each step target’s document-space box once at tour start.
 * Later steps reuse this cache so we avoid re-querying / re-layout thrash.
 */
export function cacheTourTargets(
  steps: TourStep[],
  doc: Document = document,
  scrollX = typeof window !== "undefined" ? window.scrollX : 0,
  scrollY = typeof window !== "undefined" ? window.scrollY : 0,
): Map<string, TourTargetCache> {
  const cache = new Map<string, TourTargetCache>();
  for (const step of steps) {
    const el = doc.querySelector(tourTargetSelector(step.target));
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    cache.set(step.target, {
      target: step.target,
      top: r.top + scrollY,
      left: r.left + scrollX,
      width: r.width,
      height: r.height,
    });
  }
  return cache;
}

/** Convert a cached document box into a padded fixed-viewport spotlight rect. */
export function viewportRectFromCache(
  cached: TourTargetCache,
  scrollX: number,
  scrollY: number,
  viewportWidth: number,
  viewportHeight: number,
  pad = TOUR_PAD,
): ViewportRect {
  return {
    top: Math.max(8, cached.top - scrollY - pad),
    left: Math.max(8, cached.left - scrollX - pad),
    width: Math.min(viewportWidth - 16, cached.width + pad * 2),
    height: Math.min(viewportHeight - 16, cached.height + pad * 2),
  };
}

/** Instant scroll so the cached target sits near the vertical centre. */
export function scrollToCachedTarget(
  cached: TourTargetCache,
  viewportHeight: number,
  headerOffset = TOUR_HEADER_OFFSET,
): number {
  const centerY = cached.top + cached.height / 2;
  const top = Math.max(0, centerY - viewportHeight / 2 - headerOffset / 2);
  window.scrollTo({ top, left: 0, behavior: "auto" });
  return top;
}

export function placeTourCard(
  rect: ViewportRect | null,
  viewportWidth: number,
  viewportHeight: number,
  cardWidth = Math.min(360, viewportWidth - 32),
  cardHeight = 210,
): { top: number; left: number } {
  const narrow = viewportWidth < 720;
  if (narrow) {
    return {
      top: Math.max(16, viewportHeight - cardHeight - 20),
      left: 16,
    };
  }
  if (!rect) {
    return {
      top: Math.max(16, viewportHeight / 2 - cardHeight / 2),
      left: Math.max(16, viewportWidth / 2 - cardWidth / 2),
    };
  }
  let top = rect.top + rect.height + 14;
  if (top + cardHeight > viewportHeight - 12) {
    top = Math.max(16, rect.top - cardHeight - 14);
  }
  let left = rect.left;
  if (left + cardWidth > viewportWidth - 16) {
    left = viewportWidth - cardWidth - 16;
  }
  if (left < 16) left = 16;
  return { top, left };
}
