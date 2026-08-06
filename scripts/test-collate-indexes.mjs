async function main() {
  const { mergePacksIntoIndexes, PACK_FETCH_CONCURRENCY } = await import(
    "../src/lib/collateIndexes.ts"
  );

  if (PACK_FETCH_CONCURRENCY < 1) {
    console.error("FAIL concurrency");
    process.exit(1);
  }

  const seed = {
    schools: {
      generatedAt: "2026-08-06",
      period: "2024/2025",
      source: { api: "x", datasets: {}, primarySite: "y", note: "seed." },
      benchmarks: {
        england: { rwmExpected: 60 },
        localAuthorities: {},
      },
      schools: [
        {
          urn: "1",
          name: "Seed Primary",
          localAuthority: "Hampshire",
          rwmExpected: 70,
        },
      ],
      stats: { schoolCount: 1 },
    },
    ey: null,
    childminders: null,
  };

  const ready = [
    { localAuthority: "Surrey", slug: "surrey", status: "ready" },
    { localAuthority: "Kent", slug: "kent", status: "ready" },
  ];

  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    if (String(url).includes("/surrey/")) {
      return new Response(
        JSON.stringify({
          generatedAt: "2026-08-06",
          period: "2024/2025",
          source: { api: "x", datasets: {}, primarySite: "y", note: "pack." },
          benchmarks: { england: { rwmExpected: 60 }, localAuthorities: {} },
          schools: [
            {
              urn: "2",
              name: "Surrey Primary",
              localAuthority: "Surrey",
              rwmExpected: 65,
            },
          ],
          stats: { schoolCount: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    // Kent flaky — soft-fail must not throw
    return new Response("nope", { status: 503 });
  };

  const merged = await mergePacksIntoIndexes(seed, ready, fetchImpl, false);
  if (merged.schools.schools.length !== 2) {
    console.error(
      "FAIL merge soft pack",
      merged.schools.schools.map((s) => s.urn),
    );
    process.exit(1);
  }
  if (merged.packsLoaded < 1 || merged.packsFailed < 1) {
    console.error("FAIL pack counters", merged.packsLoaded, merged.packsFailed);
    process.exit(1);
  }

  console.log("OK collate indexes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
