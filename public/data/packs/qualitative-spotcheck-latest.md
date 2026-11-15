# Qualitative source spot-check — 2026-11-15T18:40:22.549789+00:00

- Mode: `spotcheck`
- Sample size: `7` (requested `7`)
- Seed: `992669236`
- Max pages / school: `3`
- Verdicts: pass `2` · warn `4` · fail `0` · fetch_error `1` · skip `0`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Pembury House Nursery School** (`102071`, Haringey) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — community: Coleridge Primary School, community: School. Tower Hamlets, community: Seven Sisters Primary School, community: St Elizabeth Catholic Primary
- **Ashmole Primary School** (`142772`, Barnet) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: computing, curriculum: geography, enrichment: computing, enrichment: geography
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — our vision
- **Holy Family Catholic Primary School** (`151043`, Slough) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — enrichment: music, enrichment: choir, enrichment: orchestra, enrichment: Bernard’s Catholic Grammar
  - `warn` `possible_underclaim` [ethos]: Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells — catholic, faithful, our mission
- **Newlands Primary School** (`138436`, Kent) — `fetch_error`
  - `warn` `fetch_failed`: Could not fetch live school pages for source comparison
- **Sinclair Primary and Nursery School - Part of the Learning Federation Partnership of Schools** (`133943`, Southampton) — `pass`
- **King Edward VI School** (`116580`, Southampton) — `pass`
- **Dolphin School** (`110163`, Wokingham) — `warn`
  - `warn` `unsupported_offerings`: Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check) — curriculum: holiday club, curriculum: wraparound care, curriculum: Enquiry Form, curriculum: Forest School

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
