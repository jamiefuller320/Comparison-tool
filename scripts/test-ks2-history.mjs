async function main() {
  const {
    historyShardKey,
    buildMetricHistoryPoints,
    seriesHasHistory,
  } = await import("../src/lib/ks2History.ts");
  const { hasYearSkip, withHalfWidthCovidGap, COVID_GAP_LABEL } = await import(
    "../src/lib/covid-gap.ts"
  );

  if (historyShardKey("116338") !== "38") {
    console.error("FAIL shard key", historyShardKey("116338"));
    process.exit(1);
  }
  if (historyShardKey("42") !== "42") {
    console.error("FAIL short shard", historyShardKey("42"));
    process.exit(1);
  }

  const meta = {
    generatedAt: "2026-07-24",
    periods: ["2018/2019", "2022/2023", "2023/2024"],
    metrics: ["rwmExpected"],
    england: { rwmExpected: [65, 60, 61] },
    schoolCount: 1,
    source: {
      name: "test",
      url: "https://example.test",
      note: "test",
      years: ["2018-2019", "2022-2023", "2023-2024"],
    },
  };
  const series = {
    "116338": { rwmExpected: [70, 68, 72] },
    "999999": null,
  };
  const points = buildMetricHistoryPoints(
    meta,
    "rwmExpected",
    series,
    ["116338", "999999"],
  );
  if (points.length !== 3 || points[0].england !== 65 || points[0]["116338"] !== 70) {
    console.error("FAIL build points", points);
    process.exit(1);
  }
  if (!seriesHasHistory(series["116338"], "rwmExpected")) {
    console.error("FAIL seriesHasHistory true");
    process.exit(1);
  }
  if (seriesHasHistory(series["999999"], "rwmExpected")) {
    console.error("FAIL seriesHasHistory false");
    process.exit(1);
  }

  if (!hasYearSkip("2018/19", "2022/23")) {
    console.error("FAIL covid skip detect");
    process.exit(1);
  }
  const { gapRange, tickLabels, rows } = withHalfWidthCovidGap(
    points.map((p) => ({ year: p.year, v: p.england })),
    () => ({ year: COVID_GAP_LABEL, v: null, gap: true }),
  );
  if (!gapRange || rows.length !== 4) {
    console.error("FAIL covid gap insert", { gapRange, rows });
    process.exit(1);
  }
  if (![...tickLabels.values()].includes(COVID_GAP_LABEL)) {
    console.error("FAIL covid tick label");
    process.exit(1);
  }

  console.log("ks2 history helpers ok");
}

main();
