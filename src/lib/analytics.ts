/**
 * Cookieless site analytics — configured at build time via NEXT_PUBLIC_* env vars.
 * Custom events are sent only for Plausible and GoatCounter (Cloudflare is pageviews only).
 */

export type AnalyticsProvider = "cloudflare" | "plausible" | "goatcounter";

export type AnalyticsEventName =
  | "Shortlist Add"
  | "Compare View"
  | "Visit Pack Print"
  | "Feedback Submit";

const GOATCOUNTER_EVENT_PATH: Record<AnalyticsEventName, string> = {
  "Shortlist Add": "/event/shortlist-add",
  "Compare View": "/event/compare-view",
  "Visit Pack Print": "/event/visit-pack-print",
  "Feedback Submit": "/event/feedback-submit",
};

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** Resolved provider id, or null when analytics is off or misconfigured. */
export function resolveAnalyticsProvider(): AnalyticsProvider | null {
  const raw = trimEnv(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER).toLowerCase();
  if (raw === "none" || raw === "off" || raw === "false" || raw === "0") {
    return null;
  }

  const provider: AnalyticsProvider =
    raw === "plausible" || raw === "goatcounter" ? raw : "cloudflare";

  if (provider === "cloudflare") {
    return trimEnv(process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN)
      ? "cloudflare"
      : null;
  }
  if (provider === "plausible") {
    return trimEnv(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) ? "plausible" : null;
  }
  if (provider === "goatcounter") {
    return trimEnv(process.env.NEXT_PUBLIC_GOATCOUNTER_CODE) ? "goatcounter" : null;
  }
  return null;
}

export function analyticsSupportsCustomEvents(
  provider: AnalyticsProvider | null = resolveAnalyticsProvider(),
): boolean {
  return provider === "plausible" || provider === "goatcounter";
}

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
    goatcounter?: {
      count: (args: { path: string; event?: boolean; title?: string }) => void;
    };
  }
}

/** Fire a custom event when the active provider supports it. No personal data. */
export function trackAnalyticsEvent(name: AnalyticsEventName): void {
  if (typeof window === "undefined") return;

  const provider = trimEnv(
    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
  ).toLowerCase();
  const effective: AnalyticsProvider | null =
    provider === "none" || provider === "off" || provider === "false"
      ? null
      : provider === "plausible" || provider === "goatcounter"
        ? provider
        : trimEnv(process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN)
          ? "cloudflare"
          : null;

  if (effective === "plausible") {
    if (!trimEnv(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN)) return;
    window.plausible?.(name);
    return;
  }
  if (effective === "goatcounter") {
    if (!trimEnv(process.env.NEXT_PUBLIC_GOATCOUNTER_CODE)) return;
    window.goatcounter?.count({
      path: GOATCOUNTER_EVENT_PATH[name],
      event: true,
      title: name,
    });
  }
}
