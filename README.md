# Schoolside

Parental-choice **school performance comparison** for English schools.

Side-by-side Key Stage 2 attainment for any shortlist you choose — expanding the data collation explored in [Bartley Insight](https://github.com/jamiefuller320/Bartley), but framed for parents choosing a school rather than governors monitoring one.

## Live site (GitHub Pages)

After merge to `main` and Pages is enabled:

**https://jamiefuller320.github.io/Comparison-tool/**

### Enable GitHub Pages (one-time)

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → **Source** → **GitHub Actions**
3. Merge to `main` (or run **Deploy GitHub Pages** manually)

## What it does

- **Stage selector** for Early years / KS1 / KS2 / KS3 / KS4 — multiple selections use **AND** (a school must offer every selected stage); multi-phase settings still appear under each stage they cover individually
- **Sector selector** for **state** vs **independent** (private / public) schools — defaults to state-funded
- **Separate comparison tables**: state schools use Key Stage 2 attainment; independents use published **Key Stage 4** outcomes (Attainment 8, English & maths, EBacc) plus **Ofsted** grades for non-association independents
- Secondary / infant / nursery settings are enriched from GIAS Edubase (so EY–KS1-only and KS3–KS4 schools appear even without KS2 results)
- **“A school is missing”** queues a directory rebuild (one force refresh per UTC day; also limited once per browser/day)
- **Home postcode** at the top of the page, with parsing for common syntax (`SO40 2HR`, `so402hr`, `SO40-2HR`)
- **Map of nearby schools** with a selectable range ring, door-to-door road distance, and tick-to-compare suggestions
- **Harvests** institution-level KS2 attainment from the DfE Explore Education Statistics API for every school in the KS2 tables
- Lets parents **search** by name, town, postcode or URN and compare **up to four schools** side by side
- Surfaces expected/higher standards, scaled scores, cohort mix and group differences against the **England** benchmark
- Keeps the language parental: shortlists and fit, not board packs or SIP targets

## Run locally

```bash
npm install
npm run harvest        # full England index (DfE KS2 + GIAS + indie KS4/Ofsted)
# or: npm run harvest:sample
# or: npm run enrich:independents   # refresh indie KS4/Ofsted only
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Static build (GitHub Pages)

```bash
npm run build:pages
npm start              # serves the out/ folder
```

Shareable comparison links use `?schools=URN,URN,URN`, `?postcode=SO40+2HR`, `?stages=ks2,ks3,ks4` and `?sectors=state,independent`.

## Force refresh (missing school)

The site button **A school is missing** searches the live index first, then can queue a full rebuild.

1. Create a fine-grained GitHub PAT with **Actions: Read and write** on this repository
2. Add repo secret `MISSING_SCHOOL_DISPATCH_TOKEN` with that PAT
3. Redeploy Pages (so `NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN` is baked into the static build)

The `Force school data refresh` workflow still enforces **one successful refresh per UTC day** even if the token is reused.

```bash
python3 scripts/harvest-schools.py
python3 scripts/harvest-schools.py --sample 60
python3 scripts/harvest-schools.py --years 2024/2025
```

Writes:

- `public/data/schools-index.json` — full school records + England/LA benchmarks
- `public/data/schools-directory.json` — lean search index
- `public/data/harvest-summary.json` — run stats

## Stack

Next.js (static export) · TypeScript · Tailwind CSS · Recharts · GitHub Pages · DfE EES API

## Relationship to Bartley

Bartley Insight is a single-school governor monitor (URN 116338) with peer overlays and meeting-pack framing. Schoolside reuses the same public KS2 sources and metric vocabulary, generalises harvesting to **any English school set**, and reframes presentation around **parental choice**.
