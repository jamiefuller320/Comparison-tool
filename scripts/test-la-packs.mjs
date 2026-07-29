import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const {
    SEED_LOCAL_AUTHORITY,
    laSlug,
    normalizeLaName,
    isLocalAuthority,
    isSeedLocalAuthority,
    packDataPath,
    listReadyPacks,
    mergeSchoolsIndexWithPack,
    mergeSchoolsIndexWithPacks,
    mergeEyProvidersWithPacks,
    mergeChildmindersWithPacks,
    recomputeSectorKs4Benches,
  } = await import("../src/lib/laPacks.ts");

  const { eyfspLaColumns } = await import("../src/lib/eyfspMetrics.ts");

  if (SEED_LOCAL_AUTHORITY !== "Hampshire") {
    console.error("FAIL seed LA", SEED_LOCAL_AUTHORITY);
    process.exit(1);
  }
  if (laSlug("Brighton and Hove") !== "brighton-and-hove") {
    console.error("FAIL laSlug", laSlug("Brighton and Hove"));
    process.exit(1);
  }
  if (!isLocalAuthority(" surrey ", "Surrey") || isSeedLocalAuthority("Surrey")) {
    console.error("FAIL isLocalAuthority");
    process.exit(1);
  }
  if (normalizeLaName("  Surrey  ") !== "Surrey") {
    console.error("FAIL normalizeLaName");
    process.exit(1);
  }
  if (packDataPath("Surrey") !== "/data/packs/surrey/schools-index.json") {
    console.error("FAIL packDataPath", packDataPath("Surrey"));
    process.exit(1);
  }

  const ready = listReadyPacks({
    seedLocalAuthority: "Hampshire",
    packs: {
      surrey: {
        localAuthority: "Surrey",
        slug: "surrey",
        status: "ready",
        schoolCount: 10,
      },
      building: {
        localAuthority: "Kent",
        slug: "kent",
        status: "building",
      },
    },
  });
  if (ready.length !== 1 || ready[0].slug !== "surrey") {
    console.error("FAIL listReadyPacks", ready);
    process.exit(1);
  }

  const seed = {
    generatedAt: "2026-07-28",
    period: "2024/2025",
    source: { api: "x", datasets: {}, primarySite: "y", note: "seed." },
    benchmarks: {
      england: { rwmExpected: 60 },
      localAuthorities: { Hampshire: { rwmExpected: 61 } },
      independent: { att8Average: 50, schoolCount: 1 },
      stateKs4: { att8Average: 40, schoolCount: 1 },
      phonics: {
        period: "2024/2025",
        england: { year1Expected: 80 },
        localAuthorities: { Hampshire: { year1Expected: 79 } },
      },
    },
    schools: [
      {
        urn: "1",
        name: "Hants Primary",
        localAuthority: "Hampshire",
        sector: "state",
        rwmExpected: 70,
        att8Average: 40,
      },
    ],
    stats: { schoolCount: 1, withRwm: 1, localAuthorityCount: 1 },
  };
  const pack = {
    generatedAt: "2026-07-28",
    period: "2024/2025",
    maintainedScope: "Surrey",
    source: { api: "x", datasets: {}, primarySite: "y", note: "pack." },
    benchmarks: {
      england: { rwmExpected: 60 },
      localAuthorities: { Surrey: { rwmExpected: 62 } },
      phonics: {
        period: "2024/2025",
        england: { year1Expected: 80 },
        localAuthorities: { Surrey: { year1Expected: 78 } },
      },
    },
    schools: [
      {
        urn: "2",
        name: "Surrey Secondary",
        localAuthority: "Surrey",
        sector: "state",
        rwmExpected: 65,
        att8Average: 50,
        ageRange: "11 to 16",
      },
      {
        urn: "1",
        name: "Override",
        localAuthority: "Surrey",
        sector: "state",
        rwmExpected: 1,
        att8Average: 44,
      },
    ],
    stats: { schoolCount: 2, withRwm: 2, localAuthorityCount: 1 },
  };
  const merged = mergeSchoolsIndexWithPack(seed, pack, {
    slug: "surrey",
    localAuthority: "Surrey",
  });
  if (merged.schools.length !== 2) {
    console.error("FAIL merge school count", merged.schools);
    process.exit(1);
  }
  if (merged.schools.find((s) => s.urn === "1")?.name !== "Override") {
    console.error("FAIL pack wins on URN", merged.schools);
    process.exit(1);
  }
  if (
    !merged.benchmarks.localAuthorities.Hampshire ||
    !merged.benchmarks.localAuthorities.Surrey
  ) {
    console.error("FAIL LA benches union", merged.benchmarks.localAuthorities);
    process.exit(1);
  }
  if (
    merged.benchmarks.phonics?.localAuthorities?.Hampshire?.year1Expected !==
      79 ||
    merged.benchmarks.phonics?.localAuthorities?.Surrey?.year1Expected !== 78
  ) {
    console.error("FAIL phonics union", merged.benchmarks.phonics);
    process.exit(1);
  }
  if (
    !Array.isArray(merged.collatedPackLabels) ||
    merged.collatedPackLabels[0] !== "Surrey"
  ) {
    console.error("FAIL collatedPackLabels", merged.collatedPackLabels);
    process.exit(1);
  }
  // Override (44) + Surrey Secondary (50) → mean 47
  if (merged.benchmarks.stateKs4?.att8Average !== 47) {
    console.error(
      "FAIL recomputed stateKs4",
      merged.benchmarks.stateKs4?.att8Average,
    );
    process.exit(1);
  }
  const recomputed = recomputeSectorKs4Benches(merged.schools, {
    stateKs4: seed.benchmarks.stateKs4,
  });
  if (recomputed.stateKs4.att8Average !== 47) {
    console.error("FAIL recomputeSectorKs4Benches", recomputed.stateKs4);
    process.exit(1);
  }

  const pack2 = {
    generatedAt: "2026-07-28",
    period: "2024/2025",
    source: { api: "x", datasets: {}, primarySite: "y", note: "iow." },
    benchmarks: {
      england: { rwmExpected: 60 },
      localAuthorities: { "Isle of Wight": { rwmExpected: 58 } },
    },
    schools: [
      {
        urn: "3",
        name: "IoW Primary",
        localAuthority: "Isle of Wight",
        rwmExpected: 55,
      },
    ],
    stats: { schoolCount: 1, withRwm: 1, localAuthorityCount: 1 },
  };
  const multi = mergeSchoolsIndexWithPacks(seed, [
    { index: pack, meta: { slug: "surrey", localAuthority: "Surrey" } },
    {
      index: pack2,
      meta: { slug: "isle-of-wight", localAuthority: "Isle of Wight" },
    },
  ]);
  if (multi.schools.length !== 3) {
    console.error("FAIL multi-pack school count", multi.schools);
    process.exit(1);
  }
  if (
    !multi.collatedPackLabels?.includes("Surrey") ||
    !multi.collatedPackLabels?.includes("Isle of Wight")
  ) {
    console.error("FAIL multi collated labels", multi.collatedPackLabels);
    process.exit(1);
  }
  if (!multi.source.note.includes("Isle of Wight")) {
    console.error("FAIL multi source note", multi.source.note);
    process.exit(1);
  }

  const eySeed = {
    generatedAt: "2026-07-29",
    localAuthority: "Hampshire",
    source: { note: "seed ey." },
    benchmarks: {
      eyfsp: {
        period: "2024/2025",
        england: { gldPercent: 67 },
        localAuthorities: { Hampshire: { gldPercent: 70 } },
      },
    },
    providers: [{ urn: "ey1", name: "Hants Nursery", localAuthority: "Hampshire" }],
    stats: { providerCount: 1 },
  };
  const eyPack = {
    generatedAt: "2026-07-29",
    localAuthority: "Surrey",
    source: { note: "pack ey." },
    benchmarks: {
      eyfsp: {
        period: "2024/2025",
        england: { gldPercent: 67 },
        localAuthorities: { Surrey: { gldPercent: 68 } },
      },
    },
    providers: [
      { urn: "ey2", name: "Surrey Nursery", localAuthority: "Surrey" },
      { urn: "ey1", name: "Override Nursery", localAuthority: "Surrey" },
    ],
    stats: { providerCount: 2 },
  };
  const eyMerged = mergeEyProvidersWithPacks(eySeed, [
    { index: eyPack, meta: { slug: "surrey", localAuthority: "Surrey" } },
  ]);
  if (eyMerged.providers.length !== 2) {
    console.error("FAIL EY merge count", eyMerged.providers);
    process.exit(1);
  }
  if (eyMerged.providers.find((p) => p.urn === "ey1")?.name !== "Override Nursery") {
    console.error("FAIL EY pack wins on URN", eyMerged.providers);
    process.exit(1);
  }
  if (
    eyMerged.benchmarks.eyfsp?.localAuthorities?.Hampshire?.gldPercent !== 70 ||
    eyMerged.benchmarks.eyfsp?.localAuthorities?.Surrey?.gldPercent !== 68
  ) {
    console.error("FAIL EYFSP LA union", eyMerged.benchmarks.eyfsp);
    process.exit(1);
  }
  if (eyMerged.benchmarks.eyfsp?.england?.gldPercent !== 67) {
    console.error("FAIL EYFSP england seed retained", eyMerged.benchmarks.eyfsp);
    process.exit(1);
  }
  const cols = eyfspLaColumns(eyMerged.benchmarks.eyfsp);
  if (cols[0] !== "Hampshire" || !cols.includes("Surrey")) {
    console.error("FAIL eyfspLaColumns order", cols);
    process.exit(1);
  }

  const cmSeed = {
    generatedAt: "2026-07-29",
    localAuthority: "Hampshire",
    source: { note: "seed cm." },
    providers: [{ urn: "cm1", name: "Hants CM", localAuthority: "Hampshire" }],
    stats: { providerCount: 1 },
  };
  const cmEmpty = {
    generatedAt: "2026-07-29",
    localAuthority: "Surrey",
    source: { note: "empty cm." },
    providers: [],
    stats: { providerCount: 0 },
  };
  const cmPack = {
    generatedAt: "2026-07-29",
    localAuthority: "Isle of Wight",
    source: { note: "iow cm." },
    providers: [{ urn: "cm2", name: "IoW CM", localAuthority: "Isle of Wight" }],
    stats: { providerCount: 1 },
  };
  const cmMerged = mergeChildmindersWithPacks(cmSeed, [
    { index: cmEmpty, meta: { slug: "surrey", localAuthority: "Surrey" } },
    {
      index: cmPack,
      meta: { slug: "isle-of-wight", localAuthority: "Isle of Wight" },
    },
  ]);
  if (cmMerged.providers.length !== 2) {
    console.error("FAIL CM merge with empty pack", cmMerged.providers);
    process.exit(1);
  }
  if (
    !cmMerged.collatedPackLabels?.includes("Surrey") ||
    !cmMerged.collatedPackLabels?.includes("Isle of Wight")
  ) {
    console.error("FAIL CM collated labels", cmMerged.collatedPackLabels);
    process.exit(1);
  }

  const py = spawnSync(
    "python3",
    [
      "-c",
      `
from pathlib import Path
from seed_scope import (
  SEED_LOCAL_AUTHORITY,
  la_slug,
  normalize_la_name,
  is_local_authority,
  filter_schools_to_la,
  pack_rel_dir,
  resolve_index_bundle,
  resolve_la_from_ees_meta,
)
assert SEED_LOCAL_AUTHORITY == "Hampshire"
assert la_slug("Brighton and Hove") == "brighton-and-hove"
assert normalize_la_name("  Surrey  ") == "Surrey"
assert is_local_authority("surrey", "Surrey")
schools = [
  {"urn": "1", "localAuthority": "Surrey"},
  {"urn": "2", "localAuthority": "Hampshire"},
]
assert [s["urn"] for s in filter_schools_to_la(schools, "Surrey")] == ["1"]
assert pack_rel_dir("Surrey") == "public/data/packs/surrey"
# cwd is scripts/ when spawned from test-la-packs.mjs
root = Path.cwd().parent
bundle = resolve_index_bundle("public/data/packs/surrey/schools-index.json", root)
assert bundle["is_root"] is False
assert bundle["directory"].name == "schools-directory.json"
root_bundle = resolve_index_bundle("public/data/schools-index.json", root)
assert root_bundle["is_root"] is True
meta = {
  "locations": [
    {
      "level": {"code": "LA"},
      "options": [
        {"id": "abc", "label": "Surrey", "code": "E10000030", "oldCode": "936"},
      ],
    }
  ]
}
resolved = resolve_la_from_ees_meta(meta, "Surrey")
assert resolved and resolved["id"] == "abc"
assert resolve_la_from_ees_meta(meta, "NotARealLA") is None
print("python la pack helpers ok")
`,
    ],
    {
      cwd: dirname(fileURLToPath(import.meta.url)),
      encoding: "utf-8",
    },
  );
  if (py.status !== 0) {
    console.error("FAIL python helpers", py.stdout, py.stderr);
    process.exit(1);
  }

  console.log("la packs helpers + merge ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
