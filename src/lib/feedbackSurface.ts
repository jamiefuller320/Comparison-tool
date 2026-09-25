/**
 * Infer a coarse UI surface from the current path (for feedback triage).
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
