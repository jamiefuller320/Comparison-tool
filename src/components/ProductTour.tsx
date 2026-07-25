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
  cacheTourTargets,
  hasSeenTour,
  markTourSeen,
  placeTourCard,
  resolveActiveTourSteps,
  scrollToCachedTarget,
  viewportRectFromCache,
  type TourStep,
  type TourTargetCache,
  type ViewportRect,
} from "@/lib/tour";

const AUTO_START_DELAY_MS = 900;

export function ProductTour() {
  const titleId = useId();
  const cacheRef = useRef<Map<string, TourTargetCache>>(new Map());
  const scrollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
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

  const close = useCallback((markSeen: boolean) => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    document.documentElement.classList.remove("tour-running");
    cacheRef.current = new Map();
    setOpen(false);
    setSteps([]);
    setIndex(0);
    setRect(null);
    if (markSeen) markTourSeen();
  }, []);

  const start = useCallback(() => {
    const active = resolveActiveTourSteps(TOUR_STEPS);
    if (!active.length) return;
    // Snapshot layout once so step changes only read the cache.
    rebuildCache(active);
    document.documentElement.classList.add("tour-running");
    setSteps(active);
    setIndex(0);
    setOpen(true);
  }, [rebuildCache]);

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

  const step = steps[index] ?? null;

  useLayoutEffect(() => {
    if (!open || !step) return;
    paintFromCache(step.target, true);
  }, [open, step, paintFromCache]);

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
  }, [open, close, steps.length]);

  if (!open || !step) return null;

  const isLast = index >= steps.length - 1;
  const progress = `${index + 1} / ${steps.length}`;

  return (
    <div className="tour-root" role="presentation">
      <div
        className="tour-backdrop"
        onClick={() => close(true)}
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
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
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
        <div className="tour-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              className="btn btn-primary"
              autoFocus
              onClick={() => close(true)}
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              autoFocus
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
