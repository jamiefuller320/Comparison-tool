# Qualitative source spot-check — 2026-11-24T22:08:44.956320+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `2754857146`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `4` · fail `0` · fetch_error `2` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Downsell Primary School** (`103044`, Waltham Forest) — `pass`
- **Darrick Wood Infant & Nursery School** (`137032`, Bromley) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — ethos: smsc
- **Beaminster St Mary's Academy** (`140560`, Dorset) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: breakfast club, ethos: Admission Appealpdf
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values, our vision
- **Wellington College Prep** (`110133`, Bracknell Forest) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our values
- **St Mary Magdalen Catholic Primary School** (`114541`, Brighton and Hove) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **King's Academy College Park (Infant)** (`145452`, Portsmouth) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Cumnor Church of England School (Voluntary Controlled)** (`123146`, Oxfordshire) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our values, our vision

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
