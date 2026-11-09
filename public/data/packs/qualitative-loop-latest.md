# Qualitative capture loop

- Ran at: `2026-11-09T18:58:41.159849+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Gloucestershire, Kent, Somerset`
- Index: `public/data/packs/gloucestershire/schools-index.json`
- Remaining with website (pre-capture): `325`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7383` → `7508`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `17`
- Dry run: `False`

## Streams

- `Gloucestershire`: status=ok added=60 remaining=325 index=`public/data/packs/gloucestershire/schools-index.json`
- `Kent`: status=ok added=5 remaining=5 index=`public/data/packs/kent/schools-index.json`
- `Somerset`: status=ok added=60 remaining=293 index=`public/data/packs/somerset/schools-index.json`

## Notes

- Hydrated working sidecar from 7383 published URN shards (prior=0 → 7383).
- Ingest policy=auto phase=se_tail (non-London remaining=636, London remaining=6, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Gloucestershire (remaining=325).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Somerset (remaining=293).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Kent (remaining=5).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Gloucestershire index=public/data/packs/gloucestershire/schools-index.json remainingWithWebsite=325.
- Stream LA=Somerset index=public/data/packs/somerset/schools-index.json remainingWithWebsite=293.
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=5.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7508 records (union size 7508).
- Captured batch (sidecar 7383 → 7508); learned terms now 504.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +17.
- Re-merged affected schools-index files after QA fixes.
