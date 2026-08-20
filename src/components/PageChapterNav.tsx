"use client";

import { useMemo, type ReactNode } from "react";
import { BinderTabs, type BinderTabItem } from "@/components/BinderTabs";
import {
  useJourneyChapter,
  type JourneyChapterId,
} from "@/components/JourneyChapterContext";
import { CHAPTER_STAGE } from "@/components/HarbourBand";
import { requestTourStart } from "@/lib/tour";

const CHAPTERS: BinderTabItem<JourneyChapterId>[] = [
  { id: "setup", label: "Setup", shortLabel: "Setup", step: 1 },
  { id: "nearby", label: "Find", shortLabel: "Find", step: 2 },
  { id: "compare", label: "Shortlist", shortLabel: "Shortlist", step: 3 },
  {
    id: "side-by-side",
    label: "Side by side",
    shortLabel: "Compare",
    step: 4,
  },
  { id: "how", label: "Understand", shortLabel: "Understand", step: 5 },
];

/**
 * Journey chapter binder — How to use + chapter tabs, with the active chapter
 * as an attached sheet. Colour eases with harbour-band[data-chapter-step].
 */
export function PageChapterNav({ sheet }: { sheet?: ReactNode }) {
  const { chapter, setChapter } = useJourneyChapter();
  const items = useMemo(() => CHAPTERS, []);
  const step = CHAPTER_STAGE[chapter];

  return (
    <nav
      className="page-chapter-nav page-chapter-nav-binder no-print"
      aria-label="Page chapters"
      data-tour="page-chapters"
      data-chapter={chapter}
      data-chapter-step={step}
    >
      <BinderTabs
        className="journey-chapter-binder"
        tone="harbour"
        ariaLabel="Jump to a section"
        items={items}
        activeId={chapter}
        onChange={setChapter}
        sheet={sheet}
        leading={
          <button
            type="button"
            className="btn btn-ghost journey-tour-btn"
            onClick={() => requestTourStart()}
          >
            How to use
          </button>
        }
      />
    </nav>
  );
}
