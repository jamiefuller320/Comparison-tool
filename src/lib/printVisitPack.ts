/**
 * Print only the visit pack.
 *
 * iPhone / iPad (WebKit): print a clean clone from the main document.
 * Zero-size iframes ignore print CSS; WebKit also inserts blank sheets for
 * `page-break-after: always`, so we use `break-before` on sheets after the first.
 *
 * Desktop: isolated iframe with the same break-before rules inlined.
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
 * Critical print rules. Prefer break-before on later sheets — WebKit pads a
 * blank page when it sees trailing break-after on the previous sheet.
 */
export const VISIT_PACK_PRINT_CSS = `
@page { margin: 12mm; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
  color: #14233a;
  font-family: Figtree, system-ui, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
}
.no-print { display: none !important; }
.visit-pack-page-break {
  display: none !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  page-break-after: auto !important;
  break-after: auto !important;
  page-break-before: auto !important;
  break-before: auto !important;
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
}
/* New page starts at each sheet after the first — avoids WebKit blank padding. */
.visit-pack > .visit-pack-sheet ~ .visit-pack-sheet,
.visit-pack-print-clone > .visit-pack-sheet ~ .visit-pack-sheet,
.visit-pack-print-root > .visit-pack-sheet ~ .visit-pack-sheet {
  break-before: page !important;
  page-break-before: always !important;
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
  background: #fff;
}
.visit-pack-brand {
  font-family: Fraunces, Georgia, serif;
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 0.2rem;
}
.visit-pack-sheet-title p { margin: 0 0 0.4rem; }
.visit-note-lines {
  display: block !important;
  width: 100% !important;
  min-height: var(--visit-print-note-height, 120mm) !important;
  height: var(--visit-print-note-height, 120mm) !important;
  flex: none !important;
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
}
.visit-pack-compare-table th,
.visit-pack-compare-table td {
  border: 1px solid rgba(20,35,58,0.18);
  padding: 0.28rem 0.35rem;
  text-align: left;
}
.visit-pack-school-website,
.visit-pack-quote-block,
.visit-pack-website-area {
  display: block !important;
  overflow: visible !important;
  page-break-inside: avoid;
  break-inside: avoid;
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
}
.decision-guidance-print-columns > * {
  display: block !important;
  margin-bottom: 0.6rem;
}
`;

/** Build a print-only pack node with chrome stripped and no leading break nodes. */
export function prepareVisitPackForPrint(pack: HTMLElement): HTMLElement {
  const clone = pack.cloneNode(true) as HTMLElement;
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
  while (
    clone.firstChild &&
    (!(clone.firstChild instanceof Element) ||
      !(clone.firstChild as Element).classList.contains("visit-pack-sheet"))
  ) {
    clone.removeChild(clone.firstChild);
  }
  return clone;
}

function printViaMainWindow(pack: HTMLElement, noteHeightPx: number): void {
  const printRoot = prepareVisitPackForPrint(pack);
  printRoot.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);
  printRoot.setAttribute("data-visit-pack-print-root", "1");

  const style = document.createElement("style");
  style.setAttribute("data-visit-pack-print-style", "1");
  style.textContent = VISIT_PACK_PRINT_CSS;

  const scrollY = window.scrollY;
  document.head.appendChild(style);
  document.body.appendChild(printRoot);
  document.documentElement.classList.add("visit-pack-printing");
  document.body.classList.add("visit-pack-printing");

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.documentElement.classList.remove("visit-pack-printing");
    document.body.classList.remove("visit-pack-printing");
    printRoot.remove();
    style.remove();
    window.removeEventListener("afterprint", finish);
    window.scrollTo(0, scrollY);
  };

  window.addEventListener("afterprint", finish);

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      try {
        window.focus();
        window.print();
      } finally {
        // iOS Safari sometimes skips afterprint.
        window.setTimeout(finish, 2500);
      }
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
  // Non-zero size: some engines skip layout/print CSS for 0×0 frames.
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    printViaMainWindow(pack, noteHeightPx);
    return;
  }

  idoc.open();
  idoc.write(`<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base href="${document.baseURI}" />
<style>${VISIT_PACK_PRINT_CSS}</style>
</head>
<body>${clone.outerHTML}</body>
</html>`);
  idoc.close();

  let printed = false;
  const cleanup = () => {
    iframe.remove();
  };

  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iwin.focus();
      iwin.print();
    } finally {
      window.setTimeout(cleanup, 2000);
    }
  };

  window.setTimeout(triggerPrint, 200);
}

export function printVisitPackElement(
  pack: HTMLElement,
  noteHeightPx: number,
): void {
  if (isAppleMobilePrintHost()) {
    printViaMainWindow(pack, noteHeightPx);
    return;
  }
  printViaIframe(pack, noteHeightPx);
}
