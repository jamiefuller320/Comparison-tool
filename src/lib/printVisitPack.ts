/**
 * Print only the visit pack.
 *
 * iPhone / iPad (WebKit): print a clean clone from the main document. Isolated
 * iframe `contentWindow.print()` often yields a blank Safari print preview on
 * iOS when the frame is off-screen. Main-window printing uses
 * `html.visit-pack-printing` (see globals.css) to show only the clone.
 *
 * Do not hide the clone with visibility:hidden / opacity:0 — WebKit treats
 * those as blank in print preview. Off-screen positioning is fine because
 * print CSS resets the root to position:static.
 *
 * Desktop / Android: isolated non-zero iframe with the same break-before rules.
 */

export function isAppleMobilePrintHost(
  nav: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> = typeof navigator !== "undefined"
    ? navigator
    : { userAgent: "", platform: "", maxTouchPoints: 0 },
): boolean {
  const ua = nav.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ can report as MacIntel with touch.
  if (nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1) return true;
  return false;
}

/**
 * Screen-only rules for the main-window Apple path. Keep the clone out of the
 * way while the print sheet is open — never visibility/opacity zero.
 */
export const VISIT_PACK_PRINT_SCREEN_CSS = `
@media screen {
  html.visit-pack-printing .visit-pack-print-root {
    position: fixed !important;
    left: -10000px !important;
    top: 0 !important;
    width: 210mm;
    pointer-events: none !important;
  }
}
`;

/** Base document styles — iframe body and injected main-window style. */
export const VISIT_PACK_DOCUMENT_CSS = `
html {
  color-scheme: light only;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
  color: #14233a !important;
  font-family: Figtree, system-ui, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.no-print { display: none !important; }
.visit-pack-page-break {
  display: none !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
}
.visit-pack, .visit-pack-print-clone, .visit-pack-print-root {
  display: block !important;
  border: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  float: none !important;
  position: static !important;
  width: 100% !important;
  overflow: visible !important;
  min-height: 0 !important;
  height: auto !important;
  color-scheme: light only;
  background: #fff !important;
  color: #14233a !important;
}
.visit-pack-print-clone :where(
  h1, h2, h3, h4, h5, h6,
  p, li, dt, dd, th, td,
  blockquote, strong, em, small,
  span, div, label, figcaption
),
.visit-pack-print-root :where(
  h1, h2, h3, h4, h5, h6,
  p, li, dt, dd, th, td,
  blockquote, strong, em, small,
  span, div, label, figcaption
) {
  color: #14233a !important;
  -webkit-text-fill-color: #14233a !important;
}
.visit-pack-print-clone a,
.visit-pack-print-root a {
  color: #0b4f6c !important;
  -webkit-text-fill-color: #0b4f6c !important;
}
.visit-pack-print-clone .visit-contact-meta,
.visit-pack-print-clone .visit-pack-figures-caption,
.visit-pack-print-clone .decision-guidance-print-foot,
.visit-pack-print-clone .visit-pack-school-empty,
.visit-pack-print-root .visit-contact-meta,
.visit-pack-print-root .visit-pack-figures-caption,
.visit-pack-print-root .decision-guidance-print-foot,
.visit-pack-print-root .visit-pack-school-empty {
  color: #3d4f66 !important;
  -webkit-text-fill-color: #3d4f66 !important;
}
.visit-pack-sheet {
  display: block !important;
  float: none !important;
  position: static !important;
  overflow: visible !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 0 2mm !important;
  border: 0 !important;
  page-break-inside: auto !important;
  page-break-after: auto !important;
  break-after: auto !important;
  background: #fff !important;
}
.visit-pack-school-sheet,
.visit-pack-school,
.visit-pack-school-notes,
.visit-pack-school-precis,
.visit-pack-school-website {
  display: block !important;
  float: none !important;
  position: static !important;
  overflow: visible !important;
  min-height: 0 !important;
  height: auto !important;
  flex: none !important;
}
.visit-pack-school {
  border: 1px solid rgba(20,35,58,0.18);
  padding: 3mm;
  border-radius: 0;
  background: #fff !important;
}
.visit-pack-brand {
  font-family: Fraunces, Georgia, serif;
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 0.2rem;
  color: #14233a !important;
}
.visit-pack-sheet-title p { margin: 0 0 0.4rem; color: #3d4f66 !important; }
.visit-note-lines {
  display: block !important;
  width: 100% !important;
  min-height: var(--visit-print-note-height, 120mm) !important;
  height: var(--visit-print-note-height, 120mm) !important;
  flex: none !important;
  background-color: #fff !important;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(1.35rem - 1px),
    rgba(20, 35, 58, 0.22) calc(1.35rem - 1px),
    rgba(20, 35, 58, 0.22) 1.35rem
  );
  background-size: 100% 1.35rem;
  background-repeat: repeat-y;
}
.visit-note-lines.is-compact {
  min-height: 42mm !important;
  height: 42mm !important;
}
.visit-pack-figures-scroll {
  overflow: visible !important;
}
.visit-pack-compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  background: #fff !important;
}
.visit-pack-compare-table th,
.visit-pack-compare-table td {
  border: 1px solid rgba(20,35,58,0.18);
  padding: 0.28rem 0.35rem;
  text-align: left;
  background: #fff !important;
  color: #14233a !important;
  -webkit-text-fill-color: #14233a !important;
}
.visit-pack-compare-table thead th {
  color: #0b4f6c !important;
  -webkit-text-fill-color: #0b4f6c !important;
}
.visit-pack-school-website,
.visit-pack-quote-block,
.visit-pack-website-area,
.decision-guidance-print {
  display: block !important;
  overflow: visible !important;
  page-break-inside: avoid;
  break-inside: avoid;
  background: #fff !important;
}
.decision-guidance-print h4,
.compare-subhead {
  color: #0b4f6c !important;
  -webkit-text-fill-color: #0b4f6c !important;
}
.visit-questions h4 {
  color: #0b4f6c !important;
  -webkit-text-fill-color: #0b4f6c !important;
}
.visit-pack-quotes {
  margin: 0.25rem 0 0.5rem;
  padding-left: 1.1rem;
}
.visit-pack-quotes blockquote {
  margin: 0.2rem 0;
  font-size: 0.82rem;
  line-height: 1.35;
}
.visit-pack-chart {
  display: block !important;
  margin: 0 0 0.75rem;
  page-break-inside: avoid;
  break-inside: avoid;
  background: #fff !important;
}
.visit-pack-chart-svg {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
}
.visit-pack-chart-label,
.visit-pack-chart-value,
.visit-pack-chart-missing {
  font-size: 9px;
  fill: #14233a;
}
.visit-pack-chart-missing { fill: #6b7c93; }
.visit-pack-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.85rem;
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  font-size: 0.78rem;
  color: #14233a !important;
}
.visit-pack-chart-swatch {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  margin-right: 0.3rem;
  border-radius: 2px;
  vertical-align: middle;
}
.decision-guidance-print-columns {
  display: block !important;
  color: #14233a !important;
}
.decision-guidance-print-columns > * {
  display: block !important;
  margin-bottom: 0.6rem;
}
`;

