# Qualitative source spot-check — 2026-11-16T21:49:15.913046+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `2940233119`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `5` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Field End Junior School** (`148774`, Hillingdon) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: after school club, enrichment: breakfast club, enrichment: > after school clubs > parent
- **Ark Franklin Primary Academy** (`139830`, Brent) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics, curriculum: curiosity in mathematics, curriculum: music, curriculum: inclusive
- **Leigh Academy Horsmonden** (`147280`, Kent) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Amberley CofE Primary School** (`125970`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: swimming, enrichment: gymnastics, enrichment: professional PE coaches, staff, enrichment: professional PE coaches.
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our vision
- **Tenterden Church of England Junior School** (`143789`, Kent) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: PE and Sports Premium Funding»
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england
- **Chadlington Church of England Primary School** (`123096`, Oxfordshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: tennis, enrichment: cricket
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our values
- **Willow Primary School** (`139198`, Slough) — `pass`

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
