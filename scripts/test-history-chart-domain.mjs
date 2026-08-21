import assert from "node:assert/strict";
import { yDomainFromHistoryData } from "../src/lib/historyChartDomain.ts";

const pctRows = [
  { year: "18/19", england: 65, a: 58, b: 72 },
  { year: "22/23", england: 60, a: 61, b: 70 },
  { gap: true, year: "COVID" },
  { year: "23/24", england: 61, a: 63, b: 68 },
];

const pctDomain = yDomainFromHistoryData(pctRows, ["england", "a", "b"], "pct");
assert.ok(Array.isArray(pctDomain));
assert.equal(pctDomain[0] >= 0, true);
assert.equal(pctDomain[1] <= 100, true);
assert.equal(pctDomain[0] > 0, true, "should crop above 0 when data is mid-band");
assert.equal(pctDomain[1] < 100, true, "should crop below 100 when data is mid-band");
assert.equal(pctDomain[0] < 58, true);
assert.equal(pctDomain[1] > 72, true);

const flat = yDomainFromHistoryData([{ england: 50, a: 50 }], ["england", "a"], "pct");
assert.equal(flat[0] < 50, true);
assert.equal(flat[1] > 50, true);

const score = yDomainFromHistoryData(
  [
    { england: 100, a: 102 },
    { england: 101, a: 104 },
  ],
  ["england", "a"],
  "score",
);
assert.equal(score[0] > 80, true, "score domain should not force 80");
assert.equal(score[1] < 120, true, "score domain should not force 120");

const empty = yDomainFromHistoryData([], ["england"], "pct");
assert.deepEqual(empty, [0, 100]);

console.log("test-history-chart-domain: ok");
