# Qualitative capture loop

- Ran at: `2026-11-11T16:32:37.380801+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Gloucestershire, Merton, Somerset`
- Index: `public/data/packs/gloucestershire/schools-index.json`
- Remaining with website (pre-capture): `203`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7632` → `7754`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `27`
- Dry run: `False`

## Streams

- `Gloucestershire`: status=ok added=60 remaining=203 index=`public/data/packs/gloucestershire/schools-index.json`
- `Merton`: status=ok added=2 remaining=2 index=`public/data/packs/merton/schools-index.json`
- `Somerset`: status=ok added=60 remaining=172 index=`public/data/packs/somerset/schools-index.json`

## Notes

- Hydrated working sidecar from 7632 published URN shards (prior=0 → 7632).
- Ingest policy=auto phase=se_tail (non-London remaining=384, London remaining=6, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Gloucestershire (remaining=203).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Somerset (remaining=172).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Merton (remaining=2).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Gloucestershire index=public/data/packs/gloucestershire/schools-index.json remainingWithWebsite=203.
- Stream LA=Somerset index=public/data/packs/somerset/schools-index.json remainingWithWebsite=172.
- Stream LA=Merton index=public/data/packs/merton/schools-index.json remainingWithWebsite=2.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7754 records (union size 7754).
- Captured batch (sidecar 7632 → 7754); learned terms now 508.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +27.
- Re-merged affected schools-index files after QA fixes.
