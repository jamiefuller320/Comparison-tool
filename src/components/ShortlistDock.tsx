"use client";

import { ShareShortlistButton } from "@/components/ShareShortlistButton";
import { scrollToHomeSection } from "@/lib/inPageNav";

/** Sticky bottom dock: shortlist count + Compare + Share. */
export function ShortlistDock({
  count,
  schoolNames,
}: {
  count: number;
  schoolNames: string[];
}) {
  if (count <= 0) return null;

  const label =
    count === 1 ? "1 school on your shortlist" : `${count} schools on your shortlist`;

  return (
    <div
      className="shortlist-dock no-print"
      role="region"
      aria-label="Shortlist actions"
      data-tour="shortlist-dock"
    >
      <div className="shortlist-dock-inner">
        <p className="shortlist-dock-count">{label}</p>
        <div className="shortlist-dock-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => scrollToHomeSection("side-by-side")}
          >
            Compare
          </button>
          <ShareShortlistButton
            schoolNames={schoolNames}
            className="btn btn-ghost"
            label="Share"
          />
          <button
            type="button"
            className="btn btn-ghost shortlist-dock-edit"
            onClick={() => scrollToHomeSection("compare")}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
