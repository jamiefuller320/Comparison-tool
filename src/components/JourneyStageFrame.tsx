"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { PageChapterNav } from "@/components/PageChapterNav";
import {
  useJourneyChapter,
  type JourneyChapterId,
} from "@/components/JourneyChapterContext";
import {
  CHAPTER_STAGE,
  HarbourSetupPortal,
  useHarbourBandChapter,
} from "@/components/HarbourBand";

/**
 * Persistent journey frame. Setup uses the compact centered shell and captures
 * the tab rail’s real page position; later chapters use a full centered frame
 * while the rail is shifted so tabs stay on that Setup datum.
 */
export function JourneyStageFrame({ sheet }: { sheet: ReactNode }) {
  const { chapter } = useJourneyChapter();
  useHarbourBandChapter(chapter);
  const step = CHAPTER_STAGE[chapter];
  const anchorId = chapterAnchorId(chapter);
  const shellRef = useRef<HTMLDivElement>(null);
  /** Tab rail left edge relative to `.journey-stage` (Setup capture). */
  const tabDatumInStageRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const stageEl =
      shell.closest<HTMLElement>(".journey-stage") ?? shell.parentElement;
    if (!stageEl) return;

    function syncTabDatum() {
      const rail = shell.querySelector(".journey-chapter-binder .binder-rail");
      if (!(rail instanceof HTMLElement)) return;

      const stageBox = stageEl.getBoundingClientRect();
      const railBox = rail.getBoundingClientRect();
      const shellBox = shell.getBoundingClientRect();

      if (chapter === "setup") {
        tabDatumInStageRef.current = Math.round(railBox.left - stageBox.left);
        rail.style.marginLeft = "0px";
        stageEl.dataset.tabDatum = String(tabDatumInStageRef.current);
        return;
      }

      let datum = tabDatumInStageRef.current;
      if (datum == null) {
        // Deep-link / first paint off Setup: approximate Setup-centered rail.
        datum = Math.round((stageBox.width - railBox.width) / 2);
        tabDatumInStageRef.current = datum;
      }

      const shellLeftInStage = Math.round(shellBox.left - stageBox.left);
      const shift = Math.round(datum - shellLeftInStage);
      rail.style.marginLeft = `${Math.max(0, shift)}px`;
    }

    syncTabDatum();
    // Seam gap + sticky rail need a second pass after margin settles.
    const raf = requestAnimationFrame(syncTabDatum);

    const observer = new ResizeObserver(() => syncTabDatum());
    observer.observe(stageEl);
    observer.observe(shell);
    window.addEventListener("resize", syncTabDatum);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", syncTabDatum);
    };
  }, [chapter]);

  return (
    <HarbourSetupPortal>
      <div
        className="journey-stage hero-controls"
        id="journey"
        data-chapter={chapter}
        data-chapter-step={step}
        data-tour={chapter === "setup" ? "setup" : undefined}
      >
        <div ref={shellRef} className="shell journey-stage-shell">
          {/* Stable hash targets for in-page / tour navigation */}
          <div id={anchorId} className="journey-stage-anchor" />
          <PageChapterNav sheet={sheet} />
        </div>
      </div>
    </HarbourSetupPortal>
  );
}

function chapterAnchorId(chapter: JourneyChapterId): string {
  return chapter === "setup" ? "setup" : chapter;
}
