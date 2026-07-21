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

- **Stage selector** for Early years / KS1 / KS2 / Secondary — multi-phase settings (primary, all-through, etc.) stay included whenever any of their stages is selected
- **Home postcode** at the top of the page, with parsing for common syntax (`SO40 2HR`, `so402hr`, `SO40-2HR`)
- **Map of nearby schools** with a selectable range ring, door-to-door road distance, and tick-to-compare suggestions
- **Harvests** institution-level KS2 attainment from the DfE Explore Education Statistics API for every school in the KS2 tables
- Lets parents **search** by name, town, postcode or URN and compare **up to four schools** side by side
- Surfaces expected/higher standards, scaled scores, cohort mix and group differences against the **England** benchmark
- Keeps the language parental: shortlists and fit, not board packs or SIP targets

## Run locally

```bash
npm install
npm run harvest        # full England index (DfE API)
# or: npm run harvest:sample
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Static build (GitHub Pages)

```bash
npm run build:pages
npm start              # serves the out/ folder
```

Shareable comparison links use `?schools=URN,URN,URN`, `?postcode=SO40+2HR` and `?stages=ks2,ks1`.

## Harvest

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
