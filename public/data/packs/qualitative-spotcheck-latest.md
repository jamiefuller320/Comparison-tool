# Qualitative source spot-check — 2026-11-08T06:59:54.908048+00:00

- Mode: `dry-run`
- Sample size: `3` (requested `3`)
- Seed: `42`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `0` · fail `0` · fetch_error `0` · skip `3`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Learning candidates written: `0` (auto `0` · gated `0`)
- Auto-learned into learned store: `False`
- Quality apply requested: `False`

## Schools

- **Uplands Primary School and Nursery** (`150721`, Bracknell Forest) — `skip`
- **Harlington School** (`102451`, Hillingdon) — `skip`
- **Burnside Secondary PRU** (`137328`, Waltham Forest) — `skip`

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review (never auto-learned).
- Sample capped at 21 (requested path stays O(sample) as corpus grows).
- Dry run — selected sample only; no live fetches.

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Safe chrome/PDF learnings auto-integrate → `output/learned-qa-patterns.json` → quality loop apply (same day when GHA dispatches)
- Human-gated candidates: `output/spotcheck-human-gated-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Ethos underclaim / unsupported offerings stay digest-only (never auto-learn)
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
