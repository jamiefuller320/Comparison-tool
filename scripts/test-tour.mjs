/** Unit checks for walkthrough steps and layout cache helpers. */

async function main() {
  const {
    TOUR_STEPS,
    resolveActiveTourSteps,
    tourTargetSelector,
    TOUR_STORAGE_KEY,
    TOUR_TARGET_SETUP_TILE,
    TOUR_SETUP_TILE_EVENT,
    viewportRectFromCache,
    placeTourCard,
  } = await import("../src/lib/tour.ts");

  if (TOUR_STEPS.length < 10) {
    console.error("FAIL expected a full journey tour script", TOUR_STEPS.length);
    process.exit(1);
  }
  if (!TOUR_STORAGE_KEY.startsWith("schoolside.")) {
    console.error("FAIL storage key namespace");
    process.exit(1);
  }
  if (TOUR_SETUP_TILE_EVENT !== "schoolside:tour-setup-tile") {
    console.error("FAIL setup tile event name");
    process.exit(1);
  }
  if (
    TOUR_TARGET_SETUP_TILE.postcode !== "postcode" ||
    TOUR_TARGET_SETUP_TILE.stages !== "stages" ||
    TOUR_TARGET_SETUP_TILE.sector !== "sector" ||
    TOUR_TARGET_SETUP_TILE.provision !== "provision"
  ) {
    console.error("FAIL setup tile map", TOUR_TARGET_SETUP_TILE);
    process.exit(1);
  }

  const required = TOUR_STEPS.filter((s) => !s.optional).map((s) => s.target);
  const optional = TOUR_STEPS.filter((s) => s.optional).map((s) => s.target);
  if (
    !required.includes("hero") ||
    !required.includes("page-chapters") ||
    !required.includes("search") ||
    !required.includes("boards")
  ) {
    console.error("FAIL core journey targets missing", required);
    process.exit(1);
  }
  if (!optional.includes("nearby") || !optional.includes("radius")) {
    console.error("FAIL nearby/radius should be optional");
    process.exit(1);
  }
  if (!optional.includes("provision")) {
    console.error("FAIL provision tour step should be optional");
    process.exit(1);
  }
  if (!optional.includes("childminders")) {
    console.error("FAIL childminders tour step should be optional");
    process.exit(1);
  }
  if (optional.includes("ey-settings")) {
    console.error("FAIL nested ey-settings tour step should be removed");
    process.exit(1);
  }
  if (!optional.includes("visit-pack")) {
    console.error("FAIL visit-pack tour step should be optional");
    process.exit(1);
  }
  if (!optional.includes("decision-guidance")) {
    console.error("FAIL decision-guidance tour step should be optional");
    process.exit(1);
  }
  if (tourTargetSelector("stages") !== '[data-tour="stages"]') {
    console.error("FAIL selector");
    process.exit(1);
  }

  if (!TOUR_STEPS.some((s) => s.id === "year-trend" && s.target === "year-trend")) {
    console.error("FAIL year-trend step missing");
    process.exit(1);
  }
  const yearTrend = TOUR_STEPS.find((s) => s.id === "year-trend");
  if (!yearTrend?.optional || !yearTrend.retainIfMissing) {
    console.error("FAIL year-trend should be optional + retainIfMissing");
    process.exit(1);
  }
  if (!yearTrend?.body.toLowerCase().includes("covid")) {
    console.error("FAIL year-trend copy should explain the graph / COVID gap");
    process.exit(1);
  }

  const chapters = TOUR_STEPS.find((s) => s.id === "chapters");
  if (!chapters || chapters.target !== "page-chapters") {
    console.error("FAIL chapters step should target page-chapters");
    process.exit(1);
  }
  if (!/setup|find|shortlist|side by side|understand/i.test(chapters.body)) {
    console.error("FAIL chapters copy should name journey tabs", chapters.body);
    process.exit(1);
  }

  // Setup-only layout: peer-chapter optionals are retained for later mounts.
  /** @type {Map<string, { width: number; height: number } | null>} */
  const layout = new Map([
    ["hero", { width: 400, height: 200 }],
    ["page-chapters", { width: 640, height: 48 }],
    ["postcode", { width: 360, height: 80 }],
    ["stages", { width: 360, height: 60 }],
    ["sector", { width: 360, height: 60 }],
    ["search", { width: 360, height: 56 }],
    ["shortlist", { width: 360, height: 40 }],
    ["boards", { width: 400, height: 120 }],
    ["how", { width: 400, height: 100 }],
  ]);

  const fakeDoc = {
    querySelector(sel) {
      const match = /^\[data-tour="([^"]+)"\]$/.exec(sel);
      if (!match) return null;
      const key = match[1];
      if (!layout.has(key)) return null;
      const box = layout.get(key);
      if (!box) return null;
      return {
        getBoundingClientRect() {
          return box;
        },
      };
    },
  };

  const active = resolveActiveTourSteps(TOUR_STEPS, fakeDoc);
  const ids = active.map((s) => s.id);
  // Deferred optionals stay in the script even when Find / Side by side
  // aren’t mounted yet.
  for (const id of [
    "nearby",
    "radius",
    "provision",
    "childminders",
    "decision-guidance",
    "visit-pack",
    "year-trend",
  ]) {
    if (!ids.includes(id)) {
      console.error("FAIL retainIfMissing optional dropped", id, ids);
      process.exit(1);
    }
  }
  for (const id of [
    "welcome",
    "chapters",
    "postcode",
    "stages",
    "search",
    "boards",
    "how",
  ]) {
    if (!ids.includes(id)) {
      console.error("FAIL missing required step", id, ids);
      process.exit(1);
    }
  }

  layout.set("nearby", { width: 480, height: 320 });
  layout.set("radius", { width: 400, height: 40 });
  const withNearby = resolveActiveTourSteps(TOUR_STEPS, fakeDoc).map((s) => s.id);
  if (!withNearby.includes("nearby") || !withNearby.includes("radius")) {
    console.error("FAIL nearby/radius should appear when laid out", withNearby);
    process.exit(1);
  }

  // Zero-size optional without retainIfMissing is still skipped.
  const transientOptional = [
    ...TOUR_STEPS,
    {
      id: "ghost",
      target: "ghost",
      title: "Ghost",
      body: "Hidden",
      optional: true,
    },
  ];
  layout.set("ghost", { width: 0, height: 0 });
  const withGhost = resolveActiveTourSteps(transientOptional, fakeDoc).map(
    (s) => s.id,
  );
  if (withGhost.includes("ghost")) {
    console.error("FAIL zero-size optional without retain should drop");
    process.exit(1);
  }

  const cached = {
    target: "search",
    top: 1200,
    left: 40,
    width: 360,
    height: 56,
  };
  const view = viewportRectFromCache(cached, 0, 1000, 1280, 800, 10);
  if (view.top !== 190 || view.left !== 30 || view.width !== 380 || view.height !== 76) {
    console.error("FAIL viewportRectFromCache", view);
    process.exit(1);
  }

  const card = placeTourCard(view, 1280, 800);
  if (card.top < view.top || card.left < 16) {
    console.error("FAIL placeTourCard", card);
    process.exit(1);
  }

  console.log(`tour ok (${TOUR_STEPS.length} steps, cache helpers checked)`);
}

main();
