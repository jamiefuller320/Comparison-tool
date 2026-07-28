# Deferred ideas

A living record of product ideas discussed in Schoolside work that are **not fully implemented**, plus ideas we **explicitly parked or rejected** so we don’t re-litigate them without new evidence.

Last reviewed from agent chat: 2026-07-28 (silent pack merge — packs not user-visible).

## How to use

- Add new ideas with a short title, why it matters, and any data/privacy constraint.
- Prefer moving items here over leaving them only in chat.
- When an idea ships, delete it from Active backlog (or mark briefly under Shipped notes in the PR).
- Do not treat this as a commitment schedule — economic path and North Star still govern priority.

## Active backlog

### Trust / data quality

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Data-quality gap flags** | Surface known fetch/join gaps on boards (e.g. missing Ofsted as-at, nil KS4) beside provenance — not the same as user challenges. | Not started (open PR #39 may land separately) | Trust infra follow-on |

### On-demand LA packs (roadmap)

Hampshire stays the **maintained root**. Other LAs build into `public/data/packs/{slug}/` on request. Packs are a **collation / harvest unit**, not a user-facing mode — ready packs merge silently into map and search. **Do not** port Value_Investor’s agent research ingest wholesale — Schoolside stays deterministic official joins; borrow only ops patterns (gap → bounded fetch → health / completeness).

| Step | Notes | Status | When |
| --- | --- | --- | --- |
| **1. Schools pack scaffold** | `--la` harvest with early EES LA filter, `build-la-pack.py`, manifest, `la-pack` workflow, UI “Request area coverage” | Shipped (#40) | Done |
| **2. Silent load / merge** | App loads Hampshire + all ready packs into one option set; no picker / `?pack=` | **In progress (this PR)** | Now |
| **3. Pack depth: GIAS + phonics + KS4** | Extend pack builder with `enrich-secondaries --la`, phonics LA benches, indie/KS4 enrich scoped to pack index | Not started | After silent merge |
| **4. Pack depth: EY + childminders** | Parameterise EY/childminder harvests with `--la` into the same pack folder | Not started | After schools UX works |
| **5. SCH-batched KS2 performance** | Stop downloading full England performance pages for scoped harvests (`locations.in=SCH\|id\|…` batches) | Not started | Cost optimisation |
| **6. Pack prune / TTL** | Drop unused packs from repo/Pages when stale to bound size | Not started | When pack count grows |
| **7. Area interest library loop** | Small **ingest → assess → improve** loop over *offline* pack libraries, prioritised by statistical areas of user interest (request frequency, postcode searches, shortlist LAs) — completeness scores, gap flags, bounded re-fetch — **not** agent memo research. Inspired by Value_Investor health/gap patterns; bespoke for DfE/Ofsted joins. | Deferred (after packs are loadable) | When multiple packs exist + usage signals |

### Product path / scope

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Hampshire age climb as maintained set** | After EY: treat Hampshire KS1 → KS2 (then secondary) as the *maintained* depth set; national harvest becomes scaffold / on-demand fallback. | Partial (trim + harvest path shipped; depth pass recomputes Hampshire KS4 benches / phonics UX / Ofsted honesty) | User + README |
| **Second geography** | Widen to another LA only when Hampshire usage justifies cost. Southampton/Portsmouth noted as possible childminder widen (separate unitaries). Prefer on-demand packs before promoting a second maintained seed. | Deferred | Agent pathway |

### Early years / childcare

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Out-of-school / holiday day care** | Include EYR out-of-school and holiday day-care providers in Hampshire EY coverage. | Not started | Agent (“still to do” after EY MVP) |
| **Richer qualitative evidence layer** | Deeper researched qualitative context with user-accessible evidence (beyond current Ofsted/EYFSP footnotes); optional key phrases from Ofsted reports. | Partial (basic explainers/footnotes/tour shipped) | North Star #2 |
| **Ofsted report précis engine** | Second-pass item: generate a short, parent-facing précis of each setting’s latest Ofsted report (verifiable quotes / footnote back to the report). Not needed before Hampshire age-climb. | Not started (second pass) | User |
| **Layperson empty-state polish** | Clearer empty states (e.g. schools-only shortlist under EY); fuller COVID/data caveats; prove full North Star loop on the EY vertical. | Partial | North Star #3 / agent |
| **Hampshire FIS contact enrichment** | Optionally link Hampshire Family Information Service (or a public FIS feed) for contacts beyond address + Ofsted report. | Not started | Agent recommendation |
| **Childminder “market overview”** | Area signal such as % Good by constituency — not side-by-side named compare. Floated when redacted MI looked weak; consented directory shipped instead; overview never built. | Deferred | Agent alternative |

### Independents / history

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Stable ISI report URLs + grade depth** | Resolve stable ISI report URLs (not search links); bulk ISI grades not available cleanly. | Partial (GIAS / search links shipped) | Agent improvement |
| **History / trends beyond state KS2** | Year charts for independents or other stages. User indicated history is mainly worth it for solid state datasets; state KS2 trends shipped. | Deferred | User (scoped) |

### Product metrics

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Quantified North Star / success metrics** | Formal OKRs (e.g. parents comparing ≥2 nearby schools before applying). Only qualitative North Star exists today. | Not started | Agent gap note |

## Parked / rejected (do not reopen without new data)

| Idea | Why parked |
| --- | --- |
| **Provider- / school-level EYFSP** | DfE publishes England / LA (and some district) aggregates only — area context only. |
| **School-level phonics / KS1 teacher assessment** | Not published / KS1 TA no longer collected; LA/England phonics context shipped instead. |
| **Fill independents into state KS2 RWM columns** | No solid open sector-wide school-level KS2 source (ISC aggregate; SLASC not open attainment). |
| **Redacted Ofsted-MI childminder compare** (“name withheld”) | Can’t map/shortlist/visit; poor parental UX. Replaced by consented named directory. |
| **Scrape childminder phones / emails** | Privacy; consented file has no phones/emails. Contact = published address + Ofsted report link (+ optional FIS later). |
| **National non-consented childminder address map** | Consent required; list incomplete by design. |
| **Another broad national enrich pass as next priority** | National scaffold already exists; economic path prefers Hampshire depth. |

## Superseded UX (intent preserved)

| Idea | What happened |
| --- | --- |
| **Nested Early years sliders (Nurseries / Childminders)** | Shipped, then removed when Childminders became a top-level **Stages & care** chip — wrap-around stays independently selectable without nesting under EY. |
| **User-facing Area packs picker / `?pack=`** | Shipped in #41, superseded by silent merge of all ready packs into map/search. Packs remain the backend collation unit for which LAs to harvest. |

## Related shipped baseline (context)

For orientation only — not backlog:

- Hampshire day care Ofsted compare, school nursery/infant Ofsted join, EYFSP area benches, explainers  
- Consented childminder directory + map + vetting checklist + weekly refresh  
- Childminders as a **separate category** from Early years  
- Stage/sector filters, postcode map, KS1 phonics area board, KS2 trends, independent KS4/Ofsted path  
- UI declutter: filters only in hero; path-scoped Side by side tabs; visit pack + checklist on childcare paths  
- Hampshire age-climb maintained harvest (`harvest:hampshire` / seed-LA trim); national `harvest` kept as scaffold  
- **Source provenance stamps** on compare boards + **Report a problem** challenge intake (`data-challenge` workflow; prefer private intake repo)  
- **On-demand LA pack scaffold** (`build-la-pack.py`, `public/data/packs/`, `la-pack` dispatch) + **silent merge** of ready packs onto the Hampshire seed (no user-facing pack mode)  

See `README.md` North Star and Initial scope for governing priorities.
