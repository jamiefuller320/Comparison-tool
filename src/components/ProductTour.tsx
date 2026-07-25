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
  hasSeenTour,
  markTourSeen,
  resolveActiveTourSteps,
  tourTargetSelector,
  type TourStep,
} from "@/lib/tour";

const PAD = 10;
const AUTO_START_DELAY_MS = 900;

type Rect = { top: number; left: number; width: number; height: number };

function measureTarget(target: string): Rect | null {
  const el = document.querySelector(tourTargetSelector(target));
  if (!(el instanceof HTMLElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return {
    top: Math.max(8, r.top - PAD),
    left: Math.max(8, r.left - PAD),
    width: Math.min(window.innerWidth - 16, r.width + PAD * 2),
    height: Math.min(window.innerHeight - 16, r.height + PAD * 2),
  };
}

function scrollTargetIntoView(target: string) {
  const el = document.querySelector(tourTargetSelector(target));
  if (!(el instanceof HTMLElement)) return;
  el.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

export function ProductTour() {
  const titleId = useId();
  const measureTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({
    top: 24,
    left: 24,
  });

  const close = useCallback((markSeen: boolean) => {
    if (measureTimer.current != null) {
      window.clearTimeout(measureTimer.current);
      measureTimer.current = null;
    }
    setOpen(false);
    setSteps([]);
    setIndex(0);
    setRect(null);
    if (markSeen) markTourSeen();
  }, []);

  const start = useCallback(() => {
    const active = resolveActiveTourSteps(TOUR_STEPS);
    if (!active.length) return;
    setSteps(active);
    setIndex(0);
    setOpen(true);
  }, []);

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

  const refreshGeometry = useCallback(() => {
    if (!step) return;
    scrollTargetIntoView(step.target);
    if (measureTimer.current != null) {
      window.clearTimeout(measureTimer.current);
    }
    // Wait a beat for smooth scroll / sticky header before measuring.
    measureTimer.current = window.setTimeout(() => {
      const next = measureTarget(step.target);
      setRect(next);

      const cardWidth = Math.min(360, window.innerWidth - 32);
      const cardHeight = 210;
      const narrow = window.innerWidth < 720;

      if (narrow) {
        setCardPos({
          top: Math.max(16, window.innerHeight - cardHeight - 20),
          left: 16,
        });
        return;
      }

      if (!next) {
        setCardPos({
          top: Math.max(16, window.innerHeight / 2 - cardHeight / 2),
          left: Math.max(16, window.innerWidth / 2 - cardWidth / 2),
        });
        return;
      }

      let top = next.top + next.height + 14;
      if (top + cardHeight > window.innerHeight - 12) {
        top = Math.max(16, next.top - cardHeight - 14);
      }
      let left = next.left;
      if (left + cardWidth > window.innerWidth - 16) {
        left = window.innerWidth - cardWidth - 16;
      }
      if (left < 16) left = 16;
      setCardPos({ top, left });
    }, 280);
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    refreshGeometry();
  }, [open, step, refreshGeometry]);

  useEffect(() => {
    if (!open) return;
    function onResize() {
      refreshGeometry();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, refreshGeometry]);

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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    // Keep page scrollable so scrollIntoView can work; block only accidental
    // background interaction via the backdrop.
    document.body.style.overflow = prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
