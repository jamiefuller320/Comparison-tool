import assert from "node:assert/strict";

const {
  isBoilerplateQualitativeText,
  isPublishableQualitativeArea,
  publishableQualitativeThemes,
} = await import("../src/lib/seoQualitative.ts");

assert.equal(isBoilerplateQualitativeText("We did not find much about send."), true);
assert.equal(
  isBoilerplateQualitativeText(
    "The school website lists art, computing, geography, mathematics.",
  ),
  true,
);
assert.equal(
  isBoilerplateQualitativeText(
    "As a Rights Respecting school our curriculum is underpinned by the Unicef Charter for the Rights of the Child and our School Learning Values of Independence.",
  ),
  false,
);

const thinArea = {
  area: "send",
  score: 10,
  confidence: 0.1,
  signals: [],
  narrativeSummary: "We did not find much about send.",
};
assert.equal(isPublishableQualitativeArea(thinArea), false);

const goodArea = {
  area: "ethos",
  score: 70,
  confidence: 0.71,
  signals: [
    {
      text:
        "As a Rights Respecting school our curriculum is underpinned by the Unicef Charter for the Rights of the Child and our School Learning Values.",
      sourceUrl: "https://example.sch.uk/ethos",
      sourceType: "school-website",
      capturedAt: "2026-08-18",
    },
  ],
  narrativeSummary:
    "As a Rights Respecting school our curriculum is underpinned by the Unicef Charter for the Rights of the Child and our School Learning Values of Independence, Resilience, Respect, Creativity, Team-work and Aspiration.",
};

assert.equal(isPublishableQualitativeArea(goodArea), true);

const themes = publishableQualitativeThemes({
  urn: "116036",
  name: "Test School",
  assessedAt: "2026-08-18",
  areas: [
    thinArea,
    goodArea,
    {
      area: "curriculum",
      score: 89,
      confidence: 0.94,
      signals: [
        {
          text: "The National Curriculum: Mathematics",
          sourceUrl: "https://example.sch.uk/curriculum",
          sourceType: "school-website",
          capturedAt: "2026-08-18",
        },
      ],
      narrativeSummary: "The school website lists art, computing, geography.",
    },
  ],
});

assert.equal(themes.length, 1);
assert.equal(themes[0].area, "ethos");
assert.ok(themes[0].sourceUrl);

console.log("PASS test-seo-qualitative");
