/** Sanity checks for phonics area helpers + harvested benchmarks. */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const {
    PHONICS_METRICS,
    phonicsForSchool,
    phonicsEngland,
    sharedPhonicsLaName,
  } = await import("../src/lib/phonicsMetrics.ts");

  if (PHONICS_METRICS.length < 3) {
    console.error("FAIL expected phonics metrics");
    process.exit(1);
  }

  const pack = {
    period: "2024/2025",
    england: { year1Expected: 80, endYear2Expected: 89 },
    localAuthorities: {
      Barnet: { year1Expected: 84, endYear2Expected: 91 },
    },
  };

  const eng = phonicsEngland(pack);
  if (eng?.year1Expected !== 80) {
    console.error("FAIL england phonics", eng);
    process.exit(1);
  }

  const area = phonicsForSchool({ localAuthority: "Barnet" }, pack);
  if (area?.year1Expected !== 84) {
    console.error("FAIL LA phonics join", area);
    process.exit(1);
  }

  if (phonicsForSchool({ localAuthority: "Nowhere" }, pack) != null) {
    console.error("FAIL missing LA should be undefined");
    process.exit(1);
  }

  if (sharedPhonicsLaName([{ localAuthority: "Hampshire" }, { localAuthority: "Hampshire" }]) !== "Hampshire") {
    console.error("FAIL shared LA helper");
    process.exit(1);
  }
  if (sharedPhonicsLaName([{ localAuthority: "Hampshire" }, { localAuthority: "Surrey" }]) != null) {
    console.error("FAIL mixed LA should be null");
    process.exit(1);
  }

  const indexPath = resolve(root, "public/data/schools-index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const phonics = index.benchmarks?.phonics;
  if (!phonics?.england?.year1Expected) {
    console.error("FAIL schools-index missing phonics.england.year1Expected");
    process.exit(1);
  }
  const laNames = Object.keys(phonics.localAuthorities || {});
  const maintained = index.maintainedScope === "Hampshire";
  if (maintained) {
    if (laNames.length !== 1 || laNames[0] !== "Hampshire") {
      console.error("FAIL Hampshire maintained set should keep only Hampshire phonics", laNames);
      process.exit(1);
    }
  } else if (laNames.length < 100) {
    console.error("FAIL expected many LA phonics rows", laNames.length);
    process.exit(1);
  }
  if (phonics.england.year1Expected < 50 || phonics.england.year1Expected > 95) {
    console.error("FAIL England Year 1 % looks implausible", phonics.england);
    process.exit(1);
  }

  console.log(
    `phonics ok (England Y1 ${phonics.england.year1Expected}%, ` +
      `${laNames.length} LA${laNames.length === 1 ? "" : "s"}${maintained ? ", Hampshire maintained" : ""})`,
  );
}

main();
