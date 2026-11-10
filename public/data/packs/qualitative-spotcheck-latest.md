# Qualitative source spot-check — 2026-11-10T19:30:55.524450+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `342516282`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `6` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Uplands Primary School and Nursery** (`150721`, Bracknell Forest) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: Notation., enrichment: Performing.
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — inspired to achieve
- **Allen Edwards Primary School** (`100598`, Lambeth) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: extended day, ethos: Therapist and Outreach Workers, ethos: faith, ethos: smsc
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values, our vision
- **Arnhem Wharf Primary School** (`130352`, Tower Hamlets) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: Booking Process Guide, enrichment: Child Registration Guide, enrichment: Dear Parents and Carers
- **Rolvenden Primary School** (`147563`, Kent) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: music, enrichment: orchestra, enrichment: be played in a band, ethos: religious education
- **Cobham Hall** (`118991`, Kent) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: Transport, enrichment: music, enrichment: natural sets for drama, ethos: Scholarships and Bursaries
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our values
- **Fulmer Infant School** (`110227`, Buckinghamshire) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: geography, curriculum: mathematics, curriculum: music
- **Weyfield Primary Academy** (`139070`, Surrey) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review (never auto-learned).
- Sample capped at 21 (requested path stays O(sample) as corpus grows).
- Rotated spot-check anchors out (≥3 identical warns): 100598, 150721

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Safe chrome/PDF learnings auto-integrate → `output/learned-qa-patterns.json` → quality loop apply (same day when GHA dispatches)
- Human-gated candidates: `output/spotcheck-human-gated-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Ethos underclaim / unsupported offerings stay digest-only (never auto-learn)
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
