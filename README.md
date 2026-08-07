# School Compass

**Parental school compare** for Hampshire and the wider South East (**including Dorset**) — shortlist nearby schools and early-years settings, then compare published outcomes with Ofsted/ISI evidence. Spoken brand: **School Compass**; home domain: [schoolcompass.uk](https://schoolcompass.uk).

Side-by-side boards for the shortlist you choose — expanding the data collation explored in [Bartley Insight](https://github.com/jamiefuller320/Bartley), framed for parents choosing a school rather than governors monitoring one. Soft-launch bar: [`SOFT_LAUNCH.md`](./SOFT_LAUNCH.md). Coverage region constants: `SOUTHEAST_PLUS_DORSET_*` in `src/lib/laPacks.ts` / `scripts/seed_scope.py`.

## North Star

Provide the most comprehensive comparison and decision-making tool possible for school choice, built on:

1. **Solid, verifiable quantitative datasets** for like-for-like comparison between schools
2. **Researched qualitative context** that rests on a verifiable, user-accessible evidence base (footnote links or equivalent) — including short **Ofsted/ISI report précis** with verbatim quotes footnoted to the source PDF (`npm run enrich:precis`)
3. **A layperson toolset** that helps parents understand and effectively use the data presented

Everything else — harvests, stages, maps, tours, charts — should serve that objective.

## Initial scope (economic path)

Until uptake is clearer, prefer **depth in a bounded slice** over a full national, all-age build:

1. **Age progression** — **early years is live**; the maintained climb is now **Hampshire KS1 → KS2 → secondary** on the same geography.
2. **One maintained geography** — seed local authority is **Hampshire** (county council LA in DfE data; not the Southampton or Portsmouth unitaries). Keep deepest refresh cadence there.
3. **South East (+ Dorset) via packs** — other LAs in the coverage region build into `public/data/packs/{slug}/` and **merge silently** into map/search. Batch with `npm run pack:southeast`. Areas outside the region stay on-demand via “Request area coverage”.

Constants: `src/lib/seedScope.ts` and `scripts/seed_scope.py` (`SEED_LOCAL_AUTHORITY = "Hampshire"`).

**Hampshire maintained set (live path):**

- **Early years / childminders** — Ofsted day care + school nursery Ofsted join + EYFSP area benches; consented childminder directory + vetting checklist + visit pack (`npm run harvest:ey`)
- **School stages** — Hampshire KS1 phonics context, KS2 tables + year trends, and KS4/16–18 where published, via `npm run harvest:hampshire` (seed-LA trim of the school index + history)

Scheduled refresh uses the Hampshire maintained harvest. A weekly **pack quality loop** (`npm run loop:pack-quality`, workflow `pack-quality-loop.yml`) assesses ready packs, polishes the weakest indie/ISI gaps under caps, and commits a digest. `npm run harvest` remains the **full England scaffold** for capability / escape hatch.

**On-demand area packs (backend collation):** outside Hampshire, parents can **Request area coverage** (exact DfE LA label) from **A school is missing**. That queues `repository_dispatch` `la-pack` → `scripts/build-la-pack.py`, which writes under `public/data/packs/{slug}/` without overwriting the Hampshire root. Pack builds include **GIAS coverage, KS4/KS5 outcomes, LA phonics benches, Ofsted day care / school EY enrich, consented childminders, and LA EYFSP benches**. Ready packs in `public/data/packs/manifest.json` are **merged silently** into the map and search (schools, nurseries, and childminders) — there is no pack picker or `?pack=` mode. Packs remain the unit for deciding which LAs to harvest. Further depth and an interest-weighted ingest→assess→improve loop are tracked in `DEFERRED_IDEAS.md`.

**Deferred ideas:** see [`DEFERRED_IDEAS.md`](./DEFERRED_IDEAS.md) for chat-mined backlog, partial work, and explicitly parked ideas (so we don’t re-litigate closed paths without new data).

## Live site

**https://schoolcompass.uk** (GitHub Pages + custom domain)

The static export is rooted at `/` (see `public/CNAME`). The old project URL
`https://jamiefuller320.github.io/Comparison-tool/` is not used once the custom
domain is active.

### Enable GitHub Pages + schoolcompass.uk (one-time)

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → **Source** → **GitHub Actions**
3. Under **Custom domain**, set `schoolcompass.uk` (the deploy also publishes
   `public/CNAME`). Wait for DNS check to go green, then enable **Enforce HTTPS**.
4. At your DNS host for `schoolcompass.uk`, point the apex at GitHub Pages:

   | Type | Name | Value |
   | --- | --- | --- |
   | `A` | `@` | `185.199.108.153` |
   | `A` | `@` | `185.199.109.153` |
   | `A` | `@` | `185.199.110.153` |
   | `A` | `@` | `185.199.111.153` |
   | `AAAA` | `@` | `2606:50c0:8000::153` |
   | `AAAA` | `@` | `2606:50c0:8001::153` |
   | `AAAA` | `@` | `2606:50c0:8002::153` |
   | `AAAA` | `@` | `2606:50c0:8003::153` |
   | `CNAME` | `www` | `jamiefuller320.github.io` (optional) |

5. Merge to `main` (or run **Deploy GitHub Pages** manually) after DNS is in place.

To rebuild the legacy `/Comparison-tool/` project path instead, set
`GITHUB_PAGES_PROJECT_PATH=true` on the Pages build (not the default).

## What it does

- **Stage & care selector** for Early years / Childminders / KS1 / KS2 / KS3 / KS4 — a **child age-range slider** turns on matching school stages (chips still override); school stages use **AND**; Childminders is a separate wrap-around category (directory + checklist), not mixed into Early years nursery tables
- **Sector selector** for **state** vs **independent** (private / public) schools — defaults to state-funded
- **Separate comparison tables** by stage: KS1 uses **local-authority phonics** context; state KS2 uses Year 6 attainment; KS3/KS4 use published **Key Stage 4** outcomes (Attainment 8, English & maths, EBacc) for state and independent secondaries, plus **Ofsted** grades for non-association independents and **ISI / website** links from GIAS when Ofsted grades are absent. Nil/zero English & maths GCSE returns are cleared (common with IGCSEs); EBacc subject pillars are used as fallbacks when both are published
- Secondary / infant / nursery settings are enriched from GIAS Edubase (so EY–KS1-only and KS3–KS4 schools appear even without KS2 results)
- **“A school is missing”** queues a directory rebuild (one force refresh per UTC day; also limited once per browser/day)
- **How to use** walkthrough — highlights the main controls on first visit (restart anytime from the header)
- **Home postcode** at the top of the page, with parsing for common syntax (`SO40 2HR`, `so402hr`, `SO40-2HR`)
- **Map of nearby schools** with a selectable range ring, door-to-door road distance, optional **Hampshire catchment overlay** (in/out chips — not a place guarantee), and tick-to-compare suggestions
- **Places & offer pressure** on compare boards — DfE school capacity fill and National Offer Day first-preference demand (context, not admission odds; school-level catchment participation rates are not published nationally)
- **Harvests** institution-level KS2 attainment from the DfE Explore Education Statistics API for every school in the KS2 tables
- Lets parents **search** by name, town, postcode or URN and compare **up to four schools** side by side
- Surfaces expected/higher standards, scaled scores, cohort mix and group differences against the **England** benchmark
- Matches comparison tables to selected categories: **Early years → day-care + school nursery/infant Ofsted + EYFSP area context**, **Childminders → consented directory + vetting checklist**, **KS1 → LA / England phonics context** (DfE does not publish school-level phonics; KS1 TA is no longer collected), **KS2 → Year 6 tables**, **KS3/KS4 → GCSE / 16–18** (state and independent)
- **Visit pack** for shortlisted nurseries and childminders — printable contacts, Ofsted links, suggested interview questions, and a light per-setting contact status/notes log (browser localStorage)
- **Optional save shortlist** — after two or more settings are shortlisted (or from the visit pack), parents can save under an email. Compare never requires an account. Without Supabase secrets this is a browser-local save; with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` it becomes magic-link sign-in across devices. To recall later: header **Recall shortlist** (same email → magic link) or **Saved → Restore shortlist** when signed in; a welcome banner also offers restore when the shortlist URL is empty
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
# or: npm run enrich:precis         # Ofsted/ISI report précis + footnoted quotes (needs pypdf)
# harvest:hampshire ends with enrich:precis:hampshire (bounded widen)
# or: npm run enrich:phonics        # England / LA phonics screening benchmarks only
# or: npm run enrich:admissions     # school capacity fill + applications/offers pressure
# or: npm run harvest:catchments    # Hampshire catchment polygons for map overlay
# or: npm run history:ks2           # multi-year CSP KS2 archive only
# or: npm run pack:la -- --la Surrey   # one on-demand LA pack under public/data/packs/
# or: npm run pack:southeast           # batch SE + Dorset packs (skips ready)
# or: npm run report:pack-quality      # précis / ISI coverage table
# or: npm run loop:pack-quality -- --dry-run   # assess weakest packs (no polish)
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

### Optional accounts (Save shortlist)

No login wall. Soft prompt after engagement only.

| Mode | When | Behaviour |
| --- | --- | --- |
| Browser-local | Default (no Supabase env) | Email keys a shortlist saved in `localStorage` on this device |
| Magic link | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set at build | Supabase OTP email; shortlists in a `shortlists` table (RLS: own rows only). Recall via header **Recall shortlist** / **Saved → Restore** |

Supabase SQL sketch (run once in the project SQL editor):

```sql
create table public.shortlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.shortlists enable row level security;
create policy "own rows" on public.shortlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Add the two `NEXT_PUBLIC_SUPABASE_*` values as GitHub Actions secrets so Pages builds pick them up. In Supabase Auth URL config, allow redirect to `https://schoolcompass.uk/` (and keep the old GitHub Pages URL only if you still need it during cutover).

## Force refresh (missing school)

The site button **A school is missing** searches the live index first, then can queue a full rebuild.

1. Create a fine-grained GitHub PAT with **Actions: Read and write** on this repository
2. Add repo secret `MISSING_SCHOOL_DISPATCH_TOKEN` with that PAT
3. Redeploy Pages (so `NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN` is baked into the static build)

The `Force school data refresh` workflow still enforces **one successful refresh per UTC day** even if the token is reused.

## Report a problem (data challenges)

Comparison boards show a **source stamp** (period / as-at / dataset + official deep link) and a **Report a problem** control. Challenges queue a private review item via `repository_dispatch` event `data-challenge` (same baked `NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN` as missing-school).

Boards also surface **known data-quality gaps** as small chips beside the stamp (missing Ofsted as-at, unpublished KS2/KS4 figures with reasons such as special/AP or no Year 11 cohort, nil-cleared English & maths, ISI without Ofsted grades, ungraded Ofsted, missing phonics LA rows). Those flags are automated honesty about the pack — not the same as a user challenge.

Optional private intake (recommended so notes/emails stay off public issues):

1. Create a **private** intake repository
2. Add secrets on this repo: `CHALLENGE_INTAKE_REPO` (`owner/name`) and `CHALLENGE_INTAKE_TOKEN` (PAT that can open issues there)
3. Ensure the intake repo has (or can create) a `data-challenge` label

Without those secrets, the workflow opens an issue on this repository with label `data-challenge`. Optional reporter email is kept out of the public issue body and written only to the Actions job summary.

## Soft-launch product feedback

A usage-aware **Feedback** prompt (header always; auto after deep engagement, visit-pack print, or return from an exit) explains that School Compass is under development and asks a question tailored to what the visitor did (or didn’t do). Submissions queue `repository_dispatch` event `product-feedback` (same dispatch token as data challenges) into issues with:

- human-readable usage table
- labels `product-feedback` + `feedback-{sentiment}`
- a fenced **machine JSON** payload for collation

Bump `FEEDBACK_CAMPAIGN_ID` in `src/lib/buildMeta.ts` when a significant build should re-prompt returning visitors. Collate intake with:

```bash
npm run digest:feedback
# or: python3 scripts/digest-product-feedback.py --repo owner/private-intake --jsonl /tmp/feedback.jsonl
```

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

Bartley Insight is a single-school governor monitor (URN 116338) with peer overlays and meeting-pack framing. School Compass reuses the same public KS2 sources and metric vocabulary, generalises harvesting to **any English school set**, and reframes presentation around **parental choice**. Multi-year subject trends use the same CSP KS2 CSV archive pattern as Bartley, sharded nationally so shortlisted state schools can open a history chart from each comparison-table row label.

**Future scope (not current product):** once the parent-facing tool is mature, the same collated data could power a **separate** governing-board interface — effectively Bartley’s dashboard for any school — without mixing board/SIP framing into School Compass’s parental UX. Farther out: board users → inter-school collaboration; a reusable school ranking / scoring engine over national trends (for rapid improvers, peer overlays, and other spin-offs — not a default parent league table); parent users → value-add (learning resources, SEND support, etc.). Tracked in [`DEFERRED_IDEAS.md`](./DEFERRED_IDEAS.md).
