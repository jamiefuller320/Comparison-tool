async function main() {
  const {
    analyticsSupportsCustomEvents,
    resolveAnalyticsProvider,
  } = await import("../src/lib/analytics.ts");

  const saved = {
    NEXT_PUBLIC_ANALYTICS_PROVIDER: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
    NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN:
      process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_GOATCOUNTER_CODE: process.env.NEXT_PUBLIC_GOATCOUNTER_CODE,
  };

  try {
    delete process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
    delete process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    delete process.env.NEXT_PUBLIC_GOATCOUNTER_CODE;
    if (resolveAnalyticsProvider() !== null) {
      console.error("FAIL expected null provider with no env");
      process.exit(1);
    }

    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = "none";
    if (resolveAnalyticsProvider() !== null) {
      console.error("FAIL none should disable analytics");
      process.exit(1);
    }

    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = "cloudflare";
    process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN = "test-token";
    if (resolveAnalyticsProvider() !== "cloudflare") {
      console.error("FAIL cloudflare token should enable provider");
      process.exit(1);
    }
    if (analyticsSupportsCustomEvents("cloudflare")) {
      console.error("FAIL cloudflare should not support custom events");
      process.exit(1);
    }

    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = "plausible";
    delete process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "schoolcompass.uk";
    if (resolveAnalyticsProvider() !== "plausible") {
      console.error("FAIL plausible domain should enable provider");
      process.exit(1);
    }
    if (!analyticsSupportsCustomEvents("plausible")) {
      console.error("FAIL plausible should support custom events");
      process.exit(1);
    }

    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = "goatcounter";
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    process.env.NEXT_PUBLIC_GOATCOUNTER_CODE = "schoolcompass";
    if (resolveAnalyticsProvider() !== "goatcounter") {
      console.error("FAIL goatcounter code should enable provider");
      process.exit(1);
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  console.log("analytics helpers ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
