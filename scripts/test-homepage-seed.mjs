/** Homepage seed fetch stays idle until a postcode or shared shortlist is in the URL. */

const { homepageSearchNeedsSeed } = await import("../src/lib/homepageSeed.ts");

const cases = [
  ["", false],
  ["?", false],
  ["?stages=ks2,ks3", false],
  ["?tour=1", false],
  ["?postcode=SO40%202HR", true],
  ["?home=SO40%202HR", true],
  ["?postcode=", false],
  ["?schools=123456", true],
  ["?urns=123456,234567", true],
  ["?schools=&postcode=", false],
];

let failed = 0;
for (const [search, expected] of cases) {
  const actual = homepageSearchNeedsSeed(search);
  if (actual !== expected) {
    console.error("FAIL", JSON.stringify(search), "expected", expected, "got", actual);
    failed += 1;
  }
}

if (failed) {
  console.error(`FAIL ${failed} homepage seed case(s)`);
  process.exit(1);
}

console.log("ok homepage seed gate");
