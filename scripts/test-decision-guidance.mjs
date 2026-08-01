/** Unit checks for parent decision-guidance copy. */

async function main() {
  const {
    DECISION_GUIDANCE,
    guidanceForPath,
    guidancePrintLines,
  } = await import("../src/lib/decisionGuidance.ts");

  const paths = [
    "general",
    "ks1",
    "ks2",
    "ks4",
    "early-years",
    "childminders",
  ];
  for (const path of paths) {
    const content = DECISION_GUIDANCE[path];
    if (!content?.heading || !content.lead) {
      console.error("FAIL missing heading/lead", path);
      process.exit(1);
    }
    for (const need of ["telling", "limits", "use"]) {
      const section = content.sections.find((s) => s.id === need);
      if (!section || section.items.length < 2) {
        console.error("FAIL section", path, need);
        process.exit(1);
      }
    }
  }

  if (guidanceForPath(null).path !== "general") {
    console.error("FAIL null path should fall back to general");
    process.exit(1);
  }
  const print = guidancePrintLines("ks4");
  if (!print.title.toLowerCase().includes("key stage 4") || print.lines.length < 3) {
    console.error("FAIL ks4 print lines", print);
    process.exit(1);
  }

  console.log("decision guidance ok");
}

main();
