"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  TOUR_START_EVENT,
  TOUR_STEPS,
  TOUR_TARGET_SETUP_TILE,
  cacheTourTargets,
  hasSeenTour,
  markTourSeen,
  measureTourTarget,
  placeTourCard,
  requestTourSetupTile,
  requestTourWarmChapter,
  resolveActiveTourSteps,
  scrollTourTargetIntoView,
  tourTargetSelector,
  viewportRectFromCache,
  viewportRectFromClientRect,
  type TourStep,
  type TourTargetCache,
  type ViewportRect,
} from "@/lib/tour";
import {
  expandFirstYearTrend,
  clickCompareSectionTab,
  completeTourDemo,
  requestTourDemo,
  TOUR_DEMO_EVENT,
  type TourDemoId,
  type TourDemoRequestDetail,
} from "@/lib/tourDemo";
import {
  TOUR_TARGET_CHAPTER,
  useJourneyChapter,
} from "@/components/JourneyChapterContext";

const AUTO_START_DELAY_MS = 900;
const DEFAULT_CARD_SIZE = { width: 360, height: 280 };

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

/** Demos handled in the tour shell (DOM clicks) rather than page state. */
const TOUR_SHELL_DEMOS = new Set<TourDemoId>([
  "open-section-context",
  "open-section-ofsted",
  "open-section-stats",
  "expand-year-trend",
]);

