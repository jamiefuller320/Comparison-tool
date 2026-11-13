# Qualitative source spot-check — 2026-11-13T19:25:53.545898+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `1870107779`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `6` · fail `0` · fetch_error `0` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Akiva School** (`135086`, Barnet) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values, tikkun olam
- **All Saints' Church of England Primary School Blackheath** (`100719`, Lewisham) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: dance, curriculum: A Great Big Cuddle—Michael Rosen, curriculum: Aaaarrgghh Spider– Lydia Monks, curriculum: Actual Size—Steve Jenkins
- **Red Barn Community Primary School** (`116079`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: music, enrichment: enjoying music
- **Bobbing Village School** (`140899`, Kent) — `pass`
- **Greyfriars Catholic School** (`146800`, Oxfordshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Careers Advice and Guidance, curriculum: Exams Office, curriculum: Independent Learning, curriculum: T Levels
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic, our mission
- **Madani Academy** (`140624`, Portsmouth) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — community: computing
- **The Emmbrook School** (`148453`, Wokingham) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — community: Quick Links for Parents

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review (never auto-learned).
- Sample capped at 21 (requested path stays O(sample) as corpus grows).
- Rotated spot-check anchors out (≥3 identical warns): 135086

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Safe chrome/PDF learnings auto-integrate → `output/learned-qa-patterns.json` → quality loop apply (same day when GHA dispatches)
- Human-gated candidates: `output/spotcheck-human-gated-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Ethos underclaim / unsupported offerings stay digest-only (never auto-learn)
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
