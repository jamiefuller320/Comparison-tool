async function main() {
  const { headlineForParents } = await import("../src/lib/compare.ts");

  const state = {
    urn: "1",
    name: "State Primary",
    sector: "state",
    rwmExpected: 72,
  };
  const stateLine = headlineForParents(state, 61);
  if (!stateLine.includes("72%") || !stateLine.toLowerCase().includes("reading")) {
    console.error("FAIL state headline", stateLine);
    process.exit(1);
  }

  const indie = {
    urn: "2",
    name: "Indie College",
    sector: "independent",
    att8Average: 58.2,
  };
  const indieLine = headlineForParents(indie, 61, { att8Average: 50.0 });
  if (!indieLine.includes("Attainment 8") || !indieLine.includes("58.2")) {
    console.error("FAIL indie att8 headline", indieLine);
    process.exit(1);
  }

  const isiOnly = {
    urn: "3",
    name: "ISI School",
    sector: "independent",
    inspectorateName: "ISI",
  };
  const isiLine = headlineForParents(isiOnly, 61);
  if (!isiLine.includes("ISI")) {
    console.error("FAIL ISI headline", isiLine);
    process.exit(1);
  }

  const ks5Only = {
    urn: "4",
    name: "Sixth Form Indie",
    sector: "independent",
    ks5ApsPerEntry: 48.5,
    ks5Students: 90,
  };
  const ks5Line = headlineForParents(ks5Only, 61);
  if (!ks5Line.includes("A-level APS") || !ks5Line.includes("48.5")) {
    console.error("FAIL KS5 headline", ks5Line);
    process.exit(1);
  }

  console.log("headlines ok");
}

main();
