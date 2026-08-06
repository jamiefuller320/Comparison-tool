async function main() {
  const { fetchWithRetry, mapPool, fetchJsonWithRetry } = await import(
    "../src/lib/resilientFetch.ts"
  );

  let attempts = 0;
  const flaky = async () => {
    attempts += 1;
    if (attempts < 3) {
      return new Response("nope", { status: 503 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = await fetchWithRetry(
    "https://example.test/data.json",
    { retries: 3, backoffMs: 1, timeoutMs: 5_000 },
    flaky,
  );
  if (!res.ok || attempts !== 3) {
    console.error("FAIL retry", res.status, attempts);
    process.exit(1);
  }

  attempts = 0;
  const soft = await fetchJsonWithRetry(
    "https://example.test/missing.json",
    { retries: 2, backoffMs: 1 },
    async () => new Response("missing", { status: 404 }),
  );
  if (soft.ok || soft.status !== 404) {
    console.error("FAIL soft 404", soft);
    process.exit(1);
  }

  const order = [];
  const pooled = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
    order.push(`start-${n}`);
    await new Promise((r) => setTimeout(r, 5));
    order.push(`end-${n}`);
    return n * 2;
  });
  if (pooled.join(",") !== "2,4,6,8,10") {
    console.error("FAIL mapPool results", pooled);
    process.exit(1);
  }
  // With concurrency 2, item 3 cannot start before one of 1/2 ends.
  const firstEnd = order.findIndex((x) => x.startsWith("end-"));
  if (firstEnd < 2) {
    console.error("FAIL mapPool concurrency", order);
    process.exit(1);
  }

  console.log("OK resilient fetch");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
