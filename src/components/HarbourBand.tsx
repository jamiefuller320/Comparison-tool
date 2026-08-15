"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { JourneyChapterId } from "@/components/JourneyChapterContext";

const SLOT_ID = "harbour-setup-slot";
const BAND_ID = "harbour-band";

export const CHAPTER_STAGE: Record<JourneyChapterId, 0 | 1 | 2 | 3 | 4> = {
  setup: 0,
  nearby: 1,
  compare: 2,
  "side-by-side": 3,
  how: 4,
};

/** Resolve the server-rendered harbour journey slot after mount. */
export function useHarbourSetupSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(SLOT_ID));
  }, []);
  return slot;
}

/** Drive harbour-band chapter step so wash/tokens can ease between stages. */
export function useHarbourBandChapter(chapter: JourneyChapterId) {
  useEffect(() => {
    const band = document.getElementById(BAND_ID);
    if (!band) return;
    const step = CHAPTER_STAGE[chapter];
    band.setAttribute("data-chapter", chapter);
    band.setAttribute("data-chapter-step", String(step));
    band.setAttribute(
      "data-includes-setup",
      chapter === "setup" ? "true" : "false",
    );
  }, [chapter]);
}

/** @deprecated Prefer useHarbourBandChapter */
export function useHarbourBandSetupFlag(includesSetup: boolean) {
  useEffect(() => {
    const band = document.getElementById(BAND_ID);
    if (!band) return;
    band.setAttribute(
      "data-includes-setup",
      includesSetup ? "true" : "false",
    );
  }, [includesSetup]);
}

/** Portal journey chrome into the server-rendered harbour band slot. */
export function HarbourSetupPortal({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const slot = useHarbourSetupSlot();
  if (!active || !slot) return null;
  return createPortal(children, slot);
}

export const HARBOUR_SETUP_SLOT_ID = SLOT_ID;
export const HARBOUR_BAND_ID = BAND_ID;
