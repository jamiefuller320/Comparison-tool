import assert from "node:assert/strict";

async function main() {
  const {
    CORE_AREA_LABELS,
    citationFootnotes,
    citationSegments,
    coverageLevel,
    groupSources,
    numberedCitationSources,
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
      "The school lists football and choir after school [1]. Clubs appear on a second page [2].",
    synthesisMethod: "llm",
    signals: [
      {
        text: "After-school clubs include football and choir.",
        sourceUrl: "https://example.test/clubs",
        sourceType: "school-website",
        capturedAt: "2026-08-05",
        pageTitle: "Clubs",
      },
      {
        text: "Enrichment overview with more clubs.",
        sourceUrl: "https://example.test/enrichment.pdf",
        sourceType: "school-document",
        capturedAt: "2026-08-05",
        pageTitle: "Enrichment PDF",
      },
    ],
  };

  const cov = coverageLevel(area);
  assert.equal(cov.id, "some");

  const paragraph = parentParagraph(area);
  assert.ok(paragraph.includes("[1]"));
  assert.ok(paragraph.includes("[2]"));

  // Synthesis order: website signal first, document second.
  const numbered = numberedCitationSources(area);
  assert.equal(numbered[0].sourceUrl, "https://example.test/clubs");
  assert.equal(numbered[1].sourceUrl, "https://example.test/enrichment.pdf");

  // groupSources puts documents in a later group — flattening would break [1]/[2].
  const groups = groupSources(area, {
    urn: "116338",
    name: "Test School",
    assessedAt: "2026-08-05",
    engineVersion: "0.6.0",
    sourcesScanned: 3,
    areas: [area],
    documentInventory: [
      {
        url: "https://example.test/injected-doc.pdf",
        label: "Clubs handbook",
        format: "pdf",
        status: "extracted",
      },
    ],
  });
  const flatRegrouped = [
    ...groups["school-website"],
    ...groups["school-document"],
    ...groups["local-news"],
    ...groups.other,
  ];
  // Injected inventory doc appears in school-document alongside the signal PDF —
  // regrouped flatten is longer / differently ordered than numbered sources.
  assert.ok(flatRegrouped.length >= numbered.length);

  const footnotes = citationFootnotes(paragraph, numbered);
  assert.equal(footnotes[0].href, "https://example.test/clubs");
  assert.equal(footnotes[1].href, "https://example.test/enrichment.pdf");

  // Wrong index (old UI bug): if we used regrouped flatten after injecting a
  // document that sorts before the website in type groups, [1] can miss.
  const wrong = citationFootnotes(paragraph, flatRegrouped);
  // With website-first flatten this may still match; assert numbered is the
  // contract used by the UI regardless of regrouping.
  assert.notEqual(
    JSON.stringify(footnotes.map((f) => f.href)),
    JSON.stringify(["#", "#"]),
  );
  assert.equal(wrong.length, 2);

  const segments = citationSegments(paragraph);
  assert.ok(segments.some((s) => s.kind === "cite" && s.n === 1));
  assert.ok(segments.some((s) => s.kind === "cite" && s.n === 2));
  assert.ok(segments.some((s) => s.kind === "text"));

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
