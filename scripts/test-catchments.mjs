async function main() {
  const {
    bandsForStages,
    catchmentRelationForSchool,
    catchmentRelationLabel,
    classifyCatchmentUnknown,
    featuresForUrns,
    pointInGeometry,
    pointInRing,
  } = await import("../src/lib/catchments.ts");

  const square = {
    type: "Polygon",
    coordinates: [
      [
        [-1.4, 50.9],
        [-1.3, 50.9],
        [-1.3, 51.0],
        [-1.4, 51.0],
        [-1.4, 50.9],
      ],
    ],
  };

  if (!pointInRing(-1.35, 50.95, square.coordinates[0])) {
    console.error("FAIL expected point inside ring");
    process.exit(1);
  }
  if (pointInRing(-1.5, 50.95, square.coordinates[0])) {
    console.error("FAIL expected point outside ring");
    process.exit(1);
  }
  if (!pointInGeometry(-1.35, 50.95, square)) {
    console.error("FAIL pointInGeometry inside");
    process.exit(1);
  }

  const collection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          urn: "u1",
          name: "Test Infant",
          band: "ages-4-6",
        },
        geometry: square,
      },
      {
        type: "Feature",
        properties: {
          urn: "u2",
          name: "Other Junior",
          band: "ages-7-10",
        },
        geometry: square,
      },
    ],
  };

  const ks1Bands = bandsForStages(["ks1"]);
  if (!ks1Bands.includes("ages-4-6")) {
    console.error("FAIL ks1 should use ages-4-6", ks1Bands);
    process.exit(1);
  }

  const feats = featuresForUrns(collection, ["u1", "u2"], ["ages-4-6"]);
  if (feats.length !== 1 || feats[0].properties.urn !== "u1") {
    console.error("FAIL featuresForUrns band filter", feats);
    process.exit(1);
  }

  const inside = catchmentRelationForSchool(
    { latitude: 50.95, longitude: -1.35 },
    collection,
    "u1",
    ["ages-4-6"],
  );
  const outside = catchmentRelationForSchool(
    { latitude: 51.2, longitude: -1.35 },
    collection,
    "u1",
    ["ages-4-6"],
  );
  if (inside !== "in" || outside !== "out") {
    console.error("FAIL catchmentRelationForSchool", { inside, outside });
    process.exit(1);
  }

  if (
    classifyCatchmentUnknown(
      { latitude: 50.95, longitude: -1.35 },
      null,
      "u1",
    ) !== "not-loaded"
  ) {
    console.error("FAIL unknown not-loaded");
    process.exit(1);
  }
  if (
    classifyCatchmentUnknown(
      { latitude: 50.95, longitude: -1.35 },
      collection,
      "missing",
    ) !== "no-polygon"
  ) {
    console.error("FAIL unknown no-polygon");
    process.exit(1);
  }
  if (
    classifyCatchmentUnknown(
      { latitude: 50.95, longitude: -1.35 },
      collection,
      "u1",
      ["ages-11-16"],
    ) !== "wrong-band"
  ) {
    console.error("FAIL unknown wrong-band");
    process.exit(1);
  }
  if (
    catchmentRelationLabel("unknown", "no-polygon") !== "No catchment polygon"
  ) {
    console.error(
      "FAIL catchmentRelationLabel",
      catchmentRelationLabel("unknown", "no-polygon"),
    );
    process.exit(1);
  }

  console.log("OK catchments");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
