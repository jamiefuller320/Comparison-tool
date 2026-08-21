"use client";

import {
  printVisitPackElement,
  resolveVisitPackElement,
} from "@/lib/printVisitPack";
import { computePrintNoteHeightPx } from "@/lib/visitPack";
import { FEEDBACK_PRINTED_EVENT } from "@/lib/productFeedback";

export function PrintComparisonPackButton({
  disabled = false,
  packSelector = '[data-visit-pack="compare"]',
  className = "compare-action-btn",
}: {
  disabled?: boolean;
  packSelector?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      data-tour="print-comparison-pack"
      onClick={() => {
        const host = document.querySelector<HTMLElement>(packSelector);
        if (!host) return;
        // Prefer the nested .visit-pack so prep keeps advice, graphs, and
        // school-by-school sheets (wrapper-only clones printed blank on iPad).
        const pack = resolveVisitPackElement(host);
        printVisitPackElement(pack, computePrintNoteHeightPx(1));
        window.dispatchEvent(new Event(FEEDBACK_PRINTED_EVENT));
      }}
    >
      Print comparison pack
    </button>
  );
}
