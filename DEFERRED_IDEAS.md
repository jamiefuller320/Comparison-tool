# Deferred ideas

A living record of product ideas discussed in School Compass work that are **not fully implemented**, plus ideas we **explicitly parked or rejected** so we don’t re-litigate them without new evidence.

Last reviewed from agent chat: 2026-07-29 (board interface, network effects, ranking engine).

## How to use

- Add new ideas with a short title, why it matters, and any data/privacy constraint.
- Prefer moving items here over leaving them only in chat.
- When an idea ships, delete it from Active backlog (or mark briefly under Shipped notes in the PR).
- Do not treat this as a commitment schedule — economic path and North Star still govern priority.

## Active backlog

### On-demand LA packs (roadmap)

Hampshire stays the **maintained root**. Other LAs build into `public/data/packs/{slug}/` on request. Packs are a **collation / harvest unit**, not a user-facing mode — ready packs merge silently into map and search. **Do not** port Value_Investor’s agent research ingest wholesale — Schoolside stays deterministic official joins; borrow only ops patterns (gap → bounded fetch → health / completeness).

| Step | Notes | Status | When |
| --- | --- | --- | --- |
| **1. Schools pack scaffold** | `--la` harvest with early EES LA filter, `build-la-pack.py`, manifest, `la-pack` workflow, UI “Request area coverage” | Shipped (#40) | Done |
| **2. Silent load / merge** | App loads Hampshire + all ready packs into one option set; no picker / `?pack=` | Shipped (#43) | Done |
| **3. Pack depth: GIAS + phonics + KS4** | Extend pack builder with `enrich-secondaries --la`, phonics LA benches, indie/KS4 enrich scoped to pack index | Shipped (#44, IoW rebuild #45) | Done |
| **4. Pack depth: EY + childminders** | Parameterise EY/childminder harvests with `--la` into the same pack folder; silent merge into EY/CM indexes + multi-LA EYFSP board | Shipped (#50; IoW EY/CM rebuild this PR) | Done |
| **5. SCH-batched KS2 performance** | Stop downloading full England performance pages for scoped harvests (`locations.in=SCH\|id\|…` batches) | Not started | Cost optimisation |
| **6. Pack prune / TTL** | Drop unused packs from repo/Pages when stale to bound size | Not started | When pack count grows |
| **7. Area interest library loop** | Small **ingest → assess → improve** loop over *offline* pack libraries, prioritised by statistical areas of user interest (request frequency, postcode searches, shortlist LAs) — completeness scores, gap flags, bounded re-fetch — **not** agent memo research. Inspired by Value_Investor health/gap patterns; bespoke for DfE/Ofsted joins. **Phase 1 shipped:** weekly `pack-quality-loop` workflow + `npm run loop:pack-quality` (assess → polish weakest packs → digest). Still deferred: interest weighting from feedback / missing-school / pack-request signals. | Partial (phase 1 automated polish) | Phase 2 when usage signals are reliable |

### Product path / scope

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Hampshire age climb as maintained set** | After EY: treat Hampshire KS1 → KS2 (then secondary) as the *maintained* depth set; national harvest becomes scaffold / on-demand fallback. | Partial (trim + harvest path shipped; depth pass recomputes Hampshire KS4 benches / phonics UX / Ofsted honesty) | User + README |
| **Second geography** | Widen beyond Hampshire via silent-merge packs. **South East + Dorset** is now the coverage region (`pack:southeast`); Hampshire stays the sole maintained root. Promoting a second maintained seed still deferred. | Partial (packs shipped; second maintained seed still deferred) | User |
| **Optional parent accounts** | Soft “Save shortlist” after engagement (never a login wall). Browser-local by default; Supabase magic-link when env secrets set. | Shipped (soft-prompt module) | User |
| **Governing-board interface (Bartley-for-all)** | Once the **parent-facing** product is mature, offer a **separate** board-oriented surface that reuses Schoolside’s generalised harvest (school records, LA/England benches, KS2 history shards, Ofsted/KS4 where present) to deliver what [Bartley Insight](https://github.com/jamiefuller320/Bartley) does for URN 116338 — peer overlays, evaluation findings, meeting-pack / strategic-question framing — **to any school**. Keep Schoolside’s North Star parental (shortlists and fit, not SIP targets); do **not** fold board language into the parent UI. Likely shapes: URN-deep-link board mode, sibling app/repo that consumes the same `public/data` packs, or generalising Bartley’s `/analysis` layer onto Schoolside’s index. Prerequisites: stable multi-school data quality + pack coverage; Bartley-specific logic (auto findings, progress emphasis, briefing copy) still to port or rebuild. Auth/privacy for governors can stay open-data first (same public DfE sources) unless schools later need private overlays. | Deferred (after parent path mature) | User |

### Far-future platform / network effects

Only after durable parent and (separately) board audiences exist. Not a near-term build; do not let these dilute the comparison North Star.

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Inter-school collaboration (board users)** | Grow a governing-board user base on the board interface, then offer collaboration functions across schools (e.g. peer benchmarking discussion, shared practice / meeting themes, cross-school questions on public metrics). Depends on board surface + identity/trust model; keep collaboration optional and off the parent shortlist path. | Far future | User |
| **Parent value-add beyond compare** | Leverage a parental user base for post-choice support: curated learning resources, SEND information / support pathways, and similar layperson tools that sit *after* school choice. Must stay evidence-linked and distinct from the core compare boards so the product does not become a generic parenting portal. | Far future | User |
| **Rapid-improver / star-leader insight network** | On a mature **national** multi-year dataset, run trend analysis to surface schools with **rapid improvement** in published results (KS2 history shards and later stage series where solid). Treat those trajectories as signals to identify **star leaders** who could be approached — with consent — for qualitative insights on how they effected improvement, feeding board collaboration / school-improvement content. Caveats: cohort size, intake change, and COVID gaps must be controlled so “rapid rise” is not noise; outreach and published insights need clear consent and attribution rules. Depends on national history coverage + board audience; not a parent-shortlist feature. | Far future | User |
| **School ranking engine** | When the national dataset and spin-off apps justify it, build a reusable **ranking / scoring engine** over published metrics (levels, peers, improvement trajectories, equity gaps) as shared infrastructure. Powers rapid-improver detection, board peer overlays, and other spin-offs. Prefer transparent, tunable composite scores with clear caveats — **not** a default public league table on the parent shortlist UX (Schoolside stays fit/compare, not rank-to-shame). Optional parent-facing ranks only if they clearly serve choice and are carefully framed. | Far future | User |

### Early years / childcare

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Out-of-school / holiday day care** | Include EYR out-of-school and holiday day-care providers in Hampshire EY coverage. | Not started | Agent (“still to do” after EY MVP) |
| **Richer qualitative evidence layer** | Deeper researched qualitative context with user-accessible evidence (beyond current Ofsted/EYFSP footnotes); optional key phrases from Ofsted reports. | Partial (board explainers + inspection précis/quotes MVP) | North Star #2 |
| **Ofsted report précis engine** | Second-pass item: generate a short, parent-facing précis of each setting’s latest Ofsted report (verifiable quotes / footnote back to the report). | Partial (engine + UI shipped; **Hampshire soft-launch** requires majority mainstream primary/secondary coverage — see `SOFT_LAUNCH.md`) | User |
| **Layperson empty-state polish** | Clearer empty states (e.g. schools-only shortlist under EY); fuller COVID/data caveats; prove full North Star loop on the EY vertical. | Partial (EY schools-only / KS1–KS4 empty copy + KS4 gap chip wording shipped; COVID caveats still thin) | North Star #3 / agent |
| **Hampshire FIS contact enrichment** | Optionally link Hampshire Family Information Service (or a public FIS feed) for contacts beyond address + Ofsted report. | Not started | Agent recommendation |
| **Childminder “market overview”** | Area signal such as % Good by constituency — not side-by-side named compare. Floated when redacted MI looked weak; consented directory shipped instead; overview never built. | Deferred | Agent alternative |

### Independents / history

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Stable ISI report URLs + grade depth** | Resolve stable ISI report URLs (not search links); bulk ISI grades not available cleanly. | Partial (profile + latest DownloadReport citation + date/title; postcode-confirmed resolve + `--isi-only` pack refresh; grades still not harvested) | Agent improvement |
| **History / trends beyond state KS2** | Year charts for independents or other stages. User indicated history is mainly worth it for solid state datasets; state KS2 trends shipped. | Deferred | User (scoped) |

### Product metrics

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Quantified North Star / success metrics** | Formal OKRs (e.g. parents comparing ≥2 nearby schools before applying). Soft-launch **product-feedback** intake + `digest-product-feedback.py` now give structured usage/sentiment signals; formal OKRs still not defined. | Partial (feedback intake shipped) | Agent gap note / user |

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
- **Data-quality gap flags** beside provenance (known nils / missing as-at / ungraded Ofsted / KS4 reason chips — not user challenges)  
- **On-demand LA pack scaffold** (`build-la-pack.py`, `public/data/packs/`, `la-pack` dispatch) + **silent merge** of ready packs onto the Hampshire seed (no user-facing pack mode)  
- Pack builder depth: GIAS + KS4/KS5 + phonics into `public/data/packs/{slug}/` without touching the Hampshire root  
- Pack builder EY depth: Ofsted day care + consented childminders + school EY Ofsted enrich + LA EYFSP benches into the same pack folder; silent merge with Hampshire EY/CM indexes  

See `README.md` North Star and Initial scope for governing priorities.
