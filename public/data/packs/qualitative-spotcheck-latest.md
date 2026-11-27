# Qualitative source spot-check — 2026-11-27T20:55:52.819024+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `372294243`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `6` · fail `0` · fetch_error `0` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **OMG Education** (`150750`, Tower Hamlets) — `pass`
- **St David's Prep** (`101690`, Bromley) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: music, curriculum: which includes latin, enrichment: music, enrichment: choir
- **Calmore Junior School** (`116483`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: geography
- **Therfield School** (`143902`, Surrey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: chemistry, curriculum: mathematics, curriculum: computer science, curriculum: geography
- **Hill View Primary School** (`142352`, Bournemouth, Christchurch and Poole) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: geography, curriculum: music, curriculum: Baseline Assessments., curriculum: Book Swaps
- **Holbrook Primary School** (`125965`, West Sussex) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: mathematics, curriculum: discovery that mathematics brings, enrichment: music, enrichment: School Productions
- **Brightwalton C.E. Aided Primary School** (`110008`, West Berkshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: Formative and Summative Assessment, curriculum: Introduction, curriculum: Professional Responsibilities, curriculum: Service Perseverance Wisdom Friendship Trust

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
