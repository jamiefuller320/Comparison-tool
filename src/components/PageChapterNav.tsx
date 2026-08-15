"use client";

import { useMemo } from "react";
import { BinderTabs, type BinderTabItem } from "@/components/BinderTabs";
import {
  useJourneyChapter,
  type JourneyChapterId,
} from "@/components/JourneyChapterContext";

const CHAPTERS: BinderTabItem<JourneyChapterId>[] = [
  { id: "setup", label: "Setup", shortLabel: "Setup", step: 1 },
  { id: "nearby", label: "Finder", shortLabel: "Finder", step: 2 },
  { id: "compare", label: "Shortlist", shortLabel: "Shortlist", step: 3 },
  {
    id: "side-by-side",
    label: "Side by side",
    shortLabel: "Compare",
    step: 4,
  },
  { id: "how", label: "How to read", shortLabel: "How", step: 5 },
];

/**
 * Chapter tabs for the home journey — sits on the How-to-use toolbar so
 * Setup is one peer page among Finder / Shortlist / Compare / How.
 */
export function PageChapterNav({
  tone = "harbour",
}: {
  tone?: "harbour" | "paper";
}) {
  const { chapter, setChapter } = useJourneyChapter();
  const items = useMemo(() => CHAPTERS, []);

  return (
    <nav
      className="page-chapter-nav page-chapter-nav-toolbar"
      aria-label="Page chapters"
      data-tour="page-chapters"
    >
      <BinderTabs
        tone={tone}
        ariaLabel="Jump to a section"
        items={items}
        activeId={chapter}
        onChange={setChapter}
      />
    </nav>
  );
}
