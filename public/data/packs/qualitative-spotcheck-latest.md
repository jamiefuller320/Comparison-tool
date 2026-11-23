# Qualitative source spot-check — 2026-11-23T23:38:52.134737+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `4036715454`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `5` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Saint Christina's School** (`101169`, Westminster) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Charities, curriculum: Facilities, curriculum: Healthy Eating, curriculum: Metacognition
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic
- **Bacon's College** (`145313`, Southwark) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computer science, curriculum: chemistry, curriculum: computing, curriculum: AQA Specification
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england
- **Inclusion School Aldershot** (`152155`, Hampshire) — `pass`
- **Cornfield School, Littlehampton** (`126170`, West Sussex) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Sandy Lane Primary School** (`149386`, Bracknell Forest) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Phonics and Reading, curriculum: mathematics, curriculum: maths in mathematics, curriculum: to supplement our maths curriculum
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **Swiss Gardens Primary School** (`125914`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: geography, curriculum: mathematics, curriculum: music
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values
- **Sevenoaks Preparatory School** (`118953`, Kent) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: chess, enrichment: Bricks4Kids Lego, enrichment: Playball, enrichment: Recorder Club

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
