import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const {
    SEED_LOCAL_AUTHORITY,
    SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES,
    isSeedLocalAuthority,
    isSoutheastPlusDorsetLocalAuthority,
  } = await import("../src/lib/seedScope.ts");

  if (SEED_LOCAL_AUTHORITY !== "Hampshire") {
    console.error("FAIL seed LA should be Hampshire", SEED_LOCAL_AUTHORITY);
    process.exit(1);
  }
  if (!isSeedLocalAuthority("Hampshire") || !isSeedLocalAuthority(" hampshire ")) {
    console.error("FAIL isSeedLocalAuthority Hampshire");
    process.exit(1);
  }
  if (isSeedLocalAuthority("Southampton") || isSeedLocalAuthority("Portsmouth")) {
    console.error("FAIL unitaries must not count as seed Hampshire");
    process.exit(1);
  }
  if (
    !isSoutheastPlusDorsetLocalAuthority("Dorset") ||
    !isSoutheastPlusDorsetLocalAuthority("Southampton") ||
    !isSoutheastPlusDorsetLocalAuthority("Bournemouth, Christchurch and Poole")
  ) {
    console.error("FAIL SE+Dorset membership", SOUTHEAST_PLUS_DORSET_LOCAL_AUTHORITIES);
    process.exit(1);
  }
  if (isSoutheastPlusDorsetLocalAuthority("Devon")) {
    console.error("FAIL Devon must not be in SE+Dorset region");
    process.exit(1);
  }

  const py = spawnSync(
    "python3",
    [
      "-c",
      `
from seed_scope import (
  SEED_LOCAL_AUTHORITY,
  filter_schools_to_seed_la,
  is_local_authority,
  is_seed_local_authority,
  is_southeast_plus_dorset_local_authority,
  southeast_plus_dorset_pack_targets,
  trim_la_benchmarks,
)
assert SEED_LOCAL_AUTHORITY == "Hampshire"
schools = [
  {"urn": "1", "localAuthority": "Hampshire"},
  {"urn": "2", "localAuthority": "Southampton"},
  {"urn": "3", "localAuthority": "Portsmouth"},
]
kept = filter_schools_to_seed_la(schools)
assert [s["urn"] for s in kept] == ["1"], kept
benches = trim_la_benchmarks({
  "Hampshire": {"rwmExpected": 70},
  "Surrey": {"rwmExpected": 71},
})
assert list(benches) == ["Hampshire"], benches
assert is_seed_local_authority("Hampshire")
assert not is_seed_local_authority("Southampton")
assert is_southeast_plus_dorset_local_authority("Dorset")
assert "Hampshire" not in southeast_plus_dorset_pack_targets()
assert "Southampton" in southeast_plus_dorset_pack_targets()
assert is_local_authority(
  "Bournemouth, Christchurch & Poole",
  "Bournemouth, Christchurch and Poole",
)
print("python seed_scope ok")
`,
    ],
    { cwd: dirname(fileURLToPath(import.meta.url)), encoding: "utf-8" },
  );
  if (py.status !== 0) {
    console.error("FAIL python seed_scope helpers", py.stdout, py.stderr);
    process.exit(1);
  }

  console.log("seed scope ok (Hampshire + trim helpers)");
}

main();
