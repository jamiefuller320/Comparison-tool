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
  } = await import("../src/lib/laPacks.ts");

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
        rwmExpected: 70,
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
        name: "Surrey Primary",
        localAuthority: "Surrey",
        rwmExpected: 65,
      },
      { urn: "1", name: "Override", localAuthority: "Surrey", rwmExpected: 1 },
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

  const py = spawnSync(
    "python3",
    [
      "-c",
      `
from seed_scope import (
  SEED_LOCAL_AUTHORITY,
  la_slug,
  normalize_la_name,
  is_local_authority,
  filter_schools_to_la,
  pack_rel_dir,
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
