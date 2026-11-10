import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const {
    SEO_TOWN_MIN_SCHOOLS,
    getSeoSchool,
    getSeoTown,
    getSeoTownForSchool,
    isSeoAreaIncluded,
    listSeoAreasWithTowns,
    listSeoCoverageAreaSlugs,
    listSeoHampshireSchools,
    listSeoSchools,
    listSeoSchoolsInTown,
    listSeoTowns,
    readSeoCoverage,
    schoolJsonLd,
    schoolPageDescription,
    schoolPageTitle,
    schoolPath,
    schoolPhaseWord,
    schoolPlaceLabel,
    townPageDescription,
    townPageTitle,
    townPath,
    townPlaceLabel,
    townsIndexPath,
  } = await import("../src/lib/seoSchools.ts");

  const coverage = readSeoCoverage();
  if (!coverage.includedAreaSlugs.includes("hampshire")) {
    console.error("FAIL seed missing from coverage", coverage.includedAreaSlugs);
    process.exit(1);
  }
  if (!isSeoAreaIncluded("hampshire")) {
    console.error("FAIL isSeoAreaIncluded hampshire");
    process.exit(1);
  }
  if (SEO_TOWN_MIN_SCHOOLS !== 8) {
    console.error("FAIL town min must stay 8", SEO_TOWN_MIN_SCHOOLS);
    process.exit(1);
  }
  if (coverage.policy.townMinSchools !== 8) {
    console.error("FAIL coverage townMinSchools", coverage.policy.townMinSchools);
    process.exit(1);
  }
  if (!isSeoAreaIncluded("city-of-london")) {
    console.error("FAIL city of london missing from coverage");
    process.exit(1);
  }

  const schools = listSeoSchools();
  const hampshire = listSeoHampshireSchools();
  if (schools.length < 500) {
    console.error("FAIL school count", schools.length);
    process.exit(1);
  }
  if (hampshire.length < 500 || hampshire.length > schools.length) {
    console.error("FAIL hampshire subset", hampshire.length, schools.length);
    process.exit(1);
  }

  const sample = schools[0];
  if (!sample?.urn || getSeoSchool(sample.urn)?.urn !== sample.urn) {
    console.error("FAIL getSeoSchool", sample);
    process.exit(1);
  }
  if (schoolPath(sample.urn) !== `/schools/${sample.urn}/`) {
    console.error("FAIL schoolPath");
    process.exit(1);
  }

  const towns = listSeoTowns("hampshire");
  if (towns.length < 10) {
    console.error("FAIL hampshire towns", towns.length);
    process.exit(1);
  }
  const winchester = getSeoTown("winchester", "hampshire");
  if (!winchester || winchester.areaSlug !== "hampshire") {
    console.error("FAIL winchester town", winchester);
    process.exit(1);
  }
  if (townPath("winchester", "hampshire") !== "/areas/hampshire/towns/winchester/") {
    console.error("FAIL townPath");
    process.exit(1);
  }
  if (townsIndexPath("hampshire") !== "/areas/hampshire/towns/") {
    console.error("FAIL townsIndexPath");
    process.exit(1);
  }
  if (!listSeoAreasWithTowns().includes("hampshire")) {
    console.error("FAIL areas with towns");
    process.exit(1);
  }
  if (!listSeoCoverageAreaSlugs().includes("hampshire")) {
    console.error("FAIL coverage slugs");
    process.exit(1);
  }

  // Manifest file should stay valid JSON for the loop.
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const raw = JSON.parse(
    readFileSync(join(root, "public/data/seo-coverage.json"), "utf8"),
  );
  if (!Array.isArray(raw.includedAreaSlugs)) {
    console.error("FAIL seo-coverage.json shape");
    process.exit(1);
  }

  // SERP copy: town "London" must not erase borough; descriptions stay snappy.
  const londonish = schools.find(
    (s) => (s.town || "").trim().toLowerCase() === "london",
  );
  if (londonish) {
    if (schoolPlaceLabel(londonish) !== londonish.localAuthority) {
      console.error("FAIL schoolPlaceLabel London", schoolPlaceLabel(londonish));
      process.exit(1);
    }
    const title = schoolPageTitle(londonish);
    if (title.endsWith(", London") || /, London$/.test(title)) {
      console.error("FAIL schoolPageTitle still ends with London", title);
      process.exit(1);
    }
    if (!title.includes(londonish.localAuthority)) {
      console.error("FAIL schoolPageTitle missing LA", title);
      process.exit(1);
    }
  }
  const desc = schoolPageDescription(sample);
  if (desc.length > 155) {
    console.error("FAIL schoolPageDescription too long", desc.length, desc);
    process.exit(1);
  }
  if (!desc.startsWith("Compare ")) {
    console.error("FAIL schoolPageDescription should lead with compare", desc);
    process.exit(1);
  }
  if (/\.\s+[a-z]/.test(desc)) {
    console.error("FAIL schoolPageDescription lowercase after period", desc);
    process.exit(1);
  }
  if (/not a league table/i.test(desc)) {
    console.error("FAIL disclaimer belongs on the page, not the snippet", desc);
    process.exit(1);
  }
  if (winchester) {
    const wt = townPageTitle(winchester);
    if (!wt.includes("Winchester") || !wt.includes("Hampshire")) {
      console.error("FAIL townPageTitle winchester", wt);
      process.exit(1);
    }
  }
  const londonTown = listSeoTowns().find(
    (t) => t.name.trim().toLowerCase() === "london",
  );
  if (londonTown) {
    const tt = townPageTitle(londonTown);
    if (/in London,/i.test(tt)) {
      console.error("FAIL townPageTitle awkward London", tt);
      process.exit(1);
    }
    if (!tt.includes(londonTown.localAuthority)) {
      console.error("FAIL townPageTitle missing LA", tt);
      process.exit(1);
    }
    if (townPlaceLabel(londonTown) !== londonTown.localAuthority) {
      console.error("FAIL townPlaceLabel", townPlaceLabel(londonTown));
      process.exit(1);
    }
    if (townPageDescription(londonTown).length > 160) {
      console.error("FAIL townPageDescription too long");
      process.exit(1);
    }
  }
  const cityTowns = listSeoTowns("city-of-london");
  if (cityTowns.length !== 1) {
    console.error("FAIL city town count", cityTowns);
    process.exit(1);
  }
  const cityTown = cityTowns[0];
  if (cityTown.name !== "City of London" || cityTown.slug !== "city-of-london") {
    console.error("FAIL city place label", cityTown);
    process.exit(1);
  }
  if (cityTown.slug === "london" || cityTown.name === "London") {
    console.error("FAIL city page titled London", cityTown);
    process.exit(1);
  }
  if (cityTown.schoolCount !== 6) {
    console.error("FAIL city school count", cityTown.schoolCount);
    process.exit(1);
  }
  const cityTitle = townPageTitle(cityTown);
  if (cityTitle !== "Compare schools in City of London") {
    console.error("FAIL city town title", cityTitle);
    process.exit(1);
  }
  if (townPath(cityTown.slug, cityTown.areaSlug) !== "/areas/city-of-london/towns/city-of-london/") {
    console.error("FAIL city town path");
    process.exit(1);
  }
  const citySchools = listSeoSchoolsInTown(cityTown);
  if (citySchools.length !== 6) {
    console.error("FAIL city schools in town", citySchools.map((s) => s.urn));
    process.exit(1);
  }
  const davidGame = citySchools.find((s) => s.urn === "100544");
  if (!davidGame) {
    console.error("FAIL David Game College missing from Square Mile group");
    process.exit(1);
  }
  if (getSeoTownForSchool(davidGame)?.slug !== "city-of-london") {
    console.error("FAIL blank-town school did not join the place page");
    process.exit(1);
  }
  const expectedUrns = ["100000", "100001", "100002", "100003", "100463", "100544"];
  const gotUrns = citySchools.map((s) => s.urn).sort();
  if (gotUrns.join() !== expectedUrns.join()) {
    console.error("FAIL city URNs", gotUrns);
    process.exit(1);
  }

  for (const school of schools) {
    const title = schoolPageTitle(school);
    const description = schoolPageDescription(school);
    const place = schoolPlaceLabel(school);
    const phase = schoolPhaseWord(school);
    const name = school.name.replace(/\.+$/, "").trim();
    const base = `${name}, ${place}`;
    if (base.length <= 60 && title.length > 60) {
      console.error("FAIL schoolPageTitle over 60", school.urn, title.length, title);
      process.exit(1);
    }
    if (phase && `${name} — ${phase} in ${place}`.length <= 60) {
      if (title !== `${name} — ${phase} in ${place}`) {
        console.error("FAIL schoolPageTitle phase pattern", school.urn, title);
        process.exit(1);
      }
    } else if (title !== base) {
      console.error("FAIL schoolPageTitle fallback", school.urn, title);
      process.exit(1);
    }
    if (!title.includes(place)) {
      console.error("FAIL schoolPageTitle missing place", school.urn, title);
      process.exit(1);
    }
    if (description.length > 155) {
      console.error(
        "FAIL schoolPageDescription over 155",
        school.urn,
        description.length,
        description,
      );
      process.exit(1);
    }
    if (!description.startsWith("Compare ")) {
      console.error("FAIL description lead", school.urn, description);
      process.exit(1);
    }
    if (/\.\s+[a-z]/.test(description)) {
      console.error("FAIL description lowercase after period", school.urn, description);
      process.exit(1);
    }
    if (/KS2 RWM 0%/.test(description)) {
      console.error("FAIL zero KS2 outcome in meta", school.urn, description);
      process.exit(1);
    }
    if (
      school.ofstedOverall &&
      !description.includes(`Ofsted ${school.ofstedOverall}`)
    ) {
      console.error("FAIL missing Ofsted in meta", school.urn, description);
      process.exit(1);
    }
    if (
      school.rwmExpected != null &&
      school.rwmExpected > 0 &&
      !description.includes(
        `KS2 RWM ${Math.round(school.rwmExpected <= 1 ? school.rwmExpected * 100 : school.rwmExpected)}%`,
      )
    ) {
      console.error("FAIL missing KS2 result in meta", school.urn, description);
      process.exit(1);
    }
    if (
      !(school.rwmExpected != null && school.rwmExpected > 0) &&
      school.att8Average != null &&
      school.att8Average > 0 &&
      !description.includes("Attainment 8")
    ) {
      console.error("FAIL missing Attainment 8 in meta", school.urn, description);
      process.exit(1);
    }
  }

  const middlePark = getSeoSchool("130921");
  if (!middlePark) {
    console.error("FAIL Middle Park missing from SEO set");
    process.exit(1);
  }
  if (schoolPageTitle(middlePark) !== "Middle Park Primary School — primary in Greenwich") {
    console.error("FAIL Middle Park title", schoolPageTitle(middlePark));
    process.exit(1);
  }
  const middleDesc = schoolPageDescription(middlePark);
  if (!/with \d+ other primary schools in Greenwich/.test(middleDesc)) {
    console.error("FAIL Middle Park peer lead", middleDesc);
    process.exit(1);
  }
  if (!middleDesc.includes("KS2 RWM 68%")) {
    console.error("FAIL Middle Park results", middleDesc);
    process.exit(1);
  }

  const paddock = getSeoSchool("101102");
  if (!paddock) {
    console.error("FAIL Paddock missing from SEO set");
    process.exit(1);
  }
  if (schoolPageTitle(paddock) !== "Paddock School — special in Wandsworth") {
    console.error("FAIL Paddock title", schoolPageTitle(paddock));
    process.exit(1);
  }
  const paddockDesc = schoolPageDescription(paddock);
  if (!paddockDesc.includes("Ofsted Outstanding") || /KS2 RWM 0%/.test(paddockDesc)) {
    console.error("FAIL Paddock facts", paddockDesc);
    process.exit(1);
  }
  if (!/other special schools in Wandsworth/.test(paddockDesc)) {
    console.error("FAIL Paddock peer lead", paddockDesc);
    process.exit(1);
  }

  const southfields = getSeoSchool("138682");
  if (!southfields?.inspectionPrecis) {
    console.error("FAIL Southfields précis missing");
    process.exit(1);
  }
  const southfieldsDesc = schoolPageDescription(southfields);
  if (
    schoolPageTitle(southfields) !== "Southfields Academy — secondary in Wandsworth" ||
    !southfieldsDesc.includes("Ofsted Good") ||
    !southfieldsDesc.includes("Attainment 8 49.4")
  ) {
    console.error("FAIL Southfields snippet", schoolPageTitle(southfields), southfieldsDesc);
    process.exit(1);
  }

  const withHook = schools.find((school) => schoolPageDescription(school).includes("“"));
  if (!withHook) {
    console.error("FAIL expected some précis hooks in meta descriptions");
    process.exit(1);
  }
  const hookDesc = schoolPageDescription(withHook);
  const quoted = hookDesc.match(/“[^”]+”/);
  if (!quoted || quoted[0].includes("…") || !withHook.inspectionPrecis?.includes(quoted[0].slice(1, -1))) {
    console.error("FAIL précis hook is not a full excerpt", withHook.urn, hookDesc);
    process.exit(1);
  }

  const { addressHasGiasPlaceholder, stripGiasAddress } = await import(
    "../src/lib/giasAddress.ts"
  );
  const zed = schools.find((s) => addressHasGiasPlaceholder(s.address));
  if (zed) {
    console.error("FAIL GIAS placeholder still on a landing", zed.urn, zed.address);
    process.exit(1);
  }
  const dirtyLd = schoolJsonLd({
    ...sample,
    address: "Belle Vue Road, z, z, Aldershot",
  });
  const street = dirtyLd["@graph"].find((node) => node["@type"] === "School")
    ?.address?.streetAddress;
  if (street !== "Belle Vue Road, Aldershot" || stripGiasAddress(sample.address) !== sample.address) {
    console.error("FAIL JSON-LD placeholder strip", street);
    process.exit(1);
  }
  const redirectFile = JSON.parse(
    readFileSync(join(root, "public/data/gias-successor-redirects.json"), "utf8"),
  );
  const seoUrns = new Set(schools.map((s) => s.urn));
  const leaked = (redirectFile.redirects || []).filter((row) => seoUrns.has(row.urn));
  if (leaked.length) {
    console.error("FAIL closed successor still in SEO set", leaked.slice(0, 5));
    process.exit(1);
  }
  if (coverage.pageBudget.maxSchoolPages !== 5000) {
    console.error("FAIL school page cap", coverage.pageBudget);
    process.exit(1);
  }

  console.log(
    `PASS test-seo-schools (${schools.length} school pages, ${towns.length} Hampshire towns)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
