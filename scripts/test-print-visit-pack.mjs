/** Unit checks for iOS-aware visit pack printing helpers. */

import assert from "node:assert/strict";

async function withDom(html, fn) {
  try {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(`<!doctype html>${html}`);
    return fn(dom.window.document);
  } catch {
    console.log("(skip DOM prepare checks — jsdom not installed)");
    return null;
  }
}

async function main() {
  const {
    isAppleMobilePrintHost,
    prepareVisitPackForPrint,
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

  // Prefer break-before; avoid break-after (WebKit blank-page padding).
  assert.match(VISIT_PACK_PRINT_CSS, /break-before:\s*page/);
  assert.match(
    VISIT_PACK_PRINT_CSS,
    /\.visit-pack > \.visit-pack-sheet ~ \.visit-pack-sheet/,
  );
  assert.match(VISIT_PACK_PRINT_CSS, /\.visit-pack-page-break[\s\S]*display:\s*none/);
  assert.ok(
    !/page-break-after:\s*always/.test(VISIT_PACK_PRINT_CSS),
    "must not use page-break-after:always (WebKit blank pages)",
  );

  await withDom(
    `<div class="visit-pack">
      <div class="visit-pack-toolbar no-print">chrome</div>
      <div class="visit-pack-page-break"></div>
      <div class="visit-pack-sheet" id="a">A</div>
      <div class="visit-pack-page-break"></div>
      <div class="visit-pack-sheet" id="b">B</div>
    </div>`,
    (document) => {
      const pack = document.querySelector(".visit-pack");
      const prepared = prepareVisitPackForPrint(pack);
      assert.equal(prepared.querySelectorAll(".no-print").length, 0);
      assert.equal(prepared.querySelectorAll(".visit-pack-page-break").length, 0);
      assert.ok(prepared.firstElementChild?.classList.contains("visit-pack-sheet"));
      assert.equal(prepared.querySelectorAll(".visit-pack-sheet").length, 2);
      assert.ok(prepared.classList.contains("visit-pack-print-root"));
    },
  );

  // Collapsed screen preview wraps sheets; print prep must hoist them out.
  await withDom(
    `<div class="visit-pack">
      <div class="visit-pack-toolbar no-print">chrome</div>
      <section class="visit-pack-section no-print">status</section>
      <div class="visit-pack-body" hidden>
        <div class="visit-pack-sheet" id="a">A</div>
        <div class="visit-pack-page-break"></div>
        <div class="visit-pack-sheet" id="b">B</div>
      </div>
    </div>`,
    (document) => {
      const pack = document.querySelector(".visit-pack");
      const prepared = prepareVisitPackForPrint(pack);
      assert.equal(prepared.querySelectorAll(".visit-pack-body").length, 0);
      assert.equal(prepared.querySelectorAll(".no-print").length, 0);
      assert.ok(prepared.firstElementChild?.classList.contains("visit-pack-sheet"));
      assert.equal(prepared.querySelectorAll(".visit-pack-sheet").length, 2);
    },
  );

  console.log("OK print-visit-pack");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
