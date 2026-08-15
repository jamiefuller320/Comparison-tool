async function main() {
  const sticky = await import("../src/components/CompareStickyContext.tsx");
  if (typeof sticky.CompareStickyProvider !== "function") {
    console.error("FAIL CompareStickyProvider");
    process.exit(1);
  }
  if (typeof sticky.useCompareSticky !== "function") {
    console.error("FAIL useCompareSticky");
    process.exit(1);
  }

  const header = await import("../src/components/SchoolColumnHeader.tsx");
  if (typeof header.SchoolColumnHeader !== "function") {
    console.error("FAIL SchoolColumnHeader");
    process.exit(1);
  }

  console.log("compact sticky header helpers ok");
}

main();
