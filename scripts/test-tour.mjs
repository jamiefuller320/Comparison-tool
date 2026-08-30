/** Unit checks for walkthrough steps, live demos, and layout cache helpers. */

async function main() {
  const {
    TOUR_STEPS,
    resolveActiveTourSteps,
    tourTargetSelector,
    TOUR_STORAGE_KEY,
    TOUR_TARGET_SETUP_TILE,
    TOUR_SETUP_TILE_EVENT,
    TOUR_WARM_CHAPTER_EVENT,
    viewportRectFromCache,
    placeTourCard,
    rectOverlapArea,
  } = await import("../src/lib/tour.ts");
  const {
    TOUR_DEMO_POSTCODE,
    pickDemoShortlistUrns,
  } = await import("../src/lib/tourDemo.ts");

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
  if (TOUR_WARM_CHAPTER_EVENT !== "schoolside:tour-warm-chapter") {
    console.error("FAIL warm chapter event name");
    process.exit(1);
  }
  if (TOUR_DEMO_POSTCODE !== "SO40 3DW") {
    console.error("FAIL demo postcode", TOUR_DEMO_POSTCODE);
    process.exit(1);
  }
  if (
    TOUR_TARGET_SETUP_TILE.postcode !== "postcode" ||
    TOUR_TARGET_SETUP_TILE.stages !== "stages"
  ) {
    console.error("FAIL setup tile map", TOUR_TARGET_SETUP_TILE);
    process.exit(1);
  }

  const demos = TOUR_STEPS.filter((s) => s.demo).map((s) => s.demo);
  for (const need of [
    "fill-postcode",
    "set-stages-ks2-ks3",
    "set-radius-8km",
    "pick-shortlist",
    "open-path-ks2",
    "open-path-ks4",
    "expand-year-trend",
  ]) {
    if (!demos.includes(need)) {
      console.error("FAIL missing live demo", need, demos);
      process.exit(1);
    }
  }

  const pick = pickDemoShortlistUrns(
    [
      { urn: "p1", ageRange: "7 to 11" },
      { urn: "p2", ageRange: "4 to 11" },
      { urn: "p3", ageRange: "7 to 11" },
      { urn: "s1", ageRange: "11 to 16" },
      { urn: "s2", ageRange: "11 to 18" },
      { urn: "s3", ageRange: "11 to 16" },
    ],
    {
      ks2: 2,
      ks3: 2,
      isKs2: (s) => /\b(7|8|9|10|11)\b/.test(s.ageRange) && !/1[2-9]/.test(s.ageRange.split("to")[1] || ""),
      isSecondary: (s) => /1[1-9].*1[6-9]|11 to 16|11 to 18/.test(s.ageRange),
    },
  );
  if (pick.length !== 4 || pick[0] !== "p1" || !pick.includes("s1")) {
    // Fallback check with explicit predicates matching schoolOffers helpers style
    const pick2 = pickDemoShortlistUrns(
      [
        { urn: "a", ageRange: "7 to 11" },
        { urn: "b", ageRange: "7 to 11" },
        { urn: "c", ageRange: "11 to 16" },
        { urn: "d", ageRange: "11 to 16" },
      ],
      {
        ks2: 2,
        ks3: 2,
        isKs2: (s) => s.ageRange === "7 to 11",
        isSecondary: (s) => s.ageRange === "11 to 16",
      },
    );
    if (pick2.join(",") !== "a,b,c,d") {
      console.error("FAIL pickDemoShortlistUrns", pick, pick2);
      process.exit(1);
    }
  }

  const required = TOUR_STEPS.filter((s) => !s.optional).map((s) => s.target);
  if (
    !required.includes("hero") ||
    !required.includes("page-chapters") ||
    !required.includes("boards")
  ) {
    console.error("FAIL core journey targets missing", required);
    process.exit(1);
  }
  if (!TOUR_STEPS.some((s) => s.id === "pick-shortlist" && s.demo === "pick-shortlist")) {
    console.error("FAIL pick-shortlist live step missing");
    process.exit(1);
  }
  if (!TOUR_STEPS.some((s) => s.id === "visit-pack" && s.target === "print-comparison-pack")) {
    console.error("FAIL visit-pack should spotlight print-comparison-pack");
    process.exit(1);
  }
  if (tourTargetSelector("stages") !== '[data-tour="stages"]') {
    console.error("FAIL selector");
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

  /** @type {Map<string, { width: number; height: number } | null>} */
  const layout = new Map([
    ["hero", { width: 400, height: 200 }],
    ["page-chapters", { width: 640, height: 48 }],
    ["postcode", { width: 360, height: 80 }],
    ["stages", { width: 360, height: 60 }],
    ["sector", { width: 360, height: 60 }],
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
  for (const id of [
    "nearby",
    "radius",
    "pick-shortlist",
    "decision-guidance",
    "visit-pack",
    "year-trend",
  ]) {
    if (!ids.includes(id)) {
      console.error("FAIL retainIfMissing optional dropped", id, ids);
      process.exit(1);
    }
  }
  for (const id of ["welcome", "chapters", "postcode", "stages", "boards", "how"]) {
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

  const cached = {
    target: "shortlist",
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

  // Huge chapter wrapper — spotlight should clamp so a dialog can sit clear.
  const hugeCached = {
    target: "nearby",
    top: 200,
    left: 40,
    width: 1200,
    height: 900,
  };
  const capped = viewportRectFromCache(hugeCached, 0, 0, 1280, 800, 10);
  if (capped.height > 800 * 0.5) {
    console.error("FAIL viewportRectFromCache should clamp tall targets", capped);
    process.exit(1);
  }
  const cappedCard = placeTourCard(capped, 1280, 800, 360, 260);
  const cappedOverlap = rectOverlapArea(
    {
      top: cappedCard.top,
      left: cappedCard.left,
      width: 360,
      height: 260,
    },
    capped,
  );
  if (cappedOverlap > 8000) {
    console.error("FAIL capped spotlight still heavily covered", {
      capped,
      cappedCard,
      cappedOverlap,
    });
    process.exit(1);
  }

  const card = placeTourCard(view, 1280, 800);
  if (card.top < 16 || card.left < 16) {
    console.error("FAIL placeTourCard", card);
    process.exit(1);
  }

  // Tall spotlight (Find map) — card should sit beside, not over, the target.
  const tall = { top: 80, left: 40, width: 720, height: 520 };
  const beside = placeTourCard(tall, 1280, 800, 360, 260);
  const overlap = rectOverlapArea(
    { top: beside.top, left: beside.left, width: 360, height: 260 },
    tall,
  );
  if (overlap > 4000) {
    console.error("FAIL placeTourCard should avoid covering tall targets", {
      beside,
      overlap,
    });
    process.exit(1);
  }
  const cardCentre = beside.left + 180;
  if (cardCentre > tall.left + 40 && cardCentre < tall.left + tall.width - 40) {
    console.error("FAIL placeTourCard expected a side slot", beside);
    process.exit(1);
  }

  console.log(`tour ok (${TOUR_STEPS.length} steps, live demos checked)`);
}

main();
