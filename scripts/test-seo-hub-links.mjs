import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function collectSchoolHrefs(html) {
  const urns = new Set();
  const re = /href="\/schools\/(\d+)\//g;
  for (;;) {
    const match = re.exec(html);
    if (!match) break;
    urns.add(match[1]);
  }
  return urns;
}

function walkHubHtml(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkHubHtml(full, files);
    } else if (name === "index.html") {
      files.push(full);
    }
  }
  return files;
}

function hubHtmlOrphans(geoSchoolUrns) {
  const areasDir = join(root, "out", "areas");
  const linked = new Set();
  let hubPages = 0;

  for (const htmlPath of walkHubHtml(areasDir)) {
    const rel = htmlPath.slice(areasDir.length + 1);
    if (/^[^/]+\/towns\/[^/]+\/index\.html$/.test(rel)) {
      hubPages += 1;
      const html = readFileSync(htmlPath, "utf8");
      const borough = rel.split("/")[0];
      if (/^[^/]+\/towns\/london\/index\.html$/.test(rel) && borough !== "city-of-london") {
        const areaHref = `/areas/${borough}/`;
        if (!/http-equiv="refresh"/i.test(html) || !html.includes(areaHref)) {
          console.error("FAIL london town stub missing redirect", rel);
          process.exit(1);
        }
        continue;
      }
      for (const urn of collectSchoolHrefs(html)) {
        linked.add(urn);
      }
      continue;
    }
    if (/^[^/]+\/index\.html$/.test(rel)) {
      hubPages += 1;
      for (const urn of collectSchoolHrefs(readFileSync(htmlPath, "utf8"))) {
        linked.add(urn);
      }
    }
  }

  let orphans = 0;
  for (const urn of geoSchoolUrns) {
    if (!linked.has(urn)) orphans += 1;
  }

  return { hubPages, linked: linked.size, orphans };
}

async function main() {
  const { auditSeoHubLinks, listSeoSchoolsInArea } = await import(
    "../src/lib/seoHubLinks.ts"
  );
  const { isSeoAreaIncluded, listSeoCoverageAreaSlugs } = await import(
    "../src/lib/seoSchools.ts"
  );
  const { getCoverageArea, listCoverageAreas } = await import(
    "../src/lib/areas.ts"
  );

  const audit = auditSeoHubLinks();
  console.log(
    `Hub link graph: ${audit.sitemapSchools} sitemap schools, ` +
      `${audit.beforeStyleTownOnly} linked before (town-only native), ` +
      `${audit.linkedFromHubs} linked after (area + town hubs), ` +
      `${audit.hubOrphans} orphans`,
  );

  if (audit.hubOrphans !== 0) {
    console.error("FAIL hub-orphan count must be 0 after linking", audit);
    process.exit(1);
  }

  for (const slug of listSeoCoverageAreaSlugs()) {
    const area = getCoverageArea(slug);
    if (!area || !isSeoAreaIncluded(slug)) continue;
    const schools = listSeoSchoolsInArea(slug);
    if (schools.length === 0) {
      console.error("FAIL empty sitemap school list on included area", slug);
      process.exit(1);
    }
  }

  const allAreas = listCoverageAreas();
  const seoOnly = allAreas.filter((a) => !isSeoAreaIncluded(a.slug));
  for (const area of seoOnly) {
    if (listSeoSchoolsInArea(area.slug).length > 0) {
      console.error("FAIL school list leaked outside seo-coverage", area.slug);
      process.exit(1);
    }
  }

  const sitemapUrns = new Set(
    (await import("../src/lib/seoSchools.ts")).listSeoSchools().map((s) => s.urn),
  );

  if (existsSync(join(root, "out", "areas"))) {
    const built = hubHtmlOrphans(sitemapUrns);
    console.log(
      `Built hub HTML: ${built.hubPages} area/town pages, ` +
        `${built.linked} distinct school hrefs, ${built.orphans} orphans`,
    );
    if (built.orphans !== 0) {
      console.error("FAIL built hub HTML still has orphans", built);
      process.exit(1);
    }
  } else {
    console.log("SKIP built HTML scan (no out/areas — run build:pages first)");
  }

  console.log("PASS test-seo-hub-links");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
