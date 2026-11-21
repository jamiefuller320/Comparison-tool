# Qualitative source spot-check — 2026-11-21T18:55:02.714484+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `2196804240`
- Max pages / school: `3`
- Verdicts: pass `3` · warn `4` · fail `0` · fetch_error `0` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Essendine Primary School** (`101111`, Westminster) — `pass`
- **Beecroft Garden Primary** (`100674`, Lewisham) — `pass`
- **West Ashtead Primary Academy** (`149627`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: holiday club, curriculum: breakfast club, curriculum: wrap around care, curriculum: Attendance and Absence
- **Bournemouth School for Girls** (`136996`, Bournemouth, Christchurch and Poole) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Homework, curriculum: robotics, curriculum: coding, curriculum: separate sciences (biology
- **Langstone Primary Academy** (`144846`, Portsmouth) — `pass`
- **Endeavour Primary School** (`135887`, Hampshire) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **The Greville Primary School** (`125008`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — ethos: Disability
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our ethos

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
