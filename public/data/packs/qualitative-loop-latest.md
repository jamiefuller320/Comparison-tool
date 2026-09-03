# Qualitative capture loop

- Ran at: `2026-09-03T13:40:57.368372+00:00`
- Scope: `parallel`
- LA: `Kent, Surrey, West Sussex`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `630`
- Batch limit (per stream): `60`
- Sidecar records before → after: `1151` → `1331`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `25`
- Dry run: `False`

## Streams

- `Kent`: status=ok added=60 remaining=630 index=`public/data/packs/kent/schools-index.json`
- `Surrey`: status=ok added=60 remaining=447 index=`public/data/packs/surrey/schools-index.json`
- `West Sussex`: status=ok added=60 remaining=328 index=`public/data/packs/west-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 1151 published URN shards (prior=0 → 1151).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=630).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Surrey (remaining=447).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to West Sussex (remaining=328).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=630.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=447.
- Stream LA=West Sussex index=public/data/packs/west-sussex/schools-index.json remainingWithWebsite=328.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 1331 records (union size 1331).
- Captured batch (sidecar 1151 → 1331); learned terms now 611.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +25.
- Re-merged affected schools-index files after QA fixes.
