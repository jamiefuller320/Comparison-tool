"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  HOME_SECTION_CHANGE_EVENT,
  scrollToHomeSection,
} from "@/lib/inPageNav";

export type JourneyChapterId =
  | "setup"
  | "nearby"
  | "compare"
  | "side-by-side"
  | "how";

const CHAPTER_IDS: JourneyChapterId[] = [
  "setup",
  "nearby",
  "compare",
  "side-by-side",
  "how",
];

function isChapterId(id: string): id is JourneyChapterId {
  return (CHAPTER_IDS as string[]).includes(id);
}

/** Map product-tour targets onto journey peer pages. */
export const TOUR_TARGET_CHAPTER: Record<string, JourneyChapterId> = {
  hero: "setup",
  "page-chapters": "setup",
  "hero-tiles": "setup",
  postcode: "setup",
  stages: "setup",
  sector: "setup",
  provision: "setup",
  nearby: "nearby",
  radius: "nearby",
  search: "compare",
  shortlist: "compare",
  "shortlist-dock": "compare",
  boards: "side-by-side",
  "boards-early-years": "side-by-side",
  "compare-paths": "side-by-side",
  "compare-sections": "side-by-side",
  childminders: "side-by-side",
  "decision-guidance": "side-by-side",
  "visit-pack": "side-by-side",
  "year-trend": "side-by-side",
  how: "how",
  data: "how",
};

type SetChapterOptions = {
  /** Default true — skip when the product tour drives chapter changes. */
  scroll?: boolean;
};

type JourneyChapterContextValue = {
  chapter: JourneyChapterId;
  setChapter: (id: JourneyChapterId, options?: SetChapterOptions) => void;
};

const JourneyChapterContext = createContext<JourneyChapterContextValue | null>(
  null,
);

export function JourneyChapterProvider({ children }: { children: ReactNode }) {
  const [chapter, setChapterState] = useState<JourneyChapterId>("setup");

  const setChapter = useCallback(
    (id: JourneyChapterId, options?: SetChapterOptions) => {
      setChapterState(id);
      if (options?.scroll === false) {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        url.hash = id === "setup" ? "setup" : id;
        window.history.replaceState({}, "", url.toString());
        return;
      }
      scrollToHomeSection(id === "setup" ? "setup" : id);
    },
    [],
  );

  useEffect(() => {
    function onSection(event: Event) {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      if (id === "data") {
        setChapterState("how");
        return;
      }
      if (isChapterId(id)) setChapterState(id);
    }
    window.addEventListener(HOME_SECTION_CHANGE_EVENT, onSection);
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "data") setChapterState("how");
    else if (hash && isChapterId(hash)) setChapterState(hash);
    return () => window.removeEventListener(HOME_SECTION_CHANGE_EVENT, onSection);
  }, []);

  const value = useMemo(
    () => ({ chapter, setChapter }),
    [chapter, setChapter],
  );

  return (
    <JourneyChapterContext.Provider value={value}>
      {children}
    </JourneyChapterContext.Provider>
  );
}

export function useJourneyChapter(): JourneyChapterContextValue {
  const ctx = useContext(JourneyChapterContext);
  if (!ctx) {
    throw new Error("useJourneyChapter requires JourneyChapterProvider");
  }
  return ctx;
}

export function useJourneyChapterOptional(): JourneyChapterContextValue | null {
  return useContext(JourneyChapterContext);
}
