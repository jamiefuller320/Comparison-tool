import assert from "node:assert/strict";
import {
  clearQualitativeCaptureCache,
  loadQualitativeCapture,
  schoolHasQualitativePointer,
  withQualitativeCaptures,
} from "../src/lib/qualitativeLoad.ts";

clearQualitativeCaptureCache();

assert.equal(
  schoolHasQualitativePointer({
    urn: "1",
    name: "A",
    qualitativeCaptureEnrichedAt: "2026-08-01",
  }),
  true,
);
assert.equal(
  schoolHasQualitativePointer({ urn: "1", name: "A" }),
  false,
);

const record = {
  urn: "116482",
  name: "Test",
  assessedAt: "2026-08-01",
  engineVersion: "t",
  sourcesScanned: 1,
  areas: [{ area: "ethos", score: 1, confidence: 0.5, summary: "x", themes: [], offerings: [], signals: [] }],
};

const fetchImpl = async (url) => {
  assert.match(String(url), /\/data\/qualitative\/116482\.json/);
  return new Response(JSON.stringify(record), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

const loaded = await loadQualitativeCapture("116482", fetchImpl);
assert.equal(loaded?.urn, "116482");
// cache hit — fetch should not be required again
const again = await loadQualitativeCapture("116482", async () => {
  throw new Error("should use cache");
});
assert.equal(again?.urn, "116482");

const merged = withQualitativeCaptures(
  [
    {
      urn: "116482",
      name: "Test",
      qualitativeCaptureEnrichedAt: "2026-08-01",
    },
  ],
  { "116482": record },
);
assert.equal(merged[0].qualitativeCapture?.areas?.length, 1);

const missing = await loadQualitativeCapture("999", async () =>
  new Response("nope", { status: 404 }),
);
assert.equal(missing, null);

console.log("OK qualitative load");
