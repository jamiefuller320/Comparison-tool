"use client";

import type { ReactNode } from "react";
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
 * Single persistent journey frame (tabs + sheet) portaled into the harbour
 * band. Setup uses the compact shell as the left-edge datum; later chapters
 * expand right so chapter tabs keep the same absolute page position.
 */
export function JourneyStageFrame({ sheet }: { sheet: ReactNode }) {
  const { chapter } = useJourneyChapter();
  useHarbourBandChapter(chapter);
  const step = CHAPTER_STAGE[chapter];
  const anchorId = chapterAnchorId(chapter);

  return (
    <HarbourSetupPortal>
      <div
        className="journey-stage hero-controls"
        id="journey"
        data-chapter={chapter}
        data-chapter-step={step}
        data-tour={chapter === "setup" ? "setup" : undefined}
      >
        <div className="shell journey-stage-shell">
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
