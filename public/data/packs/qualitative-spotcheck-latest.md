# Qualitative source spot-check — 2026-11-18T20:14:23.225667+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `1138441401`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `6` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Newton Preparatory School** (`101082`, Wandsworth) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: robotics, curriculum: including robotics, enrichment: collaboration
- **Whiteheath Infant & Nursery School** (`102413`, Hillingdon) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: design technology, curriculum: geography, curriculum: mathematics
- **Crofton Hammond Junior School** (`116058`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics, enrichment: gymnastics, enrichment: gardening, community: Bereavement
- **Wallace Fields Junior School** (`125298`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Diversity Day Exhibition, curriculum: Year Five: Banksy, curriculum: Year Six: Rabindranath Tagore, enrichment: choir
- **Weston Park Primary School** (`145068`, Southampton) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: citizenship, curriculum: Bullying, curriculum: Caring Friendships and, curriculum: Change, Loss and Grief
- **Atelier21 Future School** (`147911`, West Sussex) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Goodwin Academy** (`146624`, Kent) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our ethos, our values

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
