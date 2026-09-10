# Qualitative capture loop

- Ran at: `2026-09-10T13:51:33.091544+00:00`
- Scope: `parallel`
- LA: `Kent, Surrey, West Sussex`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `210`
- Batch limit (per stream): `60`
- Sidecar records before → after: `2411` → `2591`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `14`
- Dry run: `False`

## Streams

- `Kent`: status=ok added=60 remaining=210 index=`public/data/packs/kent/schools-index.json`
- `Surrey`: status=ok added=60 remaining=147 index=`public/data/packs/surrey/schools-index.json`
- `West Sussex`: status=ok added=60 remaining=148 index=`public/data/packs/west-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 2411 published URN shards (prior=0 → 2411).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=210).
- Stream preferred=Dorset exhausted (remaining=0); advanced to West Sussex (remaining=148).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Surrey (remaining=147).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=210.
- Stream LA=West Sussex index=public/data/packs/west-sussex/schools-index.json remainingWithWebsite=148.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=147.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 2591 records (union size 2591).
- Captured batch (sidecar 2411 → 2591); learned terms now 620.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +14.
- Re-merged affected schools-index files after QA fixes.
