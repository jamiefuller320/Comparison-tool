async function main() {
  const {
    contentIngestAt,
    filterAndSortReviewSchools,
    looksLikePrecisJunk,
  } = await import("../src/lib/contentReview.ts");

  const older = {
    urn: "1",
    name: "Alpha School",
    inspectionPrecis: "Pupils enjoy reading every day.",
    inspectionPrecisEnrichedAt: "2026-07-01",
  };
  const newer = {
    urn: "2",
    name: "Beta College",
    inspectionPrecis: "Leaders have high expectations.",
    inspectionPrecisEnrichedAt: "2026-07-10",
    qualitativeCaptureEnrichedAt: "2026-08-05",
    qualitativeCapture: {
      urn: "2",
      name: "Beta College",
      assessedAt: "2026-08-05",
      engineVersion: "test",
      sourcesScanned: 3,
      areas: [
        {
          area: "curriculum",
          score: 80,
          confidence: 0.7,
          summary: "ok",
          themes: [],
          offerings: ["maths"],
          signals: [],
        },
      ],
    },
  };
  const junk = {
    urn: "3",
    name: "Chrome Academy",
    inspectionPrecis:
      "How can I feed back my views? You can use Ofsted Parent View to give Ofsted your opinion.",
    inspectionPrecisEnrichedAt: "2026-08-01",
  };

  if (contentIngestAt(newer) !== "2026-08-05") {
    console.error("FAIL ingest max", contentIngestAt(newer));
    process.exit(1);
  }
  if (!looksLikePrecisJunk(junk.inspectionPrecis)) {
    console.error("FAIL junk detect");
    process.exit(1);
  }
  if (looksLikePrecisJunk(older.inspectionPrecis)) {
    console.error("FAIL false junk");
    process.exit(1);
  }

  const byIngest = filterAndSortReviewSchools([older, newer, junk], {
    filter: "any",
    sort: "ingest-desc",
  });
  if (byIngest.map((s) => s.urn).join(",") !== "2,3,1") {
    console.error(
      "FAIL ingest-desc order",
      byIngest.map((s) => s.urn),
    );
    process.exit(1);
  }

  const both = filterAndSortReviewSchools([older, newer, junk], {
    filter: "both",
  });
  if (both.length !== 1 || both[0].urn !== "2") {
    console.error("FAIL both filter", both);
    process.exit(1);
  }

  const junkOnly = filterAndSortReviewSchools([older, newer, junk], {
    filter: "junk",
  });
  if (junkOnly.length !== 1 || junkOnly[0].urn !== "3") {
    console.error("FAIL junk filter", junkOnly);
    process.exit(1);
  }

  const q = filterAndSortReviewSchools([older, newer, junk], {
    filter: "any",
    query: "beta",
  });
  if (q.length !== 1 || q[0].urn !== "2") {
    console.error("FAIL query", q);
    process.exit(1);
  }

  console.log("OK content review");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
