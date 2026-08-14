/** In-page home navigation that keeps ?schools=&stages= query state. */

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

/** Smooth-scroll to a home section without dropping query params. */
export function scrollToHomeSection(hash: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.replaceState({}, "", url.toString());
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
