# Hampshire soft-launch bar

Finite deployable standard before showing School Compass to the world.
Not a commitment to finish the whole roadmap — a **parental product** bar with
**Hampshire maintained depth** and **South East + Dorset + London pack coverage**.

Last reviewed: 2026-09-24.

## Ship bar

| # | Criterion | Done when |
| --- | --- | --- |
| **1. Journey** | Postcode → map/shortlist → stage boards → visit pack works on phone and desktop; empty states make sense | Parent can complete EY and school paths without dead ends |
| **2. Quantitative honesty** | Published figures where they exist; gap chips where not; blanks do not look like bugs | KS1–KS4 + EY boards explain missing cells |
| **3. Qualitative enough** | Precis/quotes on **most comparable shortlist-likely** settings | Mainstream state primaries & secondaries mostly covered; solid EY + childminder slice — not 100% special/AP |
| **4. Provenance** | Numbers and quotes sourced; report-a-problem available on compare boards | Footnotes to DfE/Ofsted/ISI; challenge button wired |
| **5. Ops** | Hampshire refresh runnable end-to-end without wiping qualitative fields | `harvest:hampshire` includes precis; scheduled refresh installs `pypdf` and re-enriches |
| **6. Positioning** | One clear line everywhere that matters | South East + London parental compare today (Hampshire depth + regional packs); progressive ring expansion toward wider national search — not a national league table |
| **7. Regional packs** | South East + Dorset + London LAs available via silent-merge packs | Ready packs listed in `public/data/packs/manifest.json`; batch via `npm run pack:southeast` / `pack:london` |

## Explicitly out of scope for first showing

- Second maintained LA
- Governing-board / Bartley surface
- Ranking engine / network effects
- SCH-batched KS2 cost work
- Full national precis coverage
- Perfect special/AP/PRU qualitative coverage

## Current status

| # | Status | Notes |
| --- | --- | --- |
| 1 Journey | **Pass** | Path-scoped boards + visit pack on EY/CM; empty-state polish shipped |
| 2 Quantitative honesty | **Pass** | Gap chips on KS4/EY/KS2 (incl. missing Ofsted grade on KS2) |
| 3 Qualitative enough | **Pass (guideline)** | Hampshire mainstream ~91% / EY ~43% / CM ~51%. Region packs: schools ~88%+ précis, EY ~87%, CM ~74%; mainstream primary/secondary ≫70%. Independent ISI/précis polish waves + weekly automated loop — measure with `npm run report:pack-quality` |
| 4 Provenance | **Pass** | Board stamps + precis footnotes; visit-pack report button still optional |
| 5 Ops | **Pass** | Precis merge-preserved across harvest; KS2 national cache under `.cache/ees/`; `harvest:hampshire` + `pack:southeast:complete`; twice-weekly `pack-quality-loop` + daily parallel `qualitative-loop` (`--ingest-policy auto`: SE tail → London → maintenance; advancing exhausted slots) + daily `qualitative-quality-loop` (full apply on significant learned-QA change / weekly ceiling) + daily `qualitative-spotcheck-loop` (source-vs-site fidelity sample → digest / human-flag candidates) |
| 6 Positioning | **Pass** | Metadata, loader, README, and hero align on Hampshire + South East + London parental compare; soft-launch feedback prompt + structured intake for improvement cycle |
| 7 Regional packs | **Pass** | All 20 South East + Dorset pack LAs `ready`; all **33 London boroughs** `ready` in `manifest.json` (City of London + 32 boroughs via `npm run pack:london`) |

Re-check guideline rates after each major harvest; flip a row back to Partial if coverage regresses.

### South East + Dorset + London pack targets

Hampshire is **not** a pack (maintained root). Build order (neighbours first, then London):

Southampton → Portsmouth → Dorset → Bournemouth, Christchurch and Poole → Surrey → West Sussex → East Sussex → Brighton and Hove → Kent → Medway → Isle of Wight → Berkshire unitaries → Buckinghamshire → Milton Keynes → Oxfordshire → **London boroughs** (City of London + 32 boroughs).

## How to re-check coverage

```bash
pip install -r requirements-data.txt
npm run enrich:precis -- --limit 0          # schools (no cap)
npm run enrich:precis -- --ey --limit 200
npm run enrich:precis -- --childminders --limit 100
npm run report:pack-quality
```

### Automated pack quality loop (phase 1)

Weekly GitHub Action (Wed 06:00 UTC) + `workflow_dispatch`:

1. **Assess** — `report:pack-quality` JSON metrics  
2. **Select** — up to N weakest ready packs with indie/ISI headroom  
3. **Polish** — capped `polish:pack-quality` (ISI resolve + missing précis)  
4. **Digest** — writes `public/data/packs/quality-loop-latest.{json,md}` and commits pack deltas  

```bash
npm run loop:pack-quality -- --dry-run
npm run loop:pack-quality -- --max-packs 6 --isi-resolve-cap 80 --precis-limit 60
```

Future phases (pack TTL, SCH-batched KS2) are logged under **Continuous data-quality automation** in `DEFERRED_IDEAS.md` — return there rather than re-deriving from chat. Interest weighting (phase 2) ships with `scripts/pack_interest.py` and biases `loop:pack-quality` target selection.

### Automated SEO coverage loop

Weekly GitHub Action (Fri 07:00 UTC) + `workflow_dispatch` expands school/town SEO landings as ready packs grow, without dumping every URN into the static export:

1. **Assess** — `report:seo-coverage` (pages used vs `pageBudget`)
2. **Select** — ready packs with signal floor that fit remaining school/town budget (interest-weighted)
3. **Expand** — append LA slugs to `public/data/seo-coverage.json`
4. **Digest** — `public/data/seo-coverage-loop-latest.{json,md}`

```bash
npm run report:seo-coverage
npm run loop:seo-coverage -- --dry-run
npm run loop:seo-coverage -- --max-new-areas 4
# London wave (keeps existing SE areas; priority anchors first):
npm run loop:seo-coverage -- --prefer-london --max-new-areas 40
```

Hard caps live in `seo-coverage.json` (`maxSchoolPages` / `maxTownPages`); town landings still require `townMinSchools` (default 8). Sitemap + `llms.txt` follow included slugs only — no mass URL injection outside the budgeted set.

Phases and budget-tuning notes live under **Continuous SEO coverage automation** in `DEFERRED_IDEAS.md`.

### Qualitative source spot-check loop

Daily GitHub Action (12:00 UTC) + `workflow_dispatch` runs **after** the morning quality apply. It samples ~7 published qualitative shards (SE + London mix; hard-capped so cost does not grow with corpus size), fetches live school HTML, and compares parent-facing offerings/narratives to the human fidelity bar. Safe chrome/PDF/nav phrases **auto-integrate** into `learned-qa-patterns.json` and re-dispatch quality apply; ethos underclaim and ambiguous candidates stay human-gated (`output/spotcheck-human-gated-candidates.jsonl` → `npm run qa:human-flags`). Not a hard Pages deploy gate unless `--strict`.

```bash
npm run loop:qualitative-spotcheck -- --dry-run
npm run loop:qualitative-spotcheck -- --sample-size 7
npm run test:qualitative-spotcheck-loop
```

Soft-launch qualitative target (guideline, not a hard CI gate):

- Mainstream state primaries with precis ≳ 70%
- Mainstream state secondaries with precis ≳ 70%
- EY day care with precis ≳ 40%
- Consented childminders with precis ≳ 40%

Track remaining roadmap items in `DEFERRED_IDEAS.md`. Update the status table above when a bar item flips.
