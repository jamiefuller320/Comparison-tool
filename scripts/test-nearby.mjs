async function main() {
  const {
    compareNearbySchools,
    findNearbySchools,
    haversineMetres,
  } = await import("../src/lib/nearby.ts");
  const { schoolMatchesPhases } = await import("../src/lib/phases.ts");

  const home = { latitude: 50.7, longitude: -1.3 };
  // Closer secondary (~1 km south) vs farther primary (~3 km north) that matches KS2.
  const secondary = {
    urn: "s1",
    name: "Close Secondary",
    ageRange: "11 to 16",
    sector: "state",
    latitude: 50.691,
    longitude: -1.3,
  };
  const primary = {
    urn: "p1",
    name: "Farther Primary",
    ageRange: "4 to 11",
    sector: "state",
    latitude: 50.727,
    longitude: -1.3,
  };

  const dSec = haversineMetres(
    home.latitude,
    home.longitude,
    secondary.latitude,
    secondary.longitude,
  );
  const dPri = haversineMetres(
    home.latitude,
    home.longitude,
    primary.latitude,
    primary.longitude,
  );
  if (!(dSec < dPri)) {
    console.error("FAIL fixture distances", { dSec, dPri });
    process.exit(1);
  }

  const distanceOnly = findNearbySchools(home, [secondary, primary], 10000, 40);
  if (distanceOnly[0]?.urn !== "s1") {
    console.error("FAIL distance-only order", distanceOnly.map((s) => s.urn));
    process.exit(1);
  }

  const preferKs2 = (school) => schoolMatchesPhases(school, ["ks2"]);
  if (!preferKs2(primary) || preferKs2(secondary)) {
    console.error("FAIL schoolMatchesPhases fixture", {
      primary: preferKs2(primary),
      secondary: preferKs2(secondary),
    });
    process.exit(1);
  }

  const stageFirst = findNearbySchools(
    home,
    [secondary, primary],
    10000,
    40,
    undefined,
    { prefer: preferKs2 },
  );
  if (stageFirst.map((s) => s.urn).join(",") !== "p1,s1") {
    console.error(
      "FAIL stage-prefer order",
      stageFirst.map((s) => s.urn),
    );
    process.exit(1);
  }

  const cmp = compareNearbySchools(
    { ...secondary, straightLineMetres: 100, roadMetres: 500 },
    { ...primary, straightLineMetres: 300, roadMetres: 200 },
    preferKs2,
  );
  // secondary (a) is off-stage → should sort after preferred primary (b)
  if (cmp <= 0) {
    console.error("FAIL preferred primary should sort before secondary", cmp);
    process.exit(1);
  }

  // Within preferred group, shorter road distance wins.
  const nearPrimary = {
    ...primary,
    urn: "p2",
    straightLineMetres: 400,
    roadMetres: 150,
  };
  const farPrimary = {
    ...primary,
    urn: "p3",
    straightLineMetres: 200,
    roadMetres: 350,
  };
  const within = compareNearbySchools(nearPrimary, farPrimary, preferKs2);
  if (within >= 0) {
    console.error("FAIL road distance within preferred group", within);
    process.exit(1);
  }

  // Limit must keep preferred schools even when farther.
  const fillers = Array.from({ length: 5 }, (_, i) => ({
    urn: `f${i}`,
    name: `Filler ${i}`,
    ageRange: "11 to 16",
    sector: "state",
    latitude: 50.699 - i * 0.001,
    longitude: -1.3,
  }));
  const limited = findNearbySchools(
    home,
    [...fillers, primary],
    10000,
    3,
    undefined,
    { prefer: preferKs2 },
  );
  if (!limited.some((s) => s.urn === "p1")) {
    console.error(
      "FAIL preferred school dropped by limit",
      limited.map((s) => s.urn),
    );
    process.exit(1);
  }
  if (limited[0]?.urn !== "p1") {
    console.error(
      "FAIL preferred school should lead limited list",
      limited.map((s) => s.urn),
    );
    process.exit(1);
  }

  console.log("nearby stage-prefer sort ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
