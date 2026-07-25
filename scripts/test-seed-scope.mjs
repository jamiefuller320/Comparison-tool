async function main() {
  const {
    SEED_LOCAL_AUTHORITY,
    isSeedLocalAuthority,
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
  console.log("seed scope ok (Hampshire)");
}

main();
