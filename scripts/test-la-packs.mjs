async function main() {
  const {
    SEED_LOCAL_AUTHORITY,
    laSlug,
    normalizeLaName,
    isLocalAuthority,
    isSeedLocalAuthority,
    packDataPath,
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

  const py = await import("node:child_process").then((m) =>
    m.spawnSync(
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
        cwd: new URL(".", import.meta.url).pathname,
        encoding: "utf-8",
      },
    ),
  );
  if (py.status !== 0) {
    console.error("FAIL python helpers", py.stdout, py.stderr);
    process.exit(1);
  }

  console.log("la packs helpers ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
