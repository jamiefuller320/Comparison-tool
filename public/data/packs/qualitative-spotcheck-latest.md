# Qualitative source spot-check — 2026-09-26T16:05:03.546884+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `1710439114`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `7` · fail `0` · fetch_error `0` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

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
- **Hague Primary School** (`100903`, Tower Hamlets) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — ethos: CEOP Safety Centre, ethos: Cbeebies, ethos: LGfL StaffMail, ethos: Times Tables Rock Stars
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values, our vision
- **Clapham Manor Primary School** (`100560`, Lambeth) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: mathematics, curriculum: music, curriculum: inclusive music education
- **Grayswood Church of England (Aided) Primary School** (`125245`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: french club, enrichment: science club, enrichment: chess, enrichment: choir
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our mission
- **Shelley Primary School** (`125820`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computer science, curriculum: computing, enrichment: drama, enrichment: football
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values

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
