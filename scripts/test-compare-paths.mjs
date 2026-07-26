async function main() {
  const {
    listAvailableComparePaths,
    pickDefaultComparePath,
    pathsWithShortlistItems,
  } = await import("../src/lib/comparePaths.ts");

  const available = listAvailableComparePaths({
    showEyNurseryBoards: true,
    showChildminderBoards: true,
    showKs1: false,
    showKs2: true,
    showKs4: false,
  });
  if (
    available.join(",") !== "early-years,childminders,ks2" ||
    available.length !== 3
  ) {
    console.error("FAIL available paths", available);
    process.exit(1);
  }

  const withItems = pathsWithShortlistItems({
    hasEyShortlist: false,
    hasChildminderShortlist: true,
    hasKs1Shortlist: false,
    hasKs2Shortlist: true,
    hasKs4Shortlist: false,
  });
  if (withItems.join(",") !== "childminders,ks2") {
    console.error("FAIL shortlist paths", withItems);
    process.exit(1);
  }

  const picked = pickDefaultComparePath(available, withItems);
  if (picked !== "childminders") {
    console.error("FAIL default should prefer shortlisted path", picked);
    process.exit(1);
  }

  if (pickDefaultComparePath(["ks2"], []) !== "ks2") {
    console.error("FAIL fallback to first available");
    process.exit(1);
  }
  if (pickDefaultComparePath([], ["ks2"]) !== null) {
    console.error("FAIL empty available");
    process.exit(1);
  }

  console.log("compare paths ok");
}

main();
