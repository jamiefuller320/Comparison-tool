# Qualitative source spot-check — 2026-10-31T17:03:34.531673+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `2513534123`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `6` · fail `1` · fetch_error `0` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `1` (auto `1` · gated `0`)
- Auto-learned into learned store: `True`
- Quality apply requested: `True`

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
- **Norwood Green Junior School** (`139869`, Hounslow) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: music, enrichment: but i especially art, ethos: kindness, ethos: respect
- **Heathmere Primary School** (`101029`, Wandsworth) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Contact Details, curriculum: Equality, curriculum: Exam and Assessment Results, curriculum: Information
- **South View Infant and Nursery School** (`115975`, Hampshire) — `fail`
  - `fail` `chrome_in_offerings` [community]: Product offerings look like site chrome / nav, not provision — School Dinners
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — community: Apply for Free School Meals, community: Diary Dates, community: Leaflets and Booklets, community: Triple P Courses
- **St John Fisher Catholic Primary School, Littlemore** (`139480`, Oxfordshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: art movements, enrichment: breakfast club, send: Accessibility Plan, send: Oxfordshire County Council Local Offer
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic, our mission

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review (never auto-learned).
- Sample capped at 21 (requested path stays O(sample) as corpus grows).
- Wrote 1 chrome/PDF flag candidates → /home/runner/work/Comparison-tool/Comparison-tool/output/spotcheck-human-flag-candidates.jsonl
- Recorded 1 spot-check phrase(s) into learned-qa-patterns.json (quality apply recommended)

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Safe chrome/PDF learnings auto-integrate → `output/learned-qa-patterns.json` → quality loop apply (same day when GHA dispatches)
- Human-gated candidates: `output/spotcheck-human-gated-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Ethos underclaim / unsupported offerings stay digest-only (never auto-learn)
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
