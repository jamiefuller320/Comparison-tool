# Qualitative source spot-check — 2026-11-20T19:50:19.453600+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `2265357068`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `6` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Lyndhurst Primary School** (`148574`, Southwark) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: orchestra, ethos: vision
- **City of London Primary Academy, Islington** (`143020`, Islington) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: coding, curriculum: geography, curriculum: Systems and Searching, curriculum: Web Page Creation
- **Cardinal Newman Catholic Primary School** (`143364`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: geography, curriculum: mathematics, curriculum: Flourish, curriculum: Modern Languages
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic
- **Tadworth Primary School** (`152490`, Surrey) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Blackthorns Community Primary Academy** (`141892`, West Sussex) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our mission
- **Leigh Academy Molehill** (`138195`, Kent) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our mission, our vision
- **The Butts Primary School** (`116025`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: geography, curriculum: Animal Life Cycles, curriculum: Important Dates and Information, curriculum: Seacole and Florence Nightingale.

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
