# Qualitative capture loop

- Ran at: `2026-11-12T17:28:53.403271+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Gloucestershire, Milton Keynes, Somerset`
- Index: `public/data/packs/gloucestershire/schools-index.json`
- Remaining with website (pre-capture): `143`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7754` → `7876`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `15`
- Dry run: `False`

## Streams

- `Gloucestershire`: status=ok added=60 remaining=143 index=`public/data/packs/gloucestershire/schools-index.json`
- `Milton Keynes`: status=ok added=2 remaining=2 index=`public/data/packs/milton-keynes/schools-index.json`
- `Somerset`: status=ok added=60 remaining=112 index=`public/data/packs/somerset/schools-index.json`

## Notes

- Hydrated working sidecar from 7754 published URN shards (prior=0 → 7754).
- Ingest policy=auto phase=se_tail (non-London remaining=264, London remaining=4, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Gloucestershire (remaining=143).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Somerset (remaining=112).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Milton Keynes (remaining=2).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Gloucestershire index=public/data/packs/gloucestershire/schools-index.json remainingWithWebsite=143.
- Stream LA=Somerset index=public/data/packs/somerset/schools-index.json remainingWithWebsite=112.
- Stream LA=Milton Keynes index=public/data/packs/milton-keynes/schools-index.json remainingWithWebsite=2.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7876 records (union size 7876).
- Captured batch (sidecar 7754 → 7876); learned terms now 510.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +15.
- Re-merged affected schools-index files after QA fixes.
