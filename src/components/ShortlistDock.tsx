"use client";

import { ShareShortlistButton } from "@/components/ShareShortlistButton";

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
          <a className="btn btn-primary" href="/#side-by-side">
            Compare
          </a>
          <ShareShortlistButton
            schoolNames={schoolNames}
            className="btn btn-ghost"
            label="Share"
          />
          <a className="btn btn-ghost shortlist-dock-edit" href="/#compare">
            Edit
          </a>
        </div>
      </div>
    </div>
  );
}
