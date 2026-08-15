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

/** Height of sticky header (+ chapter strip when present). */
export function stickyChromeOffsetPx(sectionId?: string): number {
  if (typeof document === "undefined") return 0;
  const header = document.querySelector(".site-header");
  const headerH = header?.getBoundingClientRect().height ?? 0;
  const onlyHeader = sectionId === "setup" || sectionId === "top";
  if (onlyHeader) return Math.ceil(headerH);
  const chapters = document.querySelector(".page-chapter-nav");
  const chapterH = chapters?.getBoundingClientRect().height ?? 0;
  return Math.ceil(headerH + chapterH);
}

/**
 * Smooth-scroll to a home section without dropping query params.
 * Uses a measured sticky-chrome offset (more reliable on iOS than
 * scrollIntoView + scroll-margin alone) and notifies chapter nav.
 */
export function scrollToHomeSection(hash: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.replaceState({}, "", url.toString());
  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_CHANGE_EVENT, { detail: { id } }),
  );
  if (!el) return;

  const offset = stickyChromeOffsetPx(id);
  const y =
    el.getBoundingClientRect().top + window.scrollY - offset - 6;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}
