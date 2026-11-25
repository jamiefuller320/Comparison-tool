# Qualitative source spot-check — 2026-11-25T21:25:06.473933+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `94216502`
- Max pages / school: `3`
- Verdicts: pass `2` · warn `4` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Heartlands High School** (`139616`, Haringey) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Queen Elizabeth's School, Barnet** (`136290`, Barnet) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: year 9 german exchange, enrichment: german theatre visits in year 9, ethos: kindness
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our mission
- **St John's Primary and Nursery School** (`116103`, Southampton) — `pass`
- **St James' Church of England Primary Academy** (`140760`, Bournemouth, Christchurch and Poole) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: geography, curriculum: music, curriculum: Early Years Foundation Stage, curriculum: Languages
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england
- **Wheatley Nursery School** (`122983`, Oxfordshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Cardinality and Counting
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **Chalfont Valley E-ACT Primary Academy** (`138583`, Buckinghamshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Autumn Shape Poem, curriculum: Dreams and Goals, curriculum: Easter Bonnet Parade, curriculum: Elmer and Rose
- **St Edmund's Catholic School** (`116505`, Portsmouth) — `pass`

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
