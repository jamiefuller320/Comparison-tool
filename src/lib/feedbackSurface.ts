/**
 * Infer a coarse UI surface from the current path (for feedback triage).
 * Also lists known chapters/routes for the “which page” picker.
 */

export type FeedbackSurface =
  | "find"
  | "compare"
  | "visit-pack"
  | "account"
  | "feedback-page"
  | "areas"
  | "guides"
  | "school"
  | "home"
  | "other";

export type FeedbackPageOption = {
  /** Path (+ optional hash) identifying the page / chapter. */
  path: string;
  label: string;
  surface: FeedbackSurface;
};

/** Known home chapters and top-level routes for the page picker. */
export const FEEDBACK_PAGE_OPTIONS: FeedbackPageOption[] = [
  { path: "/", label: "Home", surface: "home" },
  { path: "/#nearby", label: "Find (map / nearby)", surface: "find" },
  { path: "/#compare", label: "Shortlist", surface: "compare" },
  {
    path: "/#side-by-side",
    label: "Side by side / visit pack",
    surface: "compare",
  },
  { path: "/#how", label: "Understand", surface: "home" },
  { path: "/areas/", label: "Areas", surface: "areas" },
  { path: "/guides/", label: "Guides", surface: "guides" },
  { path: "/feedback/", label: "Feedback page", surface: "feedback-page" },
];

export function normalizeFeedbackPagePath(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "/";
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      return `${u.pathname}${u.hash}` || "/";
    }
  } catch {
    /* fall through */
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const hashIdx = withSlash.indexOf("#");
  const path = (hashIdx >= 0 ? withSlash.slice(0, hashIdx) : withSlash) || "/";
  const hash = hashIdx >= 0 ? withSlash.slice(hashIdx + 1) : "";
  return hash ? `${path}#${hash}` : path;
}

export function inferFeedbackSurface(
  pathname?: string | null,
  hash?: string | null,
): FeedbackSurface {
  const path = (pathname || "").replace(/\/+$/, "") || "/";
  const h = (hash || "").replace(/^#/, "");

  if (path === "/feedback" || path.endsWith("/feedback")) return "feedback-page";
  if (path.startsWith("/guides")) return "guides";
  if (path.startsWith("/areas")) return "areas";
  if (path.startsWith("/schools")) return "school";
  if (path.startsWith("/account") || path.startsWith("/lab")) {
    return path.startsWith("/account") ? "account" : "other";
  }

  if (h === "compare" || h === "shortlist") return "compare";
  if (h === "side-by-side") return "compare";
  if (h === "nearby" || h === "find") return "find";
  if (h === "visit" || h === "visit-pack") return "visit-pack";

  if (path === "/" || path === "") {
    if (!h || h === "top") return "home";
    return "home";
  }

  return "other";
}

export function surfaceFromFeedbackPagePath(pagePath: string): FeedbackSurface {
  const normalized = normalizeFeedbackPagePath(pagePath);
  const hashIdx = normalized.indexOf("#");
  const pathname = hashIdx >= 0 ? normalized.slice(0, hashIdx) : normalized;
  const hash = hashIdx >= 0 ? normalized.slice(hashIdx + 1) : "";
  return inferFeedbackSurface(pathname, hash);
}

/** Capture the page the user was on when opening feedback. */
export function captureOriginFeedbackPage(href?: string): {
  path: string;
  surface: FeedbackSurface;
} {
  if (typeof window === "undefined" && !href) {
    return { path: "/", surface: "home" };
  }
  try {
    const u = new URL(href || window.location.href, "https://schoolcompass.uk");
    const path = normalizeFeedbackPagePath(`${u.pathname}${u.hash}`);
    return {
      path,
      surface: inferFeedbackSurface(u.pathname, u.hash),
    };
  } catch {
    return { path: "/", surface: "home" };
  }
}

/**
 * Build select options: known chapters/routes, plus the origin page when it
 * is not already in the list (e.g. a school SEO page or area slug).
 */
export function feedbackPageSelectOptions(
  originPath?: string | null,
): FeedbackPageOption[] {
  const options = [...FEEDBACK_PAGE_OPTIONS];
  const origin = originPath ? normalizeFeedbackPagePath(originPath) : "";
  if (!origin) return options;
  const known = new Set(
    options.map((o) => normalizeFeedbackPagePath(o.path)),
  );
  if (!known.has(origin)) {
    options.unshift({
      path: origin,
      label: `This page (${origin})`,
      surface: surfaceFromFeedbackPagePath(origin),
    });
  }
  return options;
}

export function resolveFeedbackPageOption(
  pagePath: string,
  originPath?: string | null,
): FeedbackPageOption {
  const normalized = normalizeFeedbackPagePath(pagePath);
  const match = feedbackPageSelectOptions(originPath).find(
    (o) => normalizeFeedbackPagePath(o.path) === normalized,
  );
  if (match) return match;
  return {
    path: normalized,
    label: `This page (${normalized})`,
    surface: surfaceFromFeedbackPagePath(normalized),
  };
}

export function feedbackPageHref(opts?: {
  surface?: string;
  page?: string;
}): string {
  const params = new URLSearchParams();
  if (opts?.surface) params.set("surface", opts.surface);
  if (opts?.page) params.set("page", opts.page);
  const q = params.toString();
  return q ? `/feedback/?${q}` : "/feedback/";
}

/** Absolute page URL for intake (origin + selected path). */
export function feedbackPageUrlForSubmit(pagePath: string): string {
  const normalized = normalizeFeedbackPagePath(pagePath);
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  return normalized;
}
