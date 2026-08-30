/** Interactive “How to use” walkthrough — steps, cache, and localStorage helpers. */

import type { TourDemoId } from "@/lib/tourDemo";
import { TOUR_DEMO_POSTCODE } from "@/lib/tourDemo";

export const TOUR_STORAGE_KEY = "schoolside.tourSeen";
export const TOUR_START_EVENT = "schoolside:start-tour";
/** Ask Setup to open a binder tile (postcode / stages / sector / provision). */
export const TOUR_SETUP_TILE_EVENT = "schoolside:tour-setup-tile";
/**
 * Ask the journey shell to keep a chapter mounted (hidden) so the next
 * walkthrough step can flip to it without a cold remount.
 */
export const TOUR_WARM_CHAPTER_EVENT = "schoolside:tour-warm-chapter";
export const TOUR_PAD = 10;
/** Sticky header clearance when centering a target. */
export const TOUR_HEADER_OFFSET = 72;

export type TourWarmChapterId =
  | "setup"
  | "nearby"
  | "compare"
  | "side-by-side"
  | "how";

export type TourWarmChapterDetail = {
  chapter: TourWarmChapterId | null;
};

/** Prefetch-mount a journey chapter (or clear with null). */
export function requestTourWarmChapter(
  chapter: TourWarmChapterId | null,
): void {
  window.dispatchEvent(
    new CustomEvent<TourWarmChapterDetail>(TOUR_WARM_CHAPTER_EVENT, {
      detail: { chapter },
    }),
  );
}

export type TourSetupTileId = "postcode" | "stages" | "sector" | "provision";

export interface TourStep {
  id: string;
  /** Matches `[data-tour="…"]` on the page. */
  target: string;
  title: string;
  body: string;
  /** Skip when the target is missing or not laid out (e.g. radius before postcode). */
  optional?: boolean;
  /**
   * Keep optional steps in the script when their journey chapter isn’t mounted
   * yet (Setup / Find / Shortlist / Side by side / Understand peer pages).
   */
  retainIfMissing?: boolean;
  /** Live demo to run when this step becomes active (fills UI, picks schools…). */
  demo?: TourDemoId;
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

/** Setup binder tile to open before spotlighting a control inside it. */
export const TOUR_TARGET_SETUP_TILE: Partial<
  Record<string, TourSetupTileId>
> = {
  postcode: "postcode",
  stages: "stages",
  sector: "sector",
  provision: "provision",
};

/**
 * Live journey walkthrough — fills a sample postcode, shortlists KS2 + KS3
 * schools, then walks Side by side data tabs, charts, and print.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: "hero",
    title: "Welcome to School Compass",
    body: "This walkthrough runs a live example with a Hampshire postcode, shortlists schools, then opens the comparison boards. Skip anytime, or restart from How to use beside the chapter tabs.",
  },
  {
    id: "chapters",
    target: "page-chapters",
    title: "Five chapters, one journey",
    body: "Setup → Find → Shortlist → Side by side → Understand. We’ll drive each chapter with sample data so you can see how the pieces connect.",
  },
  {
    id: "postcode",
    target: "postcode",
    title: "Start with a home postcode",
    body: `We’ll look up ${TOUR_DEMO_POSTCODE} (Totton, Hampshire — a real sample near codes like SO40 1AA). Enter your own postcode the same way — spaces or hyphens are fine.`,
    demo: "fill-postcode",
  },
  {
    id: "stages",
    target: "stages",
    title: "Turn on KS2 and KS3",
    body: "For this demo we select Key Stage 2 and Key Stage 3 so the Find list includes juniors/primaries and secondaries. OR matching is the default (any selected stage).",
    demo: "set-stages-ks2-ks3",
  },
  {
    id: "sector",
    target: "sector",
    title: "State, independent, or both",
    body: "School type filters the map and list. We’ll keep State & independent for the sample shortlist.",
  },
  {
    id: "nearby",
    target: "nearby",
    title: "Find map around home",
    body: "Find opens with schools in the range ring and road distances in the list. Unlock postcode later if you want to drag the home pin.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "radius",
    target: "radius",
    title: "Widen the range ring",
    body: "Watch the kilometre chips — we’ll move the ring to 8 km so juniors and secondaries near Totton appear together.",
    optional: true,
    retainIfMissing: true,
    demo: "set-radius-8km",
  },
  {
    id: "pick-shortlist",
    target: "nearby",
    title: "Tick two KS2 and two KS3 schools",
    body: "We’ll shortlist two junior/primary settings and two secondaries from the Find list (four is the maximum). Tick or untick anytime yourself.",
    optional: true,
    retainIfMissing: true,
    demo: "pick-shortlist",
  },
  {
    id: "shortlist",
    target: "shortlist",
    title: "Your shortlist chips",
    body: "Selected schools appear here on Shortlist. Share keeps the same schools in the URL for a co-parent.",
  },
  {
    id: "boards",
    target: "boards",
    title: "Side by side — KS2 path",
    body: "Comparison opens one path at a time. We’ll start on Key Stage 2 for the primary shortlist — gaps versus England are patterns to discuss, not a verdict.",
    demo: "open-path-ks2",
  },
  {
    id: "decision-guidance",
    target: "decision-guidance",
    title: "How to read this as a parent",
    body: "Context opens with guidance for the active path. Use it before you treat a table or précis as a final answer.",
    optional: true,
    retainIfMissing: true,
    demo: "open-section-context",
  },
  {
    id: "compare-ofsted",
    target: "compare-sections",
    title: "Browse Ofsted / inspection",
    body: "Section tabs mirror Setup’s binder. We’ll open Ofsted for précis and grades — useful visit questions, not rankings.",
    optional: true,
    retainIfMissing: true,
    demo: "open-section-ofsted",
  },
  {
    id: "year-trend",
    target: "year-trend",
    title: "Year-trend charts on Stats",
    body: "On Stats, open Year trend on a measure. Lines show each shortlisted school and England; the hatched COVID band marks unpublished KS2 years.",
    optional: true,
    retainIfMissing: true,
    demo: "expand-year-trend",
  },
  {
    id: "boards-ks4",
    target: "boards",
    title: "Switch to the KS3–4 path",
    body: "Path chips move between stages. We’ll open KS3–4 / 16–18 for the secondary shortlist — same Side by side frame, different tables.",
    demo: "open-path-ks4",
  },
  {
    id: "visit-pack",
    target: "print-comparison-pack",
    title: "Print a comparison pack",
    body: "Print comparison pack builds a PDF-ready shortlist: reading guide, contacts, précis, and visit prompts for open days.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "how",
    target: "how",
    title: "Understand the figures",
    body: "Topic cards cover getting started, stage guides, FAQ, and data sources. Restart this tour anytime from How to use — try it next with your own postcode.",
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

export function requestTourSetupTile(tile: TourSetupTileId): void {
  window.dispatchEvent(
    new CustomEvent(TOUR_SETUP_TILE_EVENT, { detail: { tile } }),
  );
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
    if (!el) {
      if (!step.optional) return true;
      // Peer journey pages aren’t mounted yet — keep deferred optionals.
      return Boolean(step.retainIfMissing);
    }

    const measure =
      "getBoundingClientRect" in el &&
      typeof (el as HTMLElement).getBoundingClientRect === "function"
        ? (el as HTMLElement).getBoundingClientRect()
        : null;

    // Zero-size optional targets (hidden / not laid out) are skipped,
    // unless they belong to another chapter that remounts later.
    if (step.optional) {
      if (step.retainIfMissing) return true;
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Axis-aligned overlap area in CSS pixels (0 when separated). */
export function rectOverlapArea(
  a: ViewportRect,
  b: ViewportRect,
): number {
  const x = Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left),
  );
  const y = Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top),
  );
  return x * y;
}

