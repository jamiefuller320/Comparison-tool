# Hampshire soft-launch bar

Finite deployable standard before showing School Compass to the world.
Not a commitment to finish the whole roadmap — a **parental product** bar with
**Hampshire maintained depth** and **South East (+ Dorset) pack coverage**.

Last reviewed: 2026-08-03.

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
| 3 Qualitative enough | **Pass (guideline)** | Hampshire mainstream ~91% / EY ~43% / CM ~51%. Region packs: schools ~88%+ précis, EY ~87%, CM ~74%; mainstream primary/secondary ≫70%. Independent ISI/précis polish waves + weekly automated loop — measure with `npm run report:pack-quality` |
| 4 Provenance | **Pass** | Board stamps + precis footnotes; visit-pack report button still optional |
| 5 Ops | **Pass** | Precis merge-preserved across harvest; KS2 national cache under `.cache/ees/`; `harvest:hampshire` + `pack:southeast:complete`; weekly `pack-quality-loop` + `qualitative-loop` (`npm run loop:pack-quality` / `loop:qualitative`) |
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
npm run loop:pack-quality -- --max-packs 3 --isi-resolve-cap 50 --precis-limit 40
```

Future phases (interest weighting, pack TTL, SCH-batched KS2) are logged under **Continuous data-quality automation** in `DEFERRED_IDEAS.md` — return there rather than re-deriving from chat.

Soft-launch qualitative target (guideline, not a hard CI gate):

- Mainstream state primaries with precis ≳ 70%
- Mainstream state secondaries with precis ≳ 70%
- EY day care with precis ≳ 40%
- Consented childminders with precis ≳ 40%

Track remaining roadmap items in `DEFERRED_IDEAS.md`. Update the status table above when a bar item flips.
