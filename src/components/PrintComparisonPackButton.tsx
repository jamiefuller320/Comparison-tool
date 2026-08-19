"use client";

import { printVisitPackElement } from "@/lib/printVisitPack";
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
        const pack = document.querySelector<HTMLElement>(packSelector);
        if (!pack) return;
        printVisitPackElement(pack, computePrintNoteHeightPx(1));
        window.dispatchEvent(new Event(FEEDBACK_PRINTED_EVENT));
      }}
    >
      Print comparison pack
    </button>
  );
}
