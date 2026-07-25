async function main() {
  const {
    DEFAULT_EY_SETTINGS,
    parseEySettingsParam,
    normalizeEySettingIds,
    toggleEySetting,
    wantsNurseries,
    wantsChildminders,
  } = await import("../src/lib/eySettings.ts");

  if (DEFAULT_EY_SETTINGS.length !== 2) {
    console.error("FAIL default both on");
    process.exit(1);
  }
  if (parseEySettingsParam(null).join(",") !== "nurseries,childminders") {
    console.error("FAIL null defaults");
    process.exit(1);
  }
  if (parseEySettingsParam("childminders").join(",") !== "childminders") {
    console.error("FAIL parse childminders only");
    process.exit(1);
  }
  if (normalizeEySettingIds(["daycare", "cm"]).join(",") !== "nurseries,childminders") {
    console.error("FAIL aliases");
    process.exit(1);
  }
  const both = [...DEFAULT_EY_SETTINGS];
  const nurseriesOnly = toggleEySetting(both, "childminders");
  if (nurseriesOnly.join(",") !== "nurseries") {
    console.error("FAIL toggle off childminders", nurseriesOnly);
    process.exit(1);
  }
  if (toggleEySetting(["nurseries"], "nurseries").join(",") !== "nurseries") {
    console.error("FAIL must keep at least one");
    process.exit(1);
  }
  if (!wantsNurseries(["nurseries"]) || wantsChildminders(["nurseries"])) {
    console.error("FAIL wants helpers");
    process.exit(1);
  }

  console.log("ey settings ok");
}

main();
