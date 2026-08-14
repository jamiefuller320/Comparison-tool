/** Share / copy helpers for shortlist comparison URLs. */

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export type ShareComparisonResult = "shared" | "copied" | "failed";

export function buildComparisonShareUrl(options?: {
  href?: string;
  hash?: string;
}): string {
  const href =
    options?.href ??
    (typeof window !== "undefined" ? window.location.href : "");
  if (!href) return "";
  try {
    const url = new URL(href);
    if (options?.hash) {
      url.hash = options.hash.replace(/^#/, "");
    }
    return url.toString();
  } catch {
    return href;
  }
}

export function buildComparisonShareText(schoolNames: string[]): string {
  const names = schoolNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) {
    return `${BRAND_NAME} — ${BRAND_TAGLINE}`;
  }
  if (names.length === 1) {
    return `Have a look at ${names[0]} on ${BRAND_NAME}.`;
  }
  if (names.length === 2) {
    return `Comparing ${names[0]} and ${names[1]} on ${BRAND_NAME}.`;
  }
  const head = names.slice(0, -1).join(", ");
  const last = names[names.length - 1];
  return `Comparing ${head}, and ${last} on ${BRAND_NAME}.`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Prefer the OS share sheet on supporting devices; otherwise copy the URL.
 */
export async function shareOrCopyComparison(options: {
  schoolNames: string[];
  href?: string;
  hash?: string;
}): Promise<ShareComparisonResult> {
  const url = buildComparisonShareUrl({
    href: options.href,
    hash: options.hash,
  });
  if (!url) return "failed";

  const title = BRAND_NAME;
  const text = buildComparisonShareText(options.schoolNames);

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      // User dismissed the sheet — not a failure worth copying over.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "failed";
      }
    }
  }

  const copied = await copyText(url);
  return copied ? "copied" : "failed";
}
