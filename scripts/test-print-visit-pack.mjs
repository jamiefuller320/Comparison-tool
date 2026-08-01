/** Unit checks for iOS-aware visit pack printing helpers. */

import assert from "node:assert/strict";

async function withDom(html, fn) {
  try {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(`<!doctype html>${html}`);
    return fn(dom.window.document);
  } catch {
    // jsdom is optional in this environment — skip DOM assertions.
    console.log("(skip DOM insert checks — jsdom not installed)");
    return null;
  }
}

async function main() {
  const {
    isAppleMobilePrintHost,
    insertVisitPackPageBreaks,
    VISIT_PACK_PRINT_CSS,
  } = await import("../src/lib/printVisitPack.ts");

  assert.equal(
    isAppleMobilePrintHost({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    isAppleMobilePrintHost({
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      platform: "iPad",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    isAppleMobilePrintHost({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    true,
    "iPadOS desktop UA",
  );
  assert.equal(
    isAppleMobilePrintHost({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
    false,
  );
  assert.equal(
    isAppleMobilePrintHost({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      platform: "Win32",
      maxTouchPoints: 0,
    }),
    false,
  );

  assert.match(VISIT_PACK_PRINT_CSS, /page-break-after:\s*always/);
  assert.match(VISIT_PACK_PRINT_CSS, /\.visit-pack-page-break/);
  assert.match(VISIT_PACK_PRINT_CSS, /display:\s*block\s*!important/);

  await withDom(
    `<div class="visit-pack">
      <div class="visit-pack-sheet" id="a"></div>
      <div class="visit-pack-sheet" id="b"></div>
      <div class="visit-pack-page-break"></div>
      <div class="visit-pack-sheet" id="c"></div>
    </div>`,
    (document) => {
      const pack = document.querySelector(".visit-pack");
      const n = insertVisitPackPageBreaks(pack);
      assert.equal(n, 1, "insert only missing break between a and b");
      assert.equal(pack.querySelectorAll(".visit-pack-page-break").length, 2);
      assert.equal(insertVisitPackPageBreaks(pack), 0, "idempotent");
    },
  );

  console.log("OK print-visit-pack");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
