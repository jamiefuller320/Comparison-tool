# Qualitative source spot-check — 2026-11-22T19:16:37.977004+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `3750637864`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `6` · fail `0` · fetch_error `0` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Gifford Primary School** (`101898`, Ealing) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics, enrichment: breakfast club, enrichment: childcare, enrichment: Extended School Clubs
- **Jessop Primary School** (`100572`, Lambeth) — `pass`
- **Meon Junior School** (`144581`, Portsmouth) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values
- **Long Ditton St Mary's CofE (Aided) Junior School** (`125180`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Appeals and Appeals Timetable, curriculum: swimming, enrichment: swimming, enrichment: music
- **St Catherine's Catholic Primary School, Littlehampton** (`151256`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics, curriculum: love for mathematics, enrichment: music, enrichment: childcare
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic
- **Burnt Oak Primary School** (`131527`, Medway) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — inspired to achieve
- **Hailey Church of England Primary School** (`123108`, Oxfordshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: geography, curriculum: athletics, curriculum: Christian DistinctivenessChristian Distinctiveness
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our values

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
