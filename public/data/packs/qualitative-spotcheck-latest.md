# Qualitative source spot-check — 2026-09-24T11:38:08.357511+00:00

- Mode: `dry-run`
- Sample size: `7` (requested `7`)
- Seed: `20260924`
- Max pages / school: `3`
- Verdicts: pass `0` · warn `0` · fail `0` · fetch_error `0` · skip `7`
- Automated fail bar: chrome / PDF junk in offerings, or overclaim with chrome-heavy cells
- Human-flag candidates written: `0`
- Flags recorded to learned store: `False`

## Schools

- **St Anne's Catholic Primary School** (`147519`, Hampshire) — `skip`
- **Stafford Junior School** (`148724`, East Sussex) — `skip`
- **Millais School** (`126066`, West Sussex) — `skip`
- **Buttercup Primary School** (`138564`, Tower Hamlets) — `skip`
- **All Saints' CofE Nursery and Primary School N20** (`101329`, Barnet) — `skip`
- **Hawkedale Primary School** (`125284`, Surrey) — `skip`
- **Ditton Church of England Junior School** (`150156`, Kent) — `skip`

## Notes

- Live fetch; polite rate limit
- Automated checks approximate the human fidelity bar; ethos underclaim and PDF-only evidence still need human review.
- Dry run — selected sample only; no live fetches.

## Feedback path

- Digest: `public/data/packs/qualitative-spotcheck-latest.{json,md}`
- Chrome candidates: `output/spotcheck-human-flag-candidates.jsonl` → `npm run qa:human-flags -- --jsonl …` then `npm run loop:qualitative-quality`
- Failures are **fidelity signals** for extractor / QA polish — not a hard Pages deploy gate unless `--strict` is set on the loop.
