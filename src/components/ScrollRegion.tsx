"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type OverflowState = {
  y: boolean;
  bottom: boolean;
  top: boolean;
  x: boolean;
  right: boolean;
  left: boolean;
};

const EMPTY: OverflowState = {
  y: false,
  bottom: false,
  top: false,
  x: false,
  right: false,
  left: false,
};

function readOverflow(el: HTMLElement): OverflowState {
  const eps = 2;
  const canY = el.scrollHeight > el.clientHeight + eps;
  const canX = el.scrollWidth > el.clientWidth + eps;
  return {
    y: canY,
    x: canX,
    top: canY && el.scrollTop > eps,
    bottom: canY && el.scrollTop + el.clientHeight < el.scrollHeight - eps,
    left: canX && el.scrollLeft > eps,
    right: canX && el.scrollLeft + el.clientWidth < el.scrollWidth - eps,
  };
}

/**
 * Scroll container with edge fades + a short “more below/across” cue when
 * content overflows — makes clipped school-table frames discoverable.
 */
export function ScrollRegion({
  className = "",
  children,
  hint = "Scroll for more",
}: {
  className?: string;
  children: ReactNode;
  hint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<OverflowState>(EMPTY);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflow(readOverflow(el));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const onScroll = () => update();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    // Child size changes (tables loading, sticky toggles).
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const showHint = overflow.bottom || overflow.right;
  const hintText = overflow.bottom
    ? hint
    : overflow.right
      ? "Scroll sideways for more"
      : hint;

  return (
    <div
      className={`scroll-region ${className}`.trim()}
      data-overflow-y={overflow.y ? "true" : "false"}
      data-overflow-bottom={overflow.bottom ? "true" : "false"}
      data-overflow-top={overflow.top ? "true" : "false"}
      data-overflow-x={overflow.x ? "true" : "false"}
      data-overflow-right={overflow.right ? "true" : "false"}
      data-overflow-left={overflow.left ? "true" : "false"}
    >
      <div ref={ref} className="scroll-region-viewport">
        {children}
      </div>
      <div className="scroll-region-fade scroll-region-fade-top" aria-hidden />
      <div className="scroll-region-fade scroll-region-fade-bottom" aria-hidden />
      <div className="scroll-region-fade scroll-region-fade-left" aria-hidden />
      <div className="scroll-region-fade scroll-region-fade-right" aria-hidden />
      {showHint ? (
        <p className="scroll-region-hint no-print" aria-hidden>
          {hintText}
        </p>
      ) : null}
    </div>
  );
}
