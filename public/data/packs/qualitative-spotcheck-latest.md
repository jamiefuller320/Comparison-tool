# Qualitative source spot-check — 2026-09-24T16:49:33.043875+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `2492643442`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `5` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Human-flag candidates written: `0`
- Flags recorded to learned store: `False`

## Schools

- **St Anne's Catholic Primary School** (`147519`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: gymnastics, enrichment: choir, enrichment: football, enrichment: cricket
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic, faithful, let all you do, our mission
- **Stafford Junior School** (`148724`, East Sussex) — `warn`
  - `warn` `heuristic_cms_chrome` [community]: Narrative lists CMS chrome alongside real provision — strip chrome only. — Strong publicly visible evidence for community and parental engagement (10 specific items). Listed provision includes Facebook, News & Newsletters, Outside Agency Directory, Prospe
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: dance, curriculum: geography, curriculum: Adventures of Isobel, curriculum: Alfred, Lord Tennyson
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — be the best you can be, our mission, our values, our vision
- **Millais School** (`126066`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: drama, enrichment: music
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our mission
- **Solebay Primary - A Paradigm Academy** (`138276`, Tower Hamlets) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Brampton College** (`101393`, Barnet) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: chemistry, curriculum: geography, enrichment: photography, enrichment: duke of edinburgh
- **Beacon Academy** (`137982`, East Sussex) — `pass`
- **Rolvenden Primary School** (`147563`, Kent) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: gymnastics, curriculum: athletics, curriculum: swimming, curriculum: dance

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review.

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Chrome candidates: `output/spotcheck-human-flag-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
