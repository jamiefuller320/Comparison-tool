# Hampshire soft-launch bar

Finite deployable standard before showing School Compass to the world.
Not a commitment to finish the whole roadmap — a **parental product** bar with
**Hampshire maintained depth** and **South East (+ Dorset) pack coverage**.

Last reviewed: 2026-07-31.

## Ship bar

| # | Criterion | Done when |
| --- | --- | --- |
| **1. Journey** | Postcode → map/shortlist → stage boards → visit pack works on phone and desktop; empty states make sense | Parent can complete EY and school paths without dead ends |
| **2. Quantitative honesty** | Published figures where they exist; gap chips where not; blanks do not look like bugs | KS1–KS4 + EY boards explain missing cells |
| **3. Qualitative enough** | Precis/quotes on **most comparable shortlist-likely** settings | Mainstream state primaries & secondaries mostly covered; solid EY + childminder slice — not 100% special/AP |
| **4. Provenance** | Numbers and quotes sourced; report-a-problem available on compare boards | Footnotes to DfE/Ofsted/ISI; challenge button wired |
| **5. Ops** | Hampshire refresh runnable end-to-end without wiping qualitative fields | `harvest:hampshire` includes precis; scheduled refresh installs `pypdf` and re-enriches |
| **6. Positioning** | One clear line everywhere that matters | South East parental compare (Hampshire depth + regional packs) — not a national league table |
| **7. Regional packs** | South East + Dorset LAs available via silent-merge packs | Ready packs listed in `public/data/packs/manifest.json`; batch via `npm run pack:southeast` |

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
| 3 Qualitative enough | **Pass (guideline)** | Hampshire mainstream ~91% / EY ~43% / CM ~51%. Region packs: schools ~88%+ précis, EY ~87%, CM ~74%; mainstream primary/secondary ≫70%. Independent ISI/précis polish (2026-08-02) lifted weakest packs via `npm run polish:pack-quality` — measure with `npm run report:pack-quality` |
| 4 Provenance | **Pass** | Board stamps + precis footnotes; visit-pack report button still optional |
| 5 Ops | **Pass** | Precis merge-preserved across harvest; KS2 national cache under `.cache/ees/`; `harvest:hampshire` + `pack:southeast:complete` |
| 6 Positioning | **Pass** | Metadata, loader, README, and hero align on Hampshire + South East parental compare; soft-launch feedback prompt + structured intake for improvement cycle |
| 7 Regional packs | **Pass** | All 20 South East + Dorset pack LAs `ready` in `public/data/packs/manifest.json` (Hampshire remains maintained root) |

Re-check guideline rates after each major harvest; flip a row back to Partial if coverage regresses.

### South East + Dorset pack targets

Hampshire is **not** a pack (maintained root). Build order (neighbours first):

Southampton → Portsmouth → Dorset → Bournemouth, Christchurch and Poole → Surrey → West Sussex → East Sussex → Brighton and Hove → Kent → Medway → Isle of Wight → Berkshire unitaries → Buckinghamshire → Milton Keynes → Oxfordshire.

## How to re-check coverage

```bash
pip install -r requirements-data.txt
npm run enrich:precis -- --limit 0          # schools (no cap)
npm run enrich:precis -- --ey --limit 200
npm run enrich:precis -- --childminders --limit 100
```

Soft-launch qualitative target (guideline, not a hard CI gate):

- Mainstream state primaries with precis ≳ 70%
- Mainstream state secondaries with precis ≳ 70%
- EY day care with precis ≳ 40%
- Consented childminders with precis ≳ 40%

Track remaining roadmap items in `DEFERRED_IDEAS.md`. Update the status table above when a bar item flips.
