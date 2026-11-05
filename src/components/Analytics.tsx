import Script from "next/script";
import { resolveAnalyticsProvider } from "@/lib/analytics";

/**
 * Privacy-friendly analytics — loads only when the chosen provider is configured
 * at build time (no token/domain/code → no snippet on local/PR builds).
 */
export function Analytics() {
  const provider = resolveAnalyticsProvider();
  if (!provider) return null;

  if (provider === "cloudflare") {
    const token = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();
    if (!token) return null;
    const beacon = JSON.stringify({ token, spa: true });
    return (
      <Script
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={beacon}
        strategy="afterInteractive"
      />
    );
  }

  if (provider === "plausible") {
    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
    if (!domain) return null;
    const scriptSrc =
      process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC?.trim() ||
      "https://plausible.io/js/script.js";
    return (
      <Script
        defer
        data-domain={domain}
        src={scriptSrc}
        strategy="afterInteractive"
      />
    );
  }

  const code = process.env.NEXT_PUBLIC_GOATCOUNTER_CODE?.trim();
  if (!code) return null;
  return (
    <Script
      async
      data-goatcounter={`https://${code}.goatcounter.com/count`}
      src="https://gc.zgo.at/count.js"
      strategy="afterInteractive"
    />
  );
}
