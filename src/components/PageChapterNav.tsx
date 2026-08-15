"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BinderTabs, type BinderTabItem } from "@/components/BinderTabs";
import {
  HOME_SECTION_CHANGE_EVENT,
  scrollToHomeSection,
  stickyChromeOffsetPx,
} from "@/lib/inPageNav";

export type PageChapterId =
  | "setup"
  | "nearby"
  | "compare"
  | "side-by-side"
  | "how";

const CHAPTERS: BinderTabItem<PageChapterId>[] = [
  { id: "setup", label: "Setup", shortLabel: "Setup", step: 1 },
  { id: "nearby", label: "Near home", shortLabel: "Near home", step: 2 },
  { id: "compare", label: "Shortlist", shortLabel: "Shortlist", step: 3 },
  {
    id: "side-by-side",
    label: "Side by side",
    shortLabel: "Compare",
    step: 4,
  },
  { id: "how", label: "How to read", shortLabel: "How", step: 5 },
];

const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

function isChapterId(id: string): id is PageChapterId {
  return (CHAPTER_IDS as string[]).includes(id);
}

/**
 * Sticky binder chapter strip for the home journey. Scroll-spy keeps the
 * open tab in sync; clicks smooth-scroll without dropping query params.
 */
export function PageChapterNav() {
  const [activeId, setActiveId] = useState<PageChapterId>("setup");
  const ignoreSpyUntil = useRef(0);

  useEffect(() => {
    function onSectionChange(event: Event) {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id || !isChapterId(id)) return;
      setActiveId(id);
      // Smooth scroll takes a moment — don't let spy fight the intended tab.
      ignoreSpyUntil.current = Date.now() + 1200;
    }
    window.addEventListener(HOME_SECTION_CHANGE_EVENT, onSectionChange);
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && isChapterId(hash)) setActiveId(hash);
    return () => {
      window.removeEventListener(HOME_SECTION_CHANGE_EVENT, onSectionChange);
    };
  }, []);

  useEffect(() => {
    const nodes = CHAPTER_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!nodes.length) return;

    const visibility = new Map<string, number>();

    function topMarginPx() {
      return Math.max(64, stickyChromeOffsetPx("nearby"));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreSpyUntil.current) return;
        for (const entry of entries) {
          visibility.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }
        let bestId: PageChapterId = "setup";
        let bestRatio = -1;
        for (const id of CHAPTER_IDS) {
          const ratio = visibility.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestRatio > 0) setActiveId(bestId);
      },
      {
        rootMargin: `-${topMarginPx()}px 0px -45% 0px`,
        threshold: [0, 0.12, 0.28, 0.45, 0.65],
      },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const items = useMemo(() => CHAPTERS, []);

  return (
    <nav
      className="page-chapter-nav no-print"
      aria-label="Page chapters"
      data-tour="page-chapters"
    >
      <div className="shell page-chapter-nav-inner">
        <BinderTabs
          tone="paper"
          ariaLabel="Jump to a section"
          items={items}
          activeId={activeId}
          onChange={(id) => {
            setActiveId(id);
            ignoreSpyUntil.current = Date.now() + 1200;
            scrollToHomeSection(id);
          }}
        />
      </div>
    </nav>
  );
}
