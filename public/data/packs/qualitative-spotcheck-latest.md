# Qualitative source spot-check — 2026-11-26T21:11:14.431797+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `3832732755`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `6` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **McMillan Nursery School** (`102365`, Hillingdon) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics
- **St Mary's CofE (Aided) Primary School** (`102593`, Kingston upon Thames) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Graduately Developing Futures** (`148046`, Dorset) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our ethos, our mission, our vision
- **East Claydon Church of England School** (`143643`, Buckinghamshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: music, ethos: Commitment
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england, our values, our vision
- **St Mary's School** (`142163`, East Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Academy Performance, curriculum: Consultation, curriculum: Cuckmere House School, curriculum: Frank Stanford
- **Oakwood School** (`125273`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: duke of edinburgh, curriculum: Anti-Radicalisation and Anti-Extremism, curriculum: Attendance, curriculum: Awards & Achievements
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **Lymington Junior School** (`116051`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: after school club, enrichment: childcare, ethos: Lower School Division Workshop, ethos: Upper School Division Workshop

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