export function ProductTour() {
  const titleId = useId();
  const { chapter, setChapter } = useJourneyChapter();
  const chapterRef = useRef(chapter);
  chapterRef.current = chapter;
  const cacheRef = useRef<Map<string, TourTargetCache>>(new Map());
  const scrollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardSizeRef = useRef(DEFAULT_CARD_SIZE);
  const demoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openedTrendByTourRef = useRef(false);
  const demoTimerRef = useRef<number | null>(null);
  const demoRunIdRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [rect, setRect] = useState<ViewportRect | null>(null);
  const [cardSize, setCardSize] = useState(DEFAULT_CARD_SIZE);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({
    top: 24,
    left: 24,
  });

  cardSizeRef.current = cardSize;

  const placeCard = useCallback((spotlight: ViewportRect | null) => {
    const size = cardSizeRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Match the mobile CSS that stretches the card edge-to-edge.
    const cardWidth =
      vw < 720 ? Math.max(280, vw - 32) : Math.min(size.width, vw - 32);
    return placeTourCard(spotlight, vw, vh, cardWidth, size.height);
  }, []);

  const spotlightOpts = useCallback(() => {
    const vw = window.innerWidth;
    if (vw >= 720) return {};
    // Leave room under the cutout for the full-width tour card.
    return { reserveBelow: cardSizeRef.current.height + 24 };
  }, []);

  const paintTarget = useCallback(
    (target: string, scrollToTarget: boolean) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const opts = spotlightOpts();

      if (scrollToTarget) {
        scrollingRef.current = true;
        scrollTourTargetIntoView(target, vh);
        // Instant scroll — release the guard and remeasure on the next frame.
        requestAnimationFrame(() => {
          scrollingRef.current = false;
          const el = document.querySelector(tourTargetSelector(target));
          if (el instanceof HTMLElement) {
            const box = el.getBoundingClientRect();
            if (box.width > 0 && box.height > 0) {
              const measured = measureTourTarget(target);
              if (measured) cacheRef.current.set(target, measured);
              const next = viewportRectFromClientRect(box, vw, vh, undefined, opts);
              setRect(next);
              setCardPos(placeCard(next));
              return;
            }
          }
          const cached = cacheRef.current.get(target);
          if (!cached) {
            setRect(null);
            setCardPos(placeCard(null));
            return;
          }
          const next = viewportRectFromCache(
            cached,
            window.scrollX,
            window.scrollY,
            vw,
            vh,
            undefined,
            opts,
          );
          setRect(next);
          setCardPos(placeCard(next));
        });
        return;
      }

      // Prefer live layout after mobile reflow / sticky headers / demos.
      const measured = measureTourTarget(target);
      if (measured) {
        cacheRef.current.set(target, measured);
        const el = document.querySelector(tourTargetSelector(target));
        if (el instanceof HTMLElement) {
          const box = el.getBoundingClientRect();
          const next = viewportRectFromClientRect(box, vw, vh, undefined, opts);
          setRect(next);
          setCardPos(placeCard(next));
          return;
        }
      }

      const cached = cacheRef.current.get(target);
      if (!cached) {
        setRect(null);
        setCardPos(placeCard(null));
        return;
      }

      const next = viewportRectFromCache(
        cached,
        window.scrollX,
        window.scrollY,
        vw,
        vh,
        undefined,
        opts,
      );
      setRect(next);
      setCardPos(placeCard(next));
    },
    [placeCard, spotlightOpts],
  );

  const rebuildCache = useCallback((active: TourStep[]) => {
    cacheRef.current = cacheTourTargets(active);
  }, []);

  const ensureChapterForTarget = useCallback(
    async (target: string) => {
      const needed = TOUR_TARGET_CHAPTER[target];
      if (needed && needed !== chapterRef.current) {
        setChapter(needed, { scroll: false });
        // Warm-mounted chapters flip class only — a couple of frames is enough.
        await waitFrames(2);
      }
      // Setup only mounts the active binder tile — open the right sheet
      // before measuring postcode / stages / sector / provision.
      const tile = TOUR_TARGET_SETUP_TILE[target];
      if (tile) {
        requestTourSetupTile(tile);
        await waitFrames(2);
      }
    },
    [setChapter],
  );

  const collapseTourTrendDemo = useCallback(() => {
    if (demoTimerRef.current != null) {
      window.clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    const trigger = demoTriggerRef.current;
    if (
      openedTrendByTourRef.current &&
      trigger &&
      trigger.getAttribute("aria-expanded") === "true"
    ) {
      trigger.click();
    }
    openedTrendByTourRef.current = false;
    demoTriggerRef.current = null;
  }, []);

  const runShellDemo = useCallback(async (demo: TourDemoId) => {
    switch (demo) {
      case "open-section-context":
        return clickCompareSectionTab(/context/i);
      case "open-section-ofsted":
        return clickCompareSectionTab(/ofsted/i);
      case "open-section-stats":
        return clickCompareSectionTab(/stats/i);
      case "expand-year-trend": {
        const trigger = await expandFirstYearTrend();
        if (trigger) {
          openedTrendByTourRef.current = true;
          demoTriggerRef.current = trigger;
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  }, []);

  const close = useCallback(
    (markSeen: boolean) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      collapseTourTrendDemo();
      requestTourWarmChapter(null);
      document.documentElement.classList.remove("tour-running");
      cacheRef.current = new Map();
      setOpen(false);
      setSteps([]);
      setIndex(0);
      setBusy(false);
      setRect(null);
      if (markSeen) markTourSeen();
    },
    [collapseTourTrendDemo],
  );

  const start = useCallback(() => {
    void (async () => {
      await ensureChapterForTarget("postcode");
      const active = resolveActiveTourSteps(TOUR_STEPS);
      if (!active.length) return;
      // Snapshot layout once so step changes only read the cache.
      rebuildCache(active);
      document.documentElement.classList.add("tour-running");
      setSteps(active);
      setIndex(0);
      setOpen(true);
    })();
  }, [rebuildCache, ensureChapterForTarget]);

  useEffect(() => {
    function onStart() {
      start();
    }
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => window.removeEventListener(TOUR_START_EVENT, onStart);
  }, [start]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const force = params.get("tour") === "1" || params.get("tour") === "true";
    if (!force && hasSeenTour()) return;

    const timer = window.setTimeout(() => {
      if (force || !hasSeenTour()) start();
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [start]);

  // Shell-owned demos answer TOUR_DEMO_EVENT so requestTourDemo stays uniform.
  useEffect(() => {
    function onDemo(event: Event) {
      const detail = (event as CustomEvent<TourDemoRequestDetail>).detail;
      if (!detail?.requestId || !TOUR_SHELL_DEMOS.has(detail.demo)) return;
      void (async () => {
        const ok = await runShellDemo(detail.demo);
        completeTourDemo(detail.requestId, ok);
      })();
    }
    window.addEventListener(TOUR_DEMO_EVENT, onDemo);
    return () => window.removeEventListener(TOUR_DEMO_EVENT, onDemo);
  }, [runShellDemo]);

  const step = steps[index] ?? null;

  // Prefetch-mount the next *different* journey chapter while this step is idle.
  useEffect(() => {
    if (!open || busy) return;
    let warm: (typeof TOUR_TARGET_CHAPTER)[string] | null = null;
    for (let i = index + 1; i < steps.length; i++) {
      const ch = TOUR_TARGET_CHAPTER[steps[i].target];
      if (ch && ch !== chapterRef.current) {
        warm = ch;
        break;
      }
    }
    requestTourWarmChapter(warm);
  }, [open, busy, steps, index]);

  useEffect(() => {
    if (!open || !step) return;
    const runId = ++demoRunIdRef.current;
    let cancelled = false;

    void (async () => {
      setBusy(Boolean(step.demo));
      try {
        await ensureChapterForTarget(step.target);
        if (cancelled || runId !== demoRunIdRef.current) return;

        if (step.demo) {
          await requestTourDemo(step.demo, 12000);
          if (cancelled || runId !== demoRunIdRef.current) return;
          await waitFrames(3);
        }

        if (cancelled || runId !== demoRunIdRef.current) return;
        rebuildCache(steps);

        if (
          step.optional &&
          !cacheRef.current.has(step.target) &&
          index < steps.length - 1
        ) {
          setIndex((i) => Math.min(i + 1, steps.length - 1));
          return;
        }

        paintTarget(step.target, true);

        if (step.demo === "expand-year-trend") {
          if (demoTimerRef.current != null) {
            window.clearTimeout(demoTimerRef.current);
          }
          demoTimerRef.current = window.setTimeout(() => {
            if (cancelled || runId !== demoRunIdRef.current) return;
            rebuildCache(steps);
            paintTarget("year-trend", true);
            const panel = document.querySelector(".history-panel-inline");
            if (panel instanceof HTMLElement) {
              panel.scrollIntoView({ behavior: "auto", block: "nearest" });
              paintTarget("year-trend", false);
            }
          }, 420);
        }
      } finally {
        if (runId === demoRunIdRef.current) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      if (demoTimerRef.current != null) {
        window.clearTimeout(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };
  }, [
    open,
    step,
    steps,
    index,
    ensureChapterForTarget,
    rebuildCache,
    paintTarget,
  ]);

  useEffect(() => {
    if (!open || !step) return;
    if (step.id === "year-trend" || step.demo === "expand-year-trend") return;
    collapseTourTrendDemo();
  }, [open, step, collapseTourTrendDemo]);

  // Re-place the card when its real height changes (copy / busy line).
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!open || !el) return;

    function measure() {
      if (!cardRef.current) return;
      const box = cardRef.current.getBoundingClientRect();
      const next = {
        width: Math.max(280, Math.round(box.width)),
        height: Math.max(160, Math.round(box.height)),
      };
      setCardSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    }

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, step, busy]);

  useEffect(() => {
    if (!open || !rect) return;
    setCardPos(placeCard(rect));
  }, [open, rect, cardSize, placeCard]);

  useEffect(() => {
    if (!open) return;

    function schedulePaint() {
      if (scrollingRef.current || !step) return;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        paintTarget(step.target, false);
      });
    }

    function onViewportChange() {
      // Layout or iOS chrome changed — remasure live targets, then paint.
      rebuildCache(steps);
      if (step) paintTarget(step.target, false);
    }

    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", onViewportChange);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", schedulePaint);

    const targetEl = step
      ? document.querySelector(tourTargetSelector(step.target))
      : null;
    let ro: ResizeObserver | null = null;
    if (targetEl instanceof HTMLElement) {
      ro = new ResizeObserver(() => schedulePaint());
      ro.observe(targetEl);
    }

    return () => {
      window.removeEventListener("scroll", schedulePaint);
      window.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", schedulePaint);
      ro?.disconnect();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, step, steps, paintTarget, rebuildCache]);

  // When the tour card resizes on narrow screens, re-clamp the spotlight so
  // the dialog and cutout stop overlapping after copy/busy-line changes.
  useEffect(() => {
    if (!open || !step || window.innerWidth >= 720) return;
    paintTarget(step.target, false);
  }, [open, step, cardSize, paintTarget]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (busy) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(0, steps.length - 1)));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length, busy]);

  if (!open || !step) return null;

  const isLast = index >= steps.length - 1;
  const progress = `${index + 1} / ${steps.length}`;

  return (
    <div className="tour-root" role="presentation">
      {/* Catches clicks; visual dim comes from the spotlight ring when present. */}
      <div
        className={rect ? "tour-backdrop tour-backdrop-clear" : "tour-backdrop"}
        aria-hidden
      />
      {rect ? (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          aria-hidden
        />
      ) : null}

      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        style={{
          top: cardPos.top,
          left: cardPos.left,
          width: "min(360px, calc(100vw - 32px))",
        }}
      >
        <div className="tour-card-meta">
          <span className="tour-progress">{progress}</span>
          <button
            type="button"
            className="tour-skip"
            onClick={() => close(true)}
          >
            Skip
          </button>
        </div>
        <h2 id={titleId} className="tour-title">
          {step.title}
        </h2>
        <p className="tour-body">{step.body}</p>
        {busy ? (
          <p className="tour-body tour-demo-status" role="status">
            Updating the page…
          </p>
        ) : null}
        <div className="tour-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={index === 0 || busy}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              className="btn btn-primary"
              autoFocus
              disabled={busy}
              onClick={() => close(true)}
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              autoFocus
              disabled={busy}
              onClick={() =>
                setIndex((i) => Math.min(i + 1, steps.length - 1))
              }
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
