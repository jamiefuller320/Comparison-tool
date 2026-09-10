#!/usr/bin/env node
/**
 * Regenerate AEO/GEO manifests: llms.txt, seo-urns.json, aeo-readiness.json.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const generatedAt = new Date().toISOString();
  const {
    llmsTxtContent,
  } = await import("../src/lib/llmsTxt.ts");
  const {
    listSeoSchools,
    readSeoCoverage,
  } = await import("../src/lib/seoSchools.ts");

  const schools = listSeoSchools();
  const coverage = readSeoCoverage();

  const withPrecis = schools.filter((s) => s.inspectionPrecis).length;
  const withQualitative = schools.filter(
    (s) => s.qualitativeThemes.length > 0,
  ).length;
  const withOfsted = schools.filter((s) => s.ofstedOverall).length;

  const llmsPath = join(root, "public", "llms.txt");
  writeFileSync(llmsPath, `${llmsTxtContent(generatedAt)}\n`, "utf8");

  const urnsPath = join(root, "public", "data", "seo-urns.json");
  writeFileSync(
    urnsPath,
    JSON.stringify(
      {
        version: 1,
        generatedAt,
        urns: schools.map((s) => s.urn),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const readinessPath = join(root, "public", "data", "aeo-readiness.json");
  const total = schools.length || 1;
  writeFileSync(
    readinessPath,
    JSON.stringify(
      {
        version: 1,
        generatedAt,
        coverageGeneratedAt: coverage.generatedAt,
        totals: {
          schoolPages: schools.length,
          withOfsted,
          withPrecis,
          withQualitativeThemes: withQualitative,
          ofstedPct: Math.round((100 * withOfsted) / total),
          precisPct: Math.round((100 * withPrecis) / total),
          qualitativePct: Math.round((100 * withQualitative) / total),
        },
        llmsTxt: "/llms.txt",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(
    `AEO manifests: ${schools.length} school URNs, ` +
      `precis ${Math.round((100 * withPrecis) / total)}%, ` +
      `qualitative ${Math.round((100 * withQualitative) / total)}%`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
