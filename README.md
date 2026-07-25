# Schoolside

Parental-choice **school performance comparison** for English schools.

Side-by-side Key Stage 2 attainment for any shortlist you choose — expanding the data collation explored in [Bartley Insight](https://github.com/jamiefuller320/Bartley), but framed for parents choosing a school rather than governors monitoring one.

## North Star

Provide the most comprehensive comparison and decision-making tool possible for school choice, built on:

1. **Solid, verifiable quantitative datasets** for like-for-like comparison between schools
2. **Researched qualitative context** that rests on a verifiable, user-accessible evidence base (footnote links or equivalent)
3. **A layperson toolset** that helps parents understand and effectively use the data presented

Everything else — harvests, stages, maps, tours, charts — should serve that objective.

## Initial scope (economic path)

Until uptake is clearer, prefer **depth in a bounded slice** over a full national, all-age build:

1. **Age progression** — start with **early years providers**, then widen upward (KS1 → KS2 → secondary) once the EY comparison and evidence patterns are solid.
2. **One geography first** — seed local authority is **Hampshire** (county council LA in DfE data; not the Southampton or Portsmouth unitaries). Maintain a full dataset for that area rather than pre-harvesting every English setting.
3. **On-demand beyond that** — for schools or areas outside Hampshire, **process and cache on user request** (same spirit as today’s “school is missing” refresh), instead of paying for continuous national coverage up front.

Constants: `src/lib/seedScope.ts` and `scripts/seed_scope.py` (`SEED_LOCAL_AUTHORITY = "Hampshire"`).

**Hampshire EY MVP (live in product):** Ofsted childcare MI for named Early Years Register full/sessional day care in Hampshire (`public/data/ey-providers-index.json`), plus England/Hampshire **EYFSP** area benchmarks (DfE does not publish provider-level EYFSP). Refresh with `npm run harvest:ey`. Childminders deferred (names redacted in Ofsted MI).

The current national KS2/KS4 harvest is a capability scaffold; the product path above is how we intend to grow coverage without assuming demand.

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
- **Separate comparison tables** by stage: KS1 uses **local-authority phonics** context; state KS2 uses Year 6 attainment; KS3/KS4 use published **Key Stage 4** outcomes (Attainment 8, English & maths, EBacc) for state and independent secondaries, plus **Ofsted** grades for non-association independents and **ISI / website** links from GIAS when Ofsted grades are absent. Nil/zero English & maths GCSE returns are cleared (common with IGCSEs); EBacc subject pillars are used as fallbacks when both are published
- Secondary / infant / nursery settings are enriched from GIAS Edubase (so EY–KS1-only and KS3–KS4 schools appear even without KS2 results)
- **“A school is missing”** queues a directory rebuild (one force refresh per UTC day; also limited once per browser/day)
- **How to use** walkthrough — highlights the main controls on first visit (restart anytime from the header)
- **Home postcode** at the top of the page, with parsing for common syntax (`SO40 2HR`, `so402hr`, `SO40-2HR`)
- **Map of nearby schools** with a selectable range ring, door-to-door road distance, and tick-to-compare suggestions
- **Harvests** institution-level KS2 attainment from the DfE Explore Education Statistics API for every school in the KS2 tables
- Lets parents **search** by name, town, postcode or URN and compare **up to four schools** side by side
- Surfaces expected/higher standards, scaled scores, cohort mix and group differences against the **England** benchmark
- Matches comparison tables to selected stages: **KS1 → LA / England phonics context** (DfE does not publish school-level phonics; KS1 TA is no longer collected), **KS2 → Year 6 tables**, **KS3/KS4 → GCSE / 16–18** (state and independent); early years remains an age-range filter until EYFSP is added
- Keeps the language parental: shortlists and fit, not board packs or SIP targets

## Run locally

```bash
npm install
npm run harvest        # full England index + Hampshire EY pack + KS2 history
# or: npm run harvest:sample
# or: npm run harvest:ey            # Hampshire Ofsted day care + EYFSP benches only
# or: npm run enrich:independents   # refresh indie KS4/Ofsted only
# or: npm run enrich:phonics        # England / LA phonics screening benchmarks only
# or: npm run history:ks2           # multi-year CSP KS2 archive only
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On the state-school comparison table, click a **measure name** to open a year-by-year trend for the shortlisted schools (2015/16–2018/19 and 2022/23–2024/25; COVID gap for unpublished years).

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
- `public/data/ks2-history/` — multi-year KS2 archive (`meta.json` + `uXX.json` shards), from the same Compare school performance CSV downloads used by Bartley

## Stack

Next.js (static export) · TypeScript · Tailwind CSS · Recharts · GitHub Pages · DfE EES API · CSP KS2 downloads

## Relationship to Bartley

Bartley Insight is a single-school governor monitor (URN 116338) with peer overlays and meeting-pack framing. Schoolside reuses the same public KS2 sources and metric vocabulary, generalises harvesting to **any English school set**, and reframes presentation around **parental choice**. Multi-year subject trends use the same CSP KS2 CSV archive pattern as Bartley, sharded nationally so shortlisted state schools can open a history chart from each comparison-table row label.
