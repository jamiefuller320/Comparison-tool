/**
 * Print only the visit pack.
 *
 * iPhone / iPad (WebKit): print the main document. Zero-size iframes and
 * @media print rules inside iframes are unreliable on iOS (page breaks are
 * often ignored entirely).
 *
 * Desktop: keep an isolated iframe so the rest of the app UI does not print,
 * with critical page-break CSS inlined so we do not wait on stylesheet loads.
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

/** Critical rules inlined into the print iframe (desktop path). */
export const VISIT_PACK_PRINT_CSS = `
@page { margin: 12mm; size: A4; }
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
.visit-pack, .visit-pack-print-clone {
  display: block !important;
  border: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  float: none !important;
  position: static !important;
  width: 100% !important;
  overflow: visible !important;
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
}
/* Prefer dedicated break nodes — stacking break-after on sheets + breaks causes blank pages. */
.visit-pack-page-break {
  display: block !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  line-height: 0 !important;
  font-size: 0 !important;
  page-break-after: always !important;
  break-after: page !important;
}
.visit-pack-school-sheet,
.visit-pack-school,
.visit-pack-school-notes,
.visit-pack-school-precis {
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
  min-height: 140mm !important;
  height: 140mm !important;
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
.decision-guidance-print-columns {
  display: block !important;
}
.decision-guidance-print-columns > * {
  display: block !important;
  margin-bottom: 0.6rem;
}
`;

export function insertVisitPackPageBreaks(root: ParentNode): number {
  const pack =
    root instanceof Element && root.classList.contains("visit-pack")
      ? root
      : root.querySelector(".visit-pack");
  if (!pack) return 0;

  const sheets = Array.from(pack.children).filter((el) =>
    el.classList.contains("visit-pack-sheet"),
  );
  let inserted = 0;
  for (let i = 0; i < sheets.length - 1; i += 1) {
    const sheet = sheets[i];
    const nextSheet = sheets[i + 1];
    let probe: Element | null = sheet.nextElementSibling;
    let hasBreakBeforeNext = false;
    while (probe && probe !== nextSheet) {
      if (probe.classList.contains("visit-pack-page-break")) {
        hasBreakBeforeNext = true;
        break;
      }
      probe = probe.nextElementSibling;
    }
    if (hasBreakBeforeNext) continue;
    const br = sheet.ownerDocument.createElement("div");
    br.className = "visit-pack-page-break";
    br.setAttribute("aria-hidden", "true");
    sheet.insertAdjacentElement("afterend", br);
    inserted += 1;
  }
  return inserted;
}

function printViaMainWindow(pack: HTMLElement, noteHeightPx: number): void {
  pack.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);
  insertVisitPackPageBreaks(pack);

  const parent = pack.parentNode;
  if (!parent) return;

  // Park the pack as a direct body child so we can hide every other body
  // sibling during print without collapsing nested ancestors (iOS WebKit).
  const placeholder = document.createComment("visit-pack-print-anchor");
  parent.insertBefore(placeholder, pack);
  document.body.appendChild(pack);

  const scrollY = window.scrollY;
  document.documentElement.classList.add("visit-pack-printing");
  document.body.classList.add("visit-pack-printing");

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.documentElement.classList.remove("visit-pack-printing");
    document.body.classList.remove("visit-pack-printing");
    if (placeholder.parentNode) {
      placeholder.parentNode.insertBefore(pack, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    } else if (!pack.isConnected) {
      document.body.appendChild(pack);
    }
    window.removeEventListener("afterprint", finish);
    window.scrollTo(0, scrollY);
  };

  window.addEventListener("afterprint", finish);

  // Let WebKit apply the printing class before opening the sheet.
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
  pack.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);

  const clone = pack.cloneNode(true) as HTMLElement;
  clone.classList.add("visit-pack-print-clone");
  clone.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());
  clone.querySelectorAll(".print-only").forEach((el) => {
    el.classList.remove("print-only");
  });
  insertVisitPackPageBreaks(clone);

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

  // Wait a tick for the iframe document to lay out.
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
