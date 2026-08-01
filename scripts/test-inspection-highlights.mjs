async function main() {
  const {
    inspectionHighlights,
    schoolHasInspectionPrecis,
    shortInspectionSummary,
  } = await import("../src/lib/inspectionHighlights.ts");

  const full = {
    urn: "1",
    name: "Test",
    inspectionPrecis:
      "Abbotswood Junior School continues to be a good school. There is enough evidence of improved performance.",
    inspectionQuotes: [
      {
        text: "Pupils feel safe and happy at school.",
        sourceUrl: "https://example.com/a.pdf",
      },
    ],
    inspectionStrengths: [
      {
        text: "The curriculum is ambitious and pupils achieve well.",
        sourceUrl: "https://example.com/a.pdf",
        section: "What the school does well",
      },
    ],
    inspectionImprovements: [
      {
        text: "Leaders should ensure early reading is practised more frequently.",
        sourceUrl: "https://example.com/a.pdf",
        section: "Areas for improvement",
      },
    ],
  };

  if (!schoolHasInspectionPrecis(full)) {
    console.error("FAIL has precis");
    process.exit(1);
  }
  const summary = shortInspectionSummary(full, 80);
  if (!summary || summary.length > 90) {
    console.error("FAIL summary length", summary);
    process.exit(1);
  }
  const hi = inspectionHighlights(full);
  if (hi.strengths.length !== 1 || hi.improvements.length !== 1) {
    console.error("FAIL highlight buckets", hi);
    process.exit(1);
  }

  const legacy = {
    urn: "2",
    name: "Legacy",
    inspectionPrecis: "A short legacy précis.",
    inspectionQuotes: [
      {
        text: "Pupils enjoy school life.",
        sourceUrl: "https://example.com/b.pdf",
      },
      {
        text: "Leaders need to improve challenge for the most able.",
        sourceUrl: "https://example.com/b.pdf",
      },
    ],
  };
  const derived = inspectionHighlights(legacy);
  if (!derived.strengths.length || !derived.improvements.length) {
    console.error("FAIL legacy derive", derived);
    process.exit(1);
  }

  console.log("OK inspection highlights");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
