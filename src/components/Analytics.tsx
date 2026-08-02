import Script from "next/script";

/**
 * Privacy-friendly analytics (Plausible) — only loads when
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set at build time.
 */
export function Analytics() {
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
