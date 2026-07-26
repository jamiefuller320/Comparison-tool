/**
 * Print only the visit pack in an isolated iframe so the rest of the app
 * never enters the print document (avoids full-UI print + trailing blanks).
 */
export function printVisitPackElement(
  pack: HTMLElement,
  noteHeightPx: number,
): void {
  pack.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);

  const clone = pack.cloneNode(true) as HTMLElement;
  clone.classList.add("visit-pack-print-clone");
  clone.style.setProperty("--visit-print-note-height", `${noteHeightPx}px`);
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());
  clone.querySelectorAll(".print-only").forEach((el) => {
    el.classList.remove("print-only");
  });

  const styles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )
    .map((node) => node.outerHTML)
    .join("\n");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print visit pack");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;width:0;height:0;border:0;left:0;top:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    window.print();
    return;
  }

  idoc.open();
  idoc.write(`<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<base href="${document.baseURI}" />
${styles}
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    height: auto !important;
    min-height: 0 !important;
  }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .visit-pack, .visit-pack-print-clone {
    border-top: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
</style>
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
      // Keep iframe briefly so the dialog can read layout; then drop it.
      window.setTimeout(cleanup, 1500);
    }
  };

  // Stylesheets may still be loading after document.write.
  window.setTimeout(triggerPrint, 300);
}
