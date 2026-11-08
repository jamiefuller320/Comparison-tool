# Qualitative source spot-check — 2026-11-08T17:48:46.724135+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `1358213343`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `6` · fail `0` · fetch_error `0` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Uplands Primary School and Nursery** (`150721`, Bracknell Forest) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: Notation., enrichment: Performing.
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — inspired to achieve
- **Allen Edwards Primary School** (`100598`, Lambeth) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: extended day, ethos: Therapist and Outreach Workers, ethos: faith, ethos: smsc
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values, our vision
- **Arnhem Wharf Primary School** (`130352`, Tower Hamlets) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: Booking Process Guide, enrichment: Child Registration Guide, enrichment: Dear Parents and Carers
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **West Park CofE Primary (Controlled) School** (`126016`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: gymnastics, enrichment: dance, enrichment: sequences in gymnastics, send: Absence and Attendance
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **Willow Primary School** (`139198`, Slough) — `pass`
- **Bishop Tufnell CofE Primary School, Felpham** (`126050`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Measuring Weight Shape Repeating, curriculum: Addition and Subtraction, curriculum: Number- Addition and, curriculum: Number- Fractions Number- Decimals and
- **Pond Meadow School** (`141533`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Admissions and Accessibility, curriculum: Attendance, curriculum: Compliments and Complaints, curriculum: Financials and Charging
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values, our vision

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review (never auto-learned).
- Sample capped at 21 (requested path stays O(sample) as corpus grows).

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Safe chrome/PDF learnings auto-integrate → `output/learned-qa-patterns.json` → quality loop apply (same day when GHA dispatches)
- Human-gated candidates: `output/spotcheck-human-gated-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Ethos underclaim / unsupported offerings stay digest-only (never auto-learn)
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
