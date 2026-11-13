# Qualitative capture loop

- Ran at: `2026-11-13T16:45:04.641386+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Gloucestershire, Somerset, Surrey`
- Index: `public/data/packs/gloucestershire/schools-index.json`
- Remaining with website (pre-capture): `83`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7876` → `7990`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `28`
- Dry run: `False`

## Streams

- `Gloucestershire`: status=ok added=60 remaining=83 index=`public/data/packs/gloucestershire/schools-index.json`
- `Somerset`: status=ok added=52 remaining=52 index=`public/data/packs/somerset/schools-index.json`
- `Surrey`: status=ok added=2 remaining=2 index=`public/data/packs/surrey/schools-index.json`

## Notes

- Hydrated working sidecar from 7876 published URN shards (prior=0 → 7876).
- Ingest policy=auto phase=se_tail (non-London remaining=142, London remaining=4, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Gloucestershire (remaining=83).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Somerset (remaining=52).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Surrey (remaining=2).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Gloucestershire index=public/data/packs/gloucestershire/schools-index.json remainingWithWebsite=83.
- Stream LA=Somerset index=public/data/packs/somerset/schools-index.json remainingWithWebsite=52.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=2.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7990 records (union size 7990).
- Captured batch (sidecar 7876 → 7990); learned terms now 513.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +28.
- Re-merged affected schools-index files after QA fixes.
