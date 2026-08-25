/** Interactive “How to use” walkthrough — steps, cache, and localStorage helpers. */

export const TOUR_STORAGE_KEY = "schoolside.tourSeen";
export const TOUR_START_EVENT = "schoolside:start-tour";
/** Ask Setup to open a binder tile (postcode / stages / sector / provision). */
export const TOUR_SETUP_TILE_EVENT = "schoolside:tour-setup-tile";
export const TOUR_PAD = 10;
/** Sticky header clearance when centering a target. */
export const TOUR_HEADER_OFFSET = 72;

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
 * Journey walkthrough — one beat per chapter control, matching
 * Setup → Find → Shortlist → Side by side → Understand.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: "hero",
    title: "Welcome to School Compass",
    body: "This walkthrough points out the main controls. You can leave anytime with Skip, or restart later from How to use beside the chapter tabs.",
  },
  {
    id: "chapters",
    target: "page-chapters",
    title: "Five chapters, one journey",
    body: "Use the tabs for Setup, Find, Shortlist, Side by side, and Understand. The walkthrough follows that order — jump ahead anytime with a tab.",
  },
  {
    id: "postcode",
    target: "postcode",
    title: "Start with your home postcode",
    body: "On Setup, enter a full UK postcode (spaces or hyphens are fine). Find nearby maps schools around home so you can tick ones worth comparing.",
  },
  {
    id: "stages",
    target: "stages",
    title: "Choose by age or key stage",
    body: "Still on Setup: drag the child’s age range if key stages are unfamiliar — matching stages turn on automatically. Or press the stage chips (ages shown on each) to override. Childminders stay a separate care category. Several school stages use OR by default (Any stage); choose Every stage (AND) when you want only schools that cover all of them.",
  },
  {
    id: "sector",
    target: "sector",
    title: "State, independent, or both",
    body: "School type filters the map, Find list, and Shortlist search. State defaults to KS2 tables; independent defaults to secondary GCSE measures. You can switch anytime under Setup.",
  },
  {
    id: "provision",
    target: "provision",
    title: "Mainstream or specialist",
    body: "The last Setup tile narrows mainstream versus specialist / alternative provision. Leave it on Any unless you are specifically looking for specialist settings.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "nearby",
    target: "nearby",
    title: "Find map and tick list",
    body: "Open Find after a postcode lookup. The map shows schools in range and the list adds road distance. Unlock postcode to drag the home pin and refresh the map. Tick a school to add it to your shortlist (up to four).",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "radius",
    target: "radius",
    title: "Widen or tighten the range ring",
    body: "On Find, use the kilometre chips to grow or shrink the search ring. The map and list update together.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "search",
    target: "search",
    title: "Search by name or place",
    body: "On Shortlist, search by name, town, postcode or URN. Results respect your Setup stage and school-type filters — handy when a school sits outside the range ring.",
  },
  {
    id: "shortlist",
    target: "shortlist",
    title: "Your shortlist (up to four)",
    body: "Selected schools appear as chips on Shortlist. Use Compare side by side or Share when you’re ready — your shortlist stays in the page URL so a co-parent can open the same view.",
  },
  {
    id: "boards",
    target: "boards",
    title: "Side-by-side comparison",
    body: "Side by side shows one path at a time (Early years, Childminders, KS1, KS2, or KS4). If several categories are on, use the path chips. Context, Summary, Ofsted, Website, Places, and Stats sit in the section tabs — gaps versus England or a sector mean help you spot patterns, not a final verdict.",
  },
  {
    id: "childminders",
    target: "childminders",
    title: "Childminders path",
    body: "Open the Childminders path after shortlisting a consented provider. You’ll get the directory card, vetting checklist, and visit pack — separate from the nursery Ofsted table.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "decision-guidance",
    target: "decision-guidance",
    title: "What the data tells you",
    body: "On each Side by side path, open Context for “How to read this as a parent”. It opens automatically when your shortlist is a single stage; with several stages, pick one inside the panel. Use it before you treat a table or précis as a verdict.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "visit-pack",
    target: "visit-pack",
    title: "Print a shortlist or visit pack",
    body: "Every path with a shortlist can print a pack: how to read the data, contact cards, inspection précis, and visit or interview prompts. Use Print / save as PDF before open days or calls.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "year-trend",
    target: "year-trend",
    title: "Year-on-year trends on Stats",
    body: "On the KS2 Context tab you’ll see a short note about year trends; the graphs themselves sit on the Stats tab. Open Year trend on a measure for each shortlisted school and England across published years. The hatched COVID band marks 2019/20–2021/22, when KS2 tables were unpublished — lines do not connect across that gap, and those years are not school failures. Small cohorts bounce; blank cells are usually suppression or a new school.",
    optional: true,
    retainIfMissing: true,
  },
  {
    id: "how",
    target: "how",
    title: "Understand the figures",
    body: "Open Understand for topic cards — getting started, each stage guide, FAQ, and where the numbers come from. Take a look whenever you need a refresher before you treat a table as a verdict.",
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
