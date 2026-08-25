/**
 * Geo-lazy pack selection + district/neighbour coverage helpers.
 */
import assert from "node:assert/strict";
import {
  findReadyPackForDistrict,
  indexCoversLocalAuthority,
  selectGeoLazyPacks,
  ensureAreaCoverageForDistrict,
  ensureAreaCoverageForUrns,
} from "../src/lib/ensureAreaCoverage.ts";
import { neighbourLocalAuthorities } from "../src/lib/laPacks.ts";

const ready = [
  { localAuthority: "Southampton", slug: "southampton", status: "ready" },
  { localAuthority: "Isle of Wight", slug: "isle-of-wight", status: "ready" },
  { localAuthority: "Surrey", slug: "surrey", status: "ready" },
  { localAuthority: "Portsmouth", slug: "portsmouth", status: "ready" },
  { localAuthority: "Kent", slug: "kent", status: "ready" },
];

assert.equal(findReadyPackForDistrict(ready, "Southampton")?.slug, "southampton");
assert.equal(findReadyPackForDistrict(ready, "New Forest"), null);

assert.ok(neighbourLocalAuthorities("Hampshire").includes("Southampton"));
assert.ok(neighbourLocalAuthorities("Hampshire").includes("Surrey"));

const hampshireLazy = selectGeoLazyPacks(ready, "Hampshire");
const lazySlugs = hampshireLazy.map((p) => p.slug).sort();
assert.ok(lazySlugs.includes("southampton"));
assert.ok(lazySlugs.includes("surrey"));
assert.ok(lazySlugs.includes("portsmouth"));
assert.ok(!lazySlugs.includes("kent")); // not a Hampshire neighbour

const seedOnly = {
  schools: {
    generatedAt: "2026-08-06",
    period: "2024/2025",
    source: { api: "x", datasets: {}, primarySite: "y", note: "seed." },
    benchmarks: {
      england: { rwmExpected: 60 },
      localAuthorities: {},
    },
    schools: [{ urn: "1", name: "A", localAuthority: "Hampshire" }],
    stats: { schoolCount: 1 },
  },
  ey: null,
  childminders: null,
};

assert.equal(
  indexCoversLocalAuthority(seedOnly.schools, "Hampshire"),
  true,
);
assert.equal(
  indexCoversLocalAuthority(seedOnly.schools, "Southampton"),
  false,
);

const fetched = [];
const packPayload = (la, urn) => ({
  generatedAt: "2026-08-06",
  period: "2024/2025",
  source: { api: "x", datasets: {}, primarySite: "y", note: "pack." },
  benchmarks: { england: { rwmExpected: 60 }, localAuthorities: {} },
  schools: [{ urn, name: `${la} School`, localAuthority: la, rwmExpected: 65 }],
  stats: { schoolCount: 1 },
});

const fetchImpl = async (url) => {
  const u = String(url);
  fetched.push(u);
  if (u.includes("/packs/manifest.json")) {
    return new Response(
      JSON.stringify({
        seedLocalAuthority: "Hampshire",
        packs: Object.fromEntries(
          ready.map((p) => [p.slug, p]),
        ),
      }),
      { status: 200 },
    );
  }
  if (u.includes("/packs/urn-lookup.json")) {
    return new Response(
      JSON.stringify({ byUrn: { "116116": "southampton" } }),
      { status: 200 },
    );
  }
  for (const entry of ready) {
    if (u.includes(`/packs/${entry.slug}/schools-index.json`)) {
      return new Response(
        JSON.stringify(packPayload(entry.localAuthority, `u-${entry.slug}`)),
        { status: 200 },
      );
    }
  }
  return new Response("nope", { status: 404 });
};

const districtResult = await ensureAreaCoverageForDistrict(
  seedOnly,
  "Hampshire",
  fetchImpl,
  false,
);
assert.ok(districtResult);
assert.ok(districtResult.loadedLabels.includes("Southampton"));
assert.ok(
  districtResult.next.schools.schools.some((s) => s.localAuthority === "Surrey"),
);
// Must not pull Kent for a Hampshire home.
assert.ok(
  !districtResult.next.schools.schools.some((s) => s.localAuthority === "Kent"),
);

const urnResult = await ensureAreaCoverageForUrns(
  seedOnly,
  ["116116"],
  fetchImpl,
  false,
);
assert.ok(urnResult);
assert.equal(urnResult.loadedLabel, "Southampton");
assert.ok(urnResult.next.schools.schools.some((s) => s.urn === "u-southampton"));

console.log("test-ensure-area-coverage: ok");
