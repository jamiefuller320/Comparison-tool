import assert from "node:assert/strict";

async function main() {
  const {
    CORE_AREA_LABELS,
    coverageLevel,
    parentParagraph,
    schoolHasQualitativeCapture,
    shortQualitativeSummary,
  } = await import("../src/lib/qualitativeEvidence.ts");

  assert.equal(CORE_AREA_LABELS.curriculum, "Curriculum");

  const area = {
    area: "enrichment",
    score: 55,
    confidence: 0.6,
    summary: "Clubs",
    themes: ["clubs"],
    offerings: ["football", "choir", "homework club"],
    narrativeSummary:
      "The school lists football and choir after school [1].",
    synthesisMethod: "llm",
    signals: [
      {
        text: "After-school clubs include football and choir.",
        sourceUrl: "https://example.test/clubs",
        sourceType: "school-website",
        capturedAt: "2026-08-05",
      },
    ],
  };

  const cov = coverageLevel(area);
  assert.equal(cov.id, "some");

  const paragraph = parentParagraph(area);
  assert.ok(paragraph.includes("[1]"));

  const school = {
    urn: "116338",
    name: "Test School",
    qualitativeCapture: {
      urn: "116338",
      name: "Test School",
      assessedAt: "2026-08-05",
      engineVersion: "0.6.0",
      sourcesScanned: 3,
      areas: [area],
    },
  };

  assert.equal(schoolHasQualitativeCapture(school), true);
  const summary = shortQualitativeSummary(school);
  assert.ok(summary?.includes("Enrichment"));

  console.log("OK qualitative evidence helpers");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