/**
 * Place the dialog away from the spotlight. Prefers side slots for tall/wide
 * targets so the card doesn’t cover the feature being explained.
 */
export function placeTourCard(
  rect: ViewportRect | null,
  viewportWidth: number,
  viewportHeight: number,
  cardWidth = Math.min(360, viewportWidth - 32),
  cardHeight = 280,
  gap = 16,
): { top: number; left: number } {
  const margin = 16;
  const maxTop = Math.max(margin, viewportHeight - cardHeight - 12);
  const maxLeft = Math.max(margin, viewportWidth - cardWidth - margin);
  const narrow = viewportWidth < 720;

  if (narrow) {
    if (rect) {
      const below = rect.top + rect.height + gap;
      if (below + cardHeight <= viewportHeight - 12) {
        return { top: below, left: margin };
      }
      const above = rect.top - cardHeight - gap;
      if (above >= margin) {
        return { top: Math.min(maxTop, above), left: margin };
      }
    }
    return { top: maxTop, left: margin };
  }

  if (!rect) {
    return {
      top: clamp(viewportHeight / 2 - cardHeight / 2, margin, maxTop),
      left: clamp(viewportWidth / 2 - cardWidth / 2, margin, maxLeft),
    };
  }

  const preferSide =
    rect.height > viewportHeight * 0.38 || rect.width > viewportWidth * 0.52;

  type Candidate = { top: number; left: number; rank: number };
  const raw: Candidate[] = [
    {
      top: rect.top,
      left: rect.left + rect.width + gap,
      rank: preferSide ? 0 : 2,
    },
    {
      top: rect.top,
      left: rect.left - cardWidth - gap,
      rank: preferSide ? 1 : 3,
    },
    {
      top: rect.top + rect.height + gap,
      left: rect.left,
      rank: preferSide ? 4 : 0,
    },
    {
      top: rect.top - cardHeight - gap,
      left: rect.left,
      rank: preferSide ? 5 : 1,
    },
    // Viewport corners — last resort for near-full-screen targets.
    { top: margin, left: margin, rank: 12 },
    { top: margin, left: maxLeft, rank: 12 },
    { top: maxTop, left: margin, rank: 13 },
    { top: maxTop, left: maxLeft, rank: 11 },
  ];

  let bestTop = margin;
  let bestLeft = margin;
  let bestScore = -Infinity;

  for (const c of raw) {
    const top = clamp(c.top, margin, maxTop);
    const left = clamp(c.left, margin, maxLeft);
    const card: ViewportRect = {
      top,
      left,
      width: cardWidth,
      height: cardHeight,
    };
    const overlap = rectOverlapArea(card, rect);
    const fullyOnScreen =
      c.top >= margin - 0.5 &&
      c.left >= margin - 0.5 &&
      c.top + cardHeight <= viewportHeight - 11 &&
      c.left + cardWidth <= viewportWidth - 15;
    const score =
      -overlap * 12 +
      (fullyOnScreen ? 8000 : 0) -
      c.rank * 40 -
      (Math.abs(top - rect.top) + Math.abs(left - rect.left)) * 0.02;
    if (score > bestScore) {
      bestScore = score;
      bestTop = top;
      bestLeft = left;
    }
  }

  return { top: bestTop, left: bestLeft };
}
