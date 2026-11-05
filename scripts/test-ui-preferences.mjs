async function main() {
  const {
    COMPARE_TABLE_IDS,
    defaultUiPreferences,
    normalizeUiPreferences,
  } = await import("../src/lib/uiPreferences.ts");

  const defaults = defaultUiPreferences();
  for (const id of COMPARE_TABLE_IDS) {
    const row = defaults.tables[id];
    if (!row?.stickyHeader || !row?.stickyFirstColumn) {
      console.error("FAIL default sticky prefs", id, row);
      process.exit(1);
    }
  }

  const normalized = normalizeUiPreferences({
    tables: {
      ks2: { stickyHeader: false, stickyFirstColumn: true },
      mystery: { stickyHeader: false, stickyFirstColumn: false },
    },
  });
  if (normalized.tables.ks2.stickyHeader !== false) {
    console.error("FAIL ks2 stickyHeader patch", normalized.tables.ks2);
    process.exit(1);
  }
  if (!normalized.tables.phonics.stickyHeader) {
    console.error("FAIL phonics should keep defaults", normalized.tables.phonics);
    process.exit(1);
  }
  if ("mystery" in normalized.tables) {
    console.error("FAIL unknown table id should be ignored");
    process.exit(1);
  }

  const empty = normalizeUiPreferences(null);
  if (empty.tables.ks2.stickyHeader !== true || !empty.tables.ks2.stickyFirstColumn) {
    console.error("FAIL null input should default tables", empty.tables.ks2);
    process.exit(1);
  }

  console.log("ui preferences helpers ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
