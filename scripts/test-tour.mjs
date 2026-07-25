/** Unit checks for walkthrough step resolution (no DOM library required). */

async function main() {
  const {
    TOUR_STEPS,
    resolveActiveTourSteps,
    tourTargetSelector,
    TOUR_STORAGE_KEY,
  } = await import("../src/lib/tour.ts");

  if (TOUR_STEPS.length < 8) {
    console.error("FAIL expected a full tour script", TOUR_STEPS.length);
    process.exit(1);
  }
  if (!TOUR_STORAGE_KEY.startsWith("schoolside.")) {
    console.error("FAIL storage key namespace");
    process.exit(1);
  }

  const required = TOUR_STEPS.filter((s) => !s.optional).map((s) => s.target);
  const optional = TOUR_STEPS.filter((s) => s.optional).map((s) => s.target);
  if (!required.includes("hero") || !required.includes("search")) {
    console.error("FAIL core targets missing");
    process.exit(1);
  }
  if (!optional.includes("nearby") || !optional.includes("radius")) {
    console.error("FAIL nearby/radius should be optional");
    process.exit(1);
  }
  if (tourTargetSelector("stages") !== '[data-tour="stages"]') {
    console.error("FAIL selector");
    process.exit(1);
  }

  /** @type {Map<string, { width: number; height: number } | null>} */
  const layout = new Map([
    ["hero", { width: 400, height: 200 }],
    ["postcode", { width: 360, height: 80 }],
    ["stages", { width: 360, height: 60 }],
    ["sector", { width: 360, height: 60 }],
    ["search", { width: 360, height: 56 }],
    ["shortlist", { width: 360, height: 40 }],
    ["boards", { width: 400, height: 120 }],
    ["how", { width: 400, height: 100 }],
    // nearby / radius intentionally absent
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
  if (ids.includes("nearby") || ids.includes("radius")) {
    console.error("FAIL optional steps should be skipped", ids);
    process.exit(1);
  }
  for (const id of ["welcome", "postcode", "stages", "search", "boards", "how"]) {
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

  console.log(`tour ok (${TOUR_STEPS.length} steps, optional nearby/radius gated)`);
}

main();
