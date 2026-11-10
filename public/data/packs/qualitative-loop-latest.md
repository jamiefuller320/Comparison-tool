# Qualitative capture loop

- Ran at: `2026-11-10T17:05:57.286070+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Gloucestershire, Medway, Somerset`
- Index: `public/data/packs/gloucestershire/schools-index.json`
- Remaining with website (pre-capture): `263`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7508` → `7632`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `15`
- Dry run: `False`

## Streams

- `Gloucestershire`: status=ok added=60 remaining=263 index=`public/data/packs/gloucestershire/schools-index.json`
- `Medway`: status=ok added=4 remaining=4 index=`public/data/packs/medway/schools-index.json`
- `Somerset`: status=ok added=60 remaining=232 index=`public/data/packs/somerset/schools-index.json`

## Notes

- Hydrated working sidecar from 7508 published URN shards (prior=0 → 7508).
- Ingest policy=auto phase=se_tail (non-London remaining=508, London remaining=6, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Gloucestershire (remaining=263).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Somerset (remaining=232).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Medway (remaining=4).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Gloucestershire index=public/data/packs/gloucestershire/schools-index.json remainingWithWebsite=263.
- Stream LA=Somerset index=public/data/packs/somerset/schools-index.json remainingWithWebsite=232.
- Stream LA=Medway index=public/data/packs/medway/schools-index.json remainingWithWebsite=4.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7632 records (union size 7632).
- Captured batch (sidecar 7508 → 7632); learned terms now 504.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +15.
- Re-merged affected schools-index files after QA fixes.
