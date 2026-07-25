/** Interactive “How to use” walkthrough — steps and localStorage helpers. */

export const TOUR_STORAGE_KEY = "schoolside.tourSeen";
export const TOUR_START_EVENT = "schoolside:start-tour";

export interface TourStep {
  id: string;
  /** Matches `[data-tour="…"]` on the page. */
  target: string;
  title: string;
  body: string;
  /** Skip when the target is missing or not laid out (e.g. nearby before postcode). */
  optional?: boolean;
}

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