/** Print-media pagination rules — break-before on later sheets. */
export const VISIT_PACK_PRINT_CSS = `
@media print {
@page { margin: 12mm; }
html {
  color-scheme: light only;
}
.visit-pack > .visit-pack-sheet ~ .visit-pack-sheet,
.visit-pack-print-clone > .visit-pack-sheet ~ .visit-pack-sheet,
.visit-pack-print-root > .visit-pack-sheet ~ .visit-pack-sheet {
  break-before: page !important;
  page-break-before: always !important;
}
.visit-pack-page-break {
  display: none !important;
  page-break-after: auto !important;
  break-after: auto !important;
  page-break-before: auto !important;
  break-before: auto !important;
}
.visit-note-lines.is-compact {
  min-height: 42mm !important;
  height: 42mm !important;
}
.visit-pack-figures-scroll {
  overflow: visible !important;
}
}
`;

/** Injected into main window (iOS) and print iframes (desktop). */
export const VISIT_PACK_PRINT_STYLES =
  VISIT_PACK_PRINT_SCREEN_CSS + VISIT_PACK_DOCUMENT_CSS + VISIT_PACK_PRINT_CSS;

/**
 * iOS afterprint often fires when the sheet opens — wait for print mode to end
 * via matchMedia("print") instead of tearing down the clone early.
 */
export const PRINT_CLEANUP_SAFETY_MS = 10 * 60 * 1000;

export function attachPrintCleanup(onDone: () => void): void {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    mql.removeEventListener("change", onPrintChange);
    window.removeEventListener("afterprint", finish);
    window.clearTimeout(safetyTimer);
    onDone();
  };

  const mql = window.matchMedia("print");
  const onPrintChange = () => {
    if (!mql.matches) finish();
  };

  mql.addEventListener("change", onPrintChange);

  if (!isAppleMobilePrintHost()) {
    window.addEventListener("afterprint", finish);
  }

  const safetyTimer = window.setTimeout(finish, PRINT_CLEANUP_SAFETY_MS);
}

