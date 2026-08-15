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
 * band so chapter switches ease colour/layout instead of remounting a new shell.
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
