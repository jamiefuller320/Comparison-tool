/** Unit checks for iOS-aware visit pack printing helpers. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
    resolveVisitPackElement,
    VISIT_PACK_PRINT_CSS,
    VISIT_PACK_PRINT_STYLES,
    PRINT_CLEANUP_SAFETY_MS,
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
  assert.match(VISIT_PACK_PRINT_CSS, /color-scheme:\s*light only/);
  assert.match(VISIT_PACK_PRINT_STYLES, /@media screen[\s\S]*visit-pack-print-root/);
  assert.match(VISIT_PACK_PRINT_STYLES, /@media print/);
  assert.ok(
    !/page-break-after:\s*always/.test(VISIT_PACK_PRINT_CSS),
    "must not use page-break-after:always (WebKit blank pages)",
  );
  assert.ok(
    PRINT_CLEANUP_SAFETY_MS >= 60_000,
    "cleanup safety timeout must not tear down iPad preview early",
  );
  assert.ok(
    !/setTimeout\(finish,\s*2500\)/.test(
      readFileSync(new URL("../src/lib/printVisitPack.ts", import.meta.url), "utf8"),
    ),
    "must not remove print root after 2.5s while iOS preview is open",
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

  // Compare action bar prints [data-visit-pack="compare"], which wraps VisitPack.
  // Must unwrap so questions / graphs / school sheets survive (not blank iPad pages).
  await withDom(
    `<div data-visit-pack="compare" class="compare-visit-pack-anchor">
      <div class="visit-pack">
        <div class="visit-pack-toolbar no-print">chrome</div>
        <div class="visit-pack-body" hidden>
          <div class="visit-pack-sheet visit-pack-guide-sheet" id="guide">questions</div>
          <div class="visit-pack-page-break"></div>
          <div class="visit-pack-sheet visit-pack-graphs-sheet" id="graphs">graphs</div>
          <div class="visit-pack-page-break"></div>
          <div class="visit-pack-sheet visit-pack-school-sheet" id="school">school</div>
        </div>
      </div>
    </div>`,
    (document) => {
      const host = document.querySelector('[data-visit-pack="compare"]');
      assert.ok(host);
      const resolved = resolveVisitPackElement(host);
      assert.ok(resolved.classList.contains("visit-pack"));
      const prepared = prepareVisitPackForPrint(host);
      assert.equal(prepared.querySelectorAll(".visit-pack-sheet").length, 3);
      assert.ok(prepared.firstElementChild?.classList.contains("visit-pack-sheet"));
      assert.ok(prepared.querySelector("#guide"));
      assert.ok(prepared.querySelector("#graphs"));
      assert.ok(prepared.querySelector("#school"));
      assert.equal(prepared.querySelectorAll(".visit-pack-body").length, 0);
    },
  );

  assert.match(VISIT_PACK_PRINT_CSS, /\.visit-note-lines\.is-compact/);
  assert.match(VISIT_PACK_PRINT_CSS, /\.visit-pack-figures-scroll[\s\S]*overflow:\s*visible/);
  assert.match(VISIT_PACK_PRINT_CSS, /\.visit-pack-chart/);
  assert.match(VISIT_PACK_PRINT_CSS, /\.visit-pack-school-website/);

  console.log("OK print-visit-pack");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
