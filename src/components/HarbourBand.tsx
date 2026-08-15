"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SLOT_ID = "harbour-setup-slot";
const BAND_ID = "harbour-band";

/** Resolve the server-rendered harbour setup slot after mount. */
export function useHarbourSetupSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(SLOT_ID));
  }, []);
  return slot;
}

/** Keep harbour-band data-includes-setup in sync with the active chapter. */
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

/** Portal journey/setup chrome into the server-rendered harbour band slot. */
export function HarbourSetupPortal({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  const slot = useHarbourSetupSlot();
  if (!active || !slot) return null;
  return createPortal(children, slot);
}

export const HARBOUR_SETUP_SLOT_ID = SLOT_ID;
export const HARBOUR_BAND_ID = BAND_ID;
