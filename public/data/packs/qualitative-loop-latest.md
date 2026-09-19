# Qualitative capture loop

- Ran at: `2026-09-19T12:38:47.875714+00:00`
- Scope: `parallel`
- LA: `Buckinghamshire, Kent, West Sussex`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `30`
- Batch limit (per stream): `60`
- Sidecar records before → after: `3948` → `4035`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `6`
- Dry run: `False`

## Streams

- `Buckinghamshire`: status=ok added=29 remaining=29 index=`public/data/packs/buckinghamshire/schools-index.json`
- `Kent`: status=ok added=30 remaining=30 index=`public/data/packs/kent/schools-index.json`
- `West Sussex`: status=ok added=28 remaining=28 index=`public/data/packs/west-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 3948 published URN shards (prior=0 → 3948).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=30).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Buckinghamshire (remaining=29).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to West Sussex (remaining=28).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=30.
- Stream LA=Buckinghamshire index=public/data/packs/buckinghamshire/schools-index.json remainingWithWebsite=29.
- Stream LA=West Sussex index=public/data/packs/west-sussex/schools-index.json remainingWithWebsite=28.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4035 records (union size 4035).
- Captured batch (sidecar 3948 → 4035); learned terms now 557.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +6.
- Re-merged affected schools-index files after QA fixes.
