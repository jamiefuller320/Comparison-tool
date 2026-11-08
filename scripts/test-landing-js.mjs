/**
 * School landings must not prefetch the homepage compare/map bundle, and the
 * template font variables must stay on next/font's size-adjusted fallback.
 */

import { readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let failed = 0;
function fail(message) {
  console.error("FAIL", message);
  failed += 1;
}

const css = read("src/app/globals.css");
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
if (/--font-sans\s*:/.test(rootBlock) || /--font-display\s*:/.test(rootBlock)) {
  fail(":root overrides next/font --font-sans or --font-display");
}
if (!css.includes("min-height: 4rem")) {
  fail("breadcrumb min-height is missing");
}
if (!css.includes("min-height: 3.45em")) {
  fail("hero title min-height is missing");
}
if (!css.includes("min-height: 8.14rem")) {
  fail("hero lead min-height is missing");
}
if (!css.includes("min-height: 4.05rem")) {
  fail("header bar min-height is missing");
}

const loader = read("src/components/CompareLoader.tsx");
if (!loader.includes('from "@/components/CompareApp"')) {
  fail("CompareLoader no longer renders CompareApp on the server");
}
if (loader.includes("next/dynamic")) {
  fail("dynamic CompareApp drops the setup form from the homepage HTML");
}

const explorer = read("src/components/HomePostcodeExplorer.tsx");
if (!explorer.includes('import("@/components/NearbyMap")')) {
  fail("NearbyMap is not dynamically imported");
}

const link = read("src/components/CompareToolLink.tsx");
if (!link.includes("prefetch={false}")) {
  fail("CompareToolLink does not disable prefetch");
}

const surfaces = [
  "src/app/schools/[urn]/page.tsx",
  "src/app/areas/page.tsx",
  "src/app/areas/[slug]/page.tsx",
  "src/app/areas/[slug]/[stage]/page.tsx",
  "src/app/areas/[slug]/towns/page.tsx",
  "src/app/areas/[slug]/towns/[town]/page.tsx",
  "src/app/guides/page.tsx",
  "src/app/guides/[slug]/page.tsx",
  "src/app/feedback/page.tsx",
  "src/components/SiteFooter.tsx",
  "src/components/SeoSchoolHubList.tsx",
];

for (const rel of surfaces) {
  const source = read(rel);
  if (/<Link\b[^>]*href=(?:"\/"|'\/'|"\/#|'\/#|\{"\/|"\/\?|'\/\?)/.test(source)) {
    fail(`${rel} still prefetches the homepage via next/link`);
  }
  if (rel.endsWith("schools/[urn]/page.tsx") && !source.includes("CompareToolLink")) {
    fail("school landing does not use CompareToolLink");
  }
  if (rel.endsWith("[stage]/page.tsx") && !source.includes("CompareToolLink href={areaStageCompareHref")) {
    fail("stage landing compare link can prefetch the homepage");
  }
  if (rel.endsWith("SeoSchoolHubList.tsx") && !source.includes("CompareToolLink")) {
    fail("hub compare links can prefetch the homepage");
  }
}

if (failed) {
  console.error(`FAIL ${failed} landing JS check(s)`);
  process.exit(1);
}

console.log("ok landing compare/map split and hero reserve");
