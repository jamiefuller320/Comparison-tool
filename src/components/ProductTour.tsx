"use client";

import {
  useCallback,
  useEffect,
  useId,
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
  placeTourCard,
  requestTourSetupTile,
  resolveActiveTourSteps,
  scrollToCachedTarget,
  viewportRectFromCache,
  tourTargetSelector,
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
  const { setChapter } = useJourneyChapter();
  const cacheRef = useRef<Map<string, TourTargetCache>>(new Map());
  const scrollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const demoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openedTrendByTourRef = useRef(false);
  const demoTimerRef = useRef<number | null>(null);
  const demoRunIdRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [rect, setRect] = useState<ViewportRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({
    top: 24,
    left: 24,
  });

  const paintFromCache = useCallback((target: string, scrollToTarget: boolean) => {
    const cached = cacheRef.current.get(target);
    if (!cached) {
      setRect(null);
      setCardPos(
        placeTourCard(null, window.innerWidth, window.innerHeight),
      );
      return;
    }

    if (scrollToTarget) {
      scrollingRef.current = true;
      scrollToCachedTarget(cached, window.innerHeight);
      // Instant scroll — release the guard on the next frame.
      requestAnimationFrame(() => {
        scrollingRef.current = false;
      });
    }

    const next = viewportRectFromCache(
      cached,
      window.scrollX,
      window.scrollY,
      window.innerWidth,
      window.innerHeight,
    );
    setRect(next);
    setCardPos(placeTourCard(next, window.innerWidth, window.innerHeight));
  }, []);

  const rebuildCache = useCallback((active: TourStep[]) => {
    cacheRef.current = cacheTourTargets(active);
  }, []);

  const ensureChapterForTarget = useCallback(
    async (target: string) => {
      const chapter = TOUR_TARGET_CHAPTER[target];
      if (chapter) {
        setChapter(chapter, { scroll: false });
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

        paintFromCache(step.target, true);

        if (step.demo === "expand-year-trend") {
          if (demoTimerRef.current != null) {
            window.clearTimeout(demoTimerRef.current);
          }
          demoTimerRef.current = window.setTimeout(() => {
            if (cancelled || runId !== demoRunIdRef.current) return;
            rebuildCache(steps);
            paintFromCache("year-trend", true);
            const panel = document.querySelector(".history-panel-inline");
            if (panel instanceof HTMLElement) {
              panel.scrollIntoView({ behavior: "auto", block: "nearest" });
              paintFromCache("year-trend", false);
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
    paintFromCache,
  ]);

  useEffect(() => {
    if (!open || !step) return;
    if (step.id === "year-trend" || step.demo === "expand-year-trend") return;
    collapseTourTrendDemo();
  }, [open, step, collapseTourTrendDemo]);

  useEffect(() => {
    if (!open) return;

    function schedulePaint() {
      if (scrollingRef.current || !step) return;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        paintFromCache(step.target, false);
      });
    }

    function onResize() {
      // Viewport change invalidates document boxes — rebuild once, then paint.
      rebuildCache(steps);
      if (step) paintFromCache(step.target, false);
    }

    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", schedulePaint);
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, step, steps, paintFromCache, rebuildCache]);

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
      <div className="tour-backdrop" aria-hidden />
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
