/** In-page home navigation that keeps ?schools=&stages= query state. */

export const HOME_SECTION_CHANGE_EVENT = "schoolcompass:home-section";

export function isHomePath(pathname?: string): boolean {
  const path =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  if (path === "/" || path === "") return true;
  // Legacy GitHub Pages project path
  return /\/Comparison-tool\/?$/.test(path);
}

/** Build an href that preserves the current search string when already on home. */
export function homeSectionHref(hash: string, search?: string): string {
  const clean = hash.replace(/^#/, "");
  const q =
    search ??
    (typeof window !== "undefined" ? window.location.search : "");
  if (typeof window !== "undefined" && isHomePath()) {
    return `${window.location.pathname}${q}#${clean}`;
  }
  return `/#${clean}`;
}

/** Height of sticky header (+ journey chrome when present). */
export function stickyChromeOffsetPx(sectionId?: string): number {
  if (typeof document === "undefined") return 0;
  const header = document.querySelector(".site-header");
  const headerH = header?.getBoundingClientRect().height ?? 0;
  const toolbar =
    document.querySelector(".journey-chapter-binder .binder-rail") ||
    document.querySelector(".journey-toolbar-wrap") ||
    document.querySelector(".journey-toolbar") ||
    document.querySelector(".page-chapter-nav");
  const toolbarH = toolbar?.getBoundingClientRect().height ?? 0;
  let nestedH = 0;
  const nestedTabs = document.querySelector(
    ".compare-section-binder > .binder-tabs",
  );
  if (nestedTabs instanceof HTMLElement) {
    const nestedBinder = nestedTabs.closest(".binder");
    if (nestedBinder?.getAttribute("data-stuck") === "true") {
      nestedH = nestedTabs.getBoundingClientRect().height;
    }
  }
  // Setup sits under the toolbar; still need both when the toolbar is sticky.
  void sectionId;
  return Math.ceil(headerH + toolbarH + nestedH);
}

/**
 * Smooth-scroll to a home section without dropping query params.
 * Uses a measured sticky-chrome offset (more reliable on iOS than
 * scrollIntoView + scroll-margin alone) and notifies chapter nav.
 * Retries briefly so peer chapter panels can mount after a tab change.
 */
export function scrollToHomeSection(hash: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const id = hash.replace(/^#/, "");
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.replaceState({}, "", url.toString());
  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_CHANGE_EVENT, { detail: { id } }),
  );

  // Data lives inside Understand; scroll to the how chapter anchor.
  const scrollId = id === "data" ? "how" : id;

  function tryScroll(attemptsLeft: number) {
    const el =
      document.getElementById(scrollId) ||
      document.getElementById("journey") ||
      document.getElementById("setup");
    if (!el) {
      if (attemptsLeft > 0) {
        window.requestAnimationFrame(() => tryScroll(attemptsLeft - 1));
      }
      return;
    }
    const offset = stickyChromeOffsetPx(scrollId);
    const y =
      el.getBoundingClientRect().top + window.scrollY - offset - 6;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  window.requestAnimationFrame(() => tryScroll(12));
}
