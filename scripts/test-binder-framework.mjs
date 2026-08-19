async function main() {
  const mod = await import("../src/components/BinderTabs.tsx");
  if (typeof mod.BinderTabs !== "function") {
    console.error("FAIL BinderTabs export");
    process.exit(1);
  }

  const hero = await import("../src/components/HeroSetupTiles.tsx");
  if (typeof hero.HeroSetupTiles !== "function") {
    console.error("FAIL HeroSetupTiles export");
    process.exit(1);
  }

  const chapters = await import("../src/components/PageChapterNav.tsx");
  if (typeof chapters.PageChapterNav !== "function") {
    console.error("FAIL PageChapterNav export");
    process.exit(1);
  }

  const paths = await import("../src/components/ComparePathTabs.tsx");
  if (typeof paths.ComparePathTabs !== "function") {
    console.error("FAIL ComparePathTabs export");
    process.exit(1);
  }

  const sections = await import("../src/components/CompareSectionTabs.tsx");
  if (typeof sections.CompareSectionTabs !== "function") {
    console.error("FAIL CompareSectionTabs export");
    process.exit(1);
  }

  console.log("binder framework exports ok");
}

main();
