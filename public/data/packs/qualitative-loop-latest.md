# Qualitative capture loop

- Ran at: `2026-09-08T13:50:30.513530+00:00`
- Scope: `parallel`
- LA: `Kent, Surrey, West Sussex`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `330`
- Batch limit (per stream): `60`
- Sidecar records before → after: `2051` → `2231`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `11`
- Dry run: `False`

## Streams

- `Kent`: status=ok added=60 remaining=330 index=`public/data/packs/kent/schools-index.json`
- `Surrey`: status=ok added=60 remaining=207 index=`public/data/packs/surrey/schools-index.json`
- `West Sussex`: status=ok added=60 remaining=208 index=`public/data/packs/west-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 2051 published URN shards (prior=0 → 2051).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=330).
- Stream preferred=Dorset exhausted (remaining=0); advanced to West Sussex (remaining=208).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Surrey (remaining=207).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=330.
- Stream LA=West Sussex index=public/data/packs/west-sussex/schools-index.json remainingWithWebsite=208.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=207.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 2231 records (union size 2231).
- Captured batch (sidecar 2051 → 2231); learned terms now 634.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +11.
- Re-merged affected schools-index files after QA fixes.
