/** Unit checks for schoolOutboundLinks / website → GIAS fallback. */

async function main() {
  const { schoolOutboundLinks, hasSchoolPageLink } = await import(
    "../src/lib/schoolLinks.ts"
  );

  const withWebsite = {
    urn: "116482",
    name: "Example Junior",
    schoolWebsite: "www.example.sch.uk",
    compareUrl: "https://www.compare-school-performance.service.gov.uk/school/116482",
  };
  const linksWeb = schoolOutboundLinks(withWebsite);
  if (linksWeb[0]?.kind !== "website") {
    console.error("FAIL expected website first", linksWeb);
    process.exit(1);
  }
  if (!linksWeb[0].href.startsWith("https://")) {
    console.error("FAIL website should gain https://", linksWeb[0]);
    process.exit(1);
  }
  if (!linksWeb.some((l) => l.kind === "tables")) {
    console.error("FAIL expected official tables link", linksWeb);
    process.exit(1);
  }

  const giasOnly = {
    urn: "116266",
    name: "No website in GIAS",
    giasUrl:
      "https://www.get-information-schools.service.gov.uk/Establishments/Establishment/Details/116266",
  };
  const linksGias = schoolOutboundLinks(giasOnly);
  if (linksGias[0]?.kind !== "gias" || !hasSchoolPageLink(giasOnly)) {
    console.error("FAIL expected GIAS fallback", linksGias);
    process.exit(1);
  }

  const urnOnly = { urn: "900001", name: "URN only" };
  const linksUrn = schoolOutboundLinks(urnOnly);
  if (
    linksUrn[0]?.kind !== "gias" ||
    !String(linksUrn[0].href).includes("/900001")
  ) {
    console.error("FAIL expected synthetic GIAS from URN", linksUrn);
    process.exit(1);
  }

  const withInspection = schoolOutboundLinks(
    {
      urn: "1",
      name: "Inspected",
      schoolWebsite: "https://school.example",
      ofstedReportUrl: "https://reports.ofsted.gov.uk/1",
      isiLatestReportUrl: "https://isi.net/1.pdf",
    },
    { includeInspection: true },
  );
  if (
    !withInspection.some((l) => l.kind === "ofsted") ||
    !withInspection.some((l) => l.kind === "isi")
  ) {
    console.error("FAIL expected inspection links", withInspection);
    process.exit(1);
  }

  console.log("OK school-links");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
