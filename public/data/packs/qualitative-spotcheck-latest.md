# Qualitative source spot-check — 2026-11-17T20:40:40.363198+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `1956078515`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `5` · fail `0` · fetch_error `2` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Garden Suburb Infant School** (`101282`, Barnet) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **Kenley Primary School** (`148682`, Croydon) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **St Gregory's Catholic Primary School, Margate** (`140873`, Kent) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: geography, curriculum: such as history, curriculum: in subjects such as history, curriculum: computing
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic, our mission, our vision
- **St Nicolas Church of England Primary School, Abingdon** (`123166`, Oxfordshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: geography, curriculum: computing, enrichment: orchestra, enrichment: choir
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our ethos
- **Westfield School** (`131933`, Buckinghamshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: music, enrichment: Superhero Day Letter, enrichment: Animal Enrichment Day, enrichment: Cartoon Enrichment Day
- **Micheldever CofE Primary School** (`133292`, Hampshire) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Boxgrove CofE Primary School** (`125974`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: INFORMATION, enrichment: Sport Premium, enrichment: PE Sport Premium Report 2024-25 pdf, enrichment: cricket
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our ethos, our values

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
