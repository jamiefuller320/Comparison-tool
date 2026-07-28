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

1. **Age progression** — **early years is live**; the maintained climb is now **Hampshire KS1 → KS2 → secondary** on the same geography.
2. **One geography first** — seed local authority is **Hampshire** (county council LA in DfE data; not the Southampton or Portsmouth unitaries). Maintain a full dataset for that area rather than pre-harvesting every English setting.
3. **On-demand beyond that** — for schools or areas outside Hampshire, **process and cache on user request** (same spirit as today’s “school is missing” refresh), instead of paying for continuous national coverage up front.

Constants: `src/lib/seedScope.ts` and `scripts/seed_scope.py` (`SEED_LOCAL_AUTHORITY = "Hampshire"`).

**Hampshire maintained set (live path):**

- **Early years / childminders** — Ofsted day care + school nursery Ofsted join + EYFSP area benches; consented childminder directory + vetting checklist + visit pack (`npm run harvest:ey`)
- **School stages** — Hampshire KS1 phonics context, KS2 tables + year trends, and KS4/16–18 where published, via `npm run harvest:hampshire` (seed-LA trim of the school index + history)

Scheduled refresh uses the Hampshire maintained harvest. `npm run harvest` remains the **full England scaffold** for capability / escape hatch.

**On-demand area packs:** outside Hampshire, parents can **Request area pack** (exact DfE LA label) from **A school is missing**. That queues `repository_dispatch` `la-pack` → `scripts/build-la-pack.py`, which writes a schools index under `public/data/packs/{slug}/` without overwriting the Hampshire root. When a pack status is `ready` in `public/data/packs/manifest.json`, the shortlist UI **Area packs** control activates it (also `?pack=slug`), merging those schools into search and the map. EY depth for packs and an interest-weighted ingest→assess→improve loop are tracked in `DEFERRED_IDEAS.md`.

**Deferred ideas:** see [`DEFERRED_IDEAS.md`](./DEFERRED_IDEAS.md) for chat-mined backlog, partial work, and explicitly parked ideas (so we don’t re-litigate closed paths without new data).

## Live site (GitHub Pages)

After merge to `main` and Pages is enabled:

**https://jamiefuller320.github.io/Comparison-tool/**

### Enable GitHub Pages (one-time)

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → **Source** → **GitHub Actions**
3. Merge to `main` (or run **Deploy GitHub Pages** manually)

## What it does

- **Stage & care selector** for Early years / Childminders / KS1 / KS2 / KS3 / KS4 — school stages use **AND**; Childminders is a separate wrap-around category (directory + checklist), not mixed into Early years nursery tables
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
- Matches comparison tables to selected categories: **Early years → day-care + school nursery/infant Ofsted + EYFSP area context**, **Childminders → consented directory + vetting checklist**, **KS1 → LA / England phonics context** (DfE does not publish school-level phonics; KS1 TA is no longer collected), **KS2 → Year 6 tables**, **KS3/KS4 → GCSE / 16–18** (state and independent)
- **Visit pack** for shortlisted nurseries and childminders — printable contacts, Ofsted links, suggested interview questions, and a light per-setting contact status/notes log (browser localStorage)
- Keeps the language parental: shortlists and fit, not board packs or SIP targets

## Run locally

```bash
npm install
npm run harvest:hampshire  # maintained set: Hampshire schools + EY pack + KS2 history
# or: npm run trim:hampshire   # trim an existing national index down to Hampshire
# or: npm run harvest          # full England scaffold (capability / escape hatch)
# or: npm run harvest:sample
# or: npm run harvest:ey            # Hampshire day care + childminders + EY school Ofsted + EYFSP
# or: npm run harvest:childminders  # latest Ofsted consented addresses only
# or: npm run enrich:ey-schools     # state-school Ofsted MI (nursery/infant join)
# or: npm run enrich:independents   # refresh indie KS4/Ofsted only
# or: npm run enrich:phonics        # England / LA phonics screening benchmarks only
# or: npm run history:ks2           # multi-year CSP KS2 archive only
# or: npm run pack:la -- --la Surrey   # on-demand LA schools pack under public/data/packs/
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

## Report a problem (data challenges)

Comparison boards show a **source stamp** (period / as-at / dataset + official deep link) and a **Report a problem** control. Challenges queue a private review item via `repository_dispatch` event `data-challenge` (same baked `NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN` as missing-school).

Optional private intake (recommended so notes/emails stay off public issues):

1. Create a **private** intake repository
2. Add secrets on this repo: `CHALLENGE_INTAKE_REPO` (`owner/name`) and `CHALLENGE_INTAKE_TOKEN` (PAT that can open issues there)
3. Ensure the intake repo has (or can create) a `data-challenge` label

Without those secrets, the workflow opens an issue on this repository with label `data-challenge`. Optional reporter email is kept out of the public issue body and written only to the Actions job summary.

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
