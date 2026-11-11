# Qualitative source spot-check — 2026-11-11T19:26:13.894086+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `1318861037`
- Max pages / school: `3`
- Verdicts: pass `1` · warn `5` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Arnhem Wharf Primary School** (`130352`, Tower Hamlets) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: Booking Process Guide, enrichment: Child Registration Guide, enrichment: Dear Parents and Carers
- **Akiva School** (`135086`, Barnet) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values, tikkun olam
- **St Lawrence Church of England Primary School** (`118704`, Kent) — `pass`
- **All Saints Church of England Primary School** (`142137`, Medway) — `warn`
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — church of england
- **George Grenville Academy** (`140368`, Buckinghamshire) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Thomas Harding Junior School** (`145069`, Buckinghamshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: music, enrichment: music, enrichment: Young Voices, enrichment: Sports Premium
- **Foxhills Infant School** (`116024`, Hampshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: french club, enrichment: gymnastics, enrichment: football, enrichment: drama

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
