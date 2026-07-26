# Deferred ideas

A living record of product ideas discussed in Schoolside work that are **not fully implemented**, plus ideas we **explicitly parked or rejected** so we don’t re-litigate them without new evidence.

Last reviewed from agent chat: 2026-07-26 (Hampshire EY / childminders / school Ofsted / separate categories thread).

## How to use

- Add new ideas with a short title, why it matters, and any data/privacy constraint.
- Prefer moving items here over leaving them only in chat.
- When an idea ships, delete it from Active backlog (or mark briefly under Shipped notes in the PR).
- Do not treat this as a commitment schedule — economic path and North Star still govern priority.

## Active backlog

### Product path / scope

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **On-demand LA packs beyond Hampshire** | Keep Hampshire pre-built; for other LAs, fetch/cache EY (and later stage) packs on user request — evolve “school is missing” — instead of national pre-harvest. | Not started | User economic path + README |
| **Hampshire age climb as maintained set** | After EY feels solid: treat Hampshire KS1 → KS2 (then secondary) as the *maintained* depth set; national harvest becomes scaffold / on-demand fallback. | Deferred (national scaffold exists; Hampshire-trim path not done) | User + README |
| **Second geography** | Widen to another LA only when Hampshire usage justifies cost. Southampton/Portsmouth noted as possible childminder widen (separate unitaries). | Deferred | Agent pathway |

### Early years / childcare

| Idea | Notes | Status | Source |
| --- | --- | --- | --- |
| **Out-of-school / holiday day care** | Include EYR out-of-school and holiday day-care providers in Hampshire EY coverage. | Not started | Agent (“still to do” after EY MVP) |
| **Richer qualitative evidence layer** | Deeper researched qualitative context with user-accessible evidence (beyond current Ofsted/EYFSP footnotes); optional key phrases from Ofsted reports. | Partial (basic explainers/footnotes/tour shipped) | North Star #2 |
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

## Related shipped baseline (context)

For orientation only — not backlog:

- Hampshire day care Ofsted compare, school nursery/infant Ofsted join, EYFSP area benches, explainers  
- Consented childminder directory + map + vetting checklist + weekly refresh  
- Childminders as a **separate category** from Early years  
- Stage/sector filters, postcode map, KS1 phonics area board, KS2 trends, independent KS4/Ofsted path  

See `README.md` North Star and Initial scope for governing priorities.
