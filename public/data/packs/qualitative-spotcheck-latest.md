# Qualitative source spot-check — 2026-09-25T16:54:37.736731+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `3837537759`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `5` · fail `1` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Human-flag candidates written: `1`
- Flags recorded to learned store: `False`

## Schools

- **St Anne's Catholic Primary School** (`147519`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: music, enrichment: music lovers, community: swimming, community: basketball
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — faithful, let all you do, our mission, our vision
- **Stafford Junior School** (`148724`, East Sussex) — `warn`
  - `warn` `heuristic_cms_chrome` [community]: Narrative lists CMS chrome alongside real provision — strip chrome only. — Strong publicly visible evidence for community and parental engagement (10 specific items). Listed provision includes Facebook, News & Newsletters, Outside Agency Directory, Prospe
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: dance, curriculum: geography, curriculum: Adventures of Isobel, curriculum: Alfred, Lord Tennyson
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — be the best you can be, our mission, our values, our vision
- **Millais School** (`126066`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: drama, enrichment: music
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our mission
- **Platanos College** (`136450`, Lambeth) — `fail`
  - `fail` `chrome_in_offerings` [send]: Product offerings look like site chrome / nav, not provision — School Nursing Team
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Healthy Body Healthy, curriculum: Electrolysis, curriculum: Photosynthesis, curriculum: Radioactivity
- **Croydon Metropolitan College** (`137567`, Croydon) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **East Stour Primary School** (`148991`, Kent) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **Rose Green Junior School** (`141600`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: geography, curriculum: Dreams and Goals, curriculum: Online Relationships Healthy Eating

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review.
- Wrote 1 chrome flag candidates → /home/runner/work/Comparison-tool/Comparison-tool/output/spotcheck-human-flag-candidates.jsonl

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Chrome candidates: `output/spotcheck-human-flag-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