/** Build a standalone HTML document for the print iframe. */
export function buildVisitPackPrintDocument(
  cloneHtml: string,
  baseHref = "/",
): string {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<base href="${baseHref}" />
<style>${VISIT_PACK_DOCUMENT_CSS + VISIT_PACK_PRINT_CSS}</style>
</head>
<body>${cloneHtml}</body>
</html>`;
}

/**
 * Resolve the printable pack root.
 *
 * Compare mounts VisitPack inside `[data-visit-pack="compare"]`. Printing that
 * wrapper without unwrapping would leave sheets nested under `.visit-pack`, and
 * the leading-empty guard would discard the whole pack → blank iPad pages.
 */
export function resolveVisitPackElement(pack: HTMLElement): HTMLElement {
  if (pack.classList.contains("visit-pack")) return pack;
  const nested = pack.querySelector<HTMLElement>(".visit-pack");
  return nested ?? pack;
}

/** Build a print-only pack node with chrome stripped and no leading break nodes. */
export function prepareVisitPackForPrint(pack: HTMLElement): HTMLElement {
  const source = resolveVisitPackElement(pack);
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add("visit-pack-print-root");
  clone.classList.remove("visit-pack-print-clone");
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());
  clone.querySelectorAll(".print-only").forEach((el) => {
    el.classList.remove("print-only");
  });
  // Screen UI collapses sheets inside .visit-pack-body — hoist for print root.
  clone.querySelectorAll(".visit-pack-body").forEach((body) => {
    const parent = body.parentNode;
    if (!parent) return;
    while (body.firstChild) {
      parent.insertBefore(body.firstChild, body);
    }
    body.remove();
  });
  // Drop inert break markers — pagination uses sheet ~ sheet break-before.
  clone.querySelectorAll(".visit-pack-page-break").forEach((el) => el.remove());
  // Guard against accidental leading empty nodes.
  while (clone.firstChild) {
    const first = clone.firstChild;
    if (
      first.nodeType === 1 &&
      (first as Element).classList.contains("visit-pack-sheet")
    ) {
      break;
    }
    clone.removeChild(first);
  }
  return clone;
}

function printViaMainWindow(pack: HTMLElement, noteHeightPx: number): void {
  const printRoot = prepareVisitPackForPrint(pack);
  printRoot.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);
  printRoot.setAttribute("data-visit-pack-print-root", "1");

  const style = document.createElement("style");
  style.setAttribute("data-visit-pack-print-style", "1");
  style.textContent = VISIT_PACK_PRINT_STYLES;

  const scrollY = window.scrollY;
  document.head.appendChild(style);
  document.body.appendChild(printRoot);
  document.documentElement.classList.add("visit-pack-printing");
  document.body.classList.add("visit-pack-printing");

  const finish = () => {
    document.documentElement.classList.remove("visit-pack-printing");
    document.body.classList.remove("visit-pack-printing");
    printRoot.remove();
    style.remove();
    window.scrollTo(0, scrollY);
  };

  attachPrintCleanup(finish);

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      window.focus();
      window.print();
    }, 60);
  });
}

function printViaIframe(pack: HTMLElement, noteHeightPx: number): void {
  const clone = prepareVisitPackForPrint(pack);
  clone.classList.add("visit-pack-print-clone");
  clone.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print visit pack");
  iframe.setAttribute("aria-hidden", "true");
  // Non-zero, on-viewport corner — visible to the print engine but not on screen.
  // Do not use visibility:hidden or opacity:0 (WebKit prints blank pages).
  // Do not park far off-screen (left:-10000px) — iOS Safari often blanks that.
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;pointer-events:none;z-index:-1;";

  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    printViaMainWindow(pack, noteHeightPx);
    return;
  }

  idoc.open();
  idoc.write(buildVisitPackPrintDocument(clone.outerHTML, document.baseURI));
  idoc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  iwin.addEventListener("afterprint", cleanup);
  window.setTimeout(cleanup, PRINT_CLEANUP_SAFETY_MS);

  const triggerPrint = () => {
    try {
      iwin.focus();
      iwin.print();
    } catch {
      cleanup();
      printViaMainWindow(pack, noteHeightPx);
    }
  };

  window.setTimeout(triggerPrint, 250);
}

export function printVisitPackElement(
  pack: HTMLElement,
  noteHeightPx: number,
): void {
  const resolved = resolveVisitPackElement(pack);
  if (isAppleMobilePrintHost()) {
    printViaMainWindow(resolved, noteHeightPx);
    return;
  }
  printViaIframe(resolved, noteHeightPx);
}
