/**
 * Unit checks for district → ready-pack matching and index coverage.
 */
import assert from "node:assert/strict";
import {
  findReadyPackForDistrict,
  indexCoversLocalAuthority,
} from "../src/lib/ensureAreaCoverage.ts";

const ready = [
  {
    localAuthority: "Southampton",
    slug: "southampton",
    status: "ready",
  },
  {
    localAuthority: "Isle of Wight",
    slug: "isle-of-wight",
    status: "ready",
  },
];

assert.equal(findReadyPackForDistrict(ready, "Southampton")?.slug, "southampton");
assert.equal(findReadyPackForDistrict(ready, "southampton")?.slug, "southampton");
assert.equal(
  findReadyPackForDistrict(ready, "Isle of Wight")?.slug,
  "isle-of-wight",
);
assert.equal(findReadyPackForDistrict(ready, "New Forest"), null);
assert.equal(findReadyPackForDistrict(ready, null), null);

const seedOnly = {
  schools: [{ urn: "1", name: "A", localAuthority: "Hampshire" }],
  collatedPackLabels: undefined,
};
assert.equal(indexCoversLocalAuthority(seedOnly, "Hampshire"), true);
assert.equal(indexCoversLocalAuthority(seedOnly, "Southampton"), false);

const withPack = {
  schools: [
    { urn: "1", name: "A", localAuthority: "Hampshire" },
    { urn: "2", name: "B", localAuthority: "Southampton" },
  ],
  collatedPackLabels: ["Southampton"],
};
assert.equal(indexCoversLocalAuthority(withPack, "Southampton"), true);

console.log("test-ensure-area-coverage: ok");
