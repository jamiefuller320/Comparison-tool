# Qualitative source spot-check — 2026-10-07T18:42:09.819854+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `2419675875`
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
- **Chepstow House School** (`136057`, Kensington and Chelsea) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: expressive art, enrichment: Developing Fine Motor Skills, enrichment: Forest School, enrichment: Messy Play
- **Gorringe Park Primary School** (`102654`, Merton) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics, enrichment: PE and Sport Premium, enrichment: after school club, enrichment: breakfast club
- **South Lake Primary School** (`150004`, Wokingham) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics, curriculum: Communication and Language, curriculum: Enabling Environments, curriculum: Expressive Arts and Design
- **St Mary Magdalene Catholic Primary School** (`110483`, Milton Keynes) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: after school club, community: School Partnerships Striving for Excellence»
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic, our mission

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
