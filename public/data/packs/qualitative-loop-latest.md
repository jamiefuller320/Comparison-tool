# Qualitative capture loop

- Ran at: `2026-11-14T14:37:47.970434+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Brent, Gloucestershire, West Sussex`
- Index: `public/data/packs/gloucestershire/schools-index.json`
- Remaining with website (pre-capture): `23`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7990` → `8016`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `5`
- Learned terms: `500`
- Learned QA phrases: `3`
- Dry run: `False`

## Streams

- `Brent`: status=ok added=1 remaining=1 index=`public/data/packs/brent/schools-index.json`
- `Gloucestershire`: status=ok added=23 remaining=23 index=`public/data/packs/gloucestershire/schools-index.json`
- `West Sussex`: status=ok added=2 remaining=2 index=`public/data/packs/west-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 7990 published URN shards (prior=0 → 7990).
- Ingest policy=auto phase=se_tail (non-London remaining=28, London remaining=4, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Gloucestershire (remaining=23).
- Stream preferred=Dorset exhausted (remaining=0); advanced to West Sussex (remaining=2).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Brent (remaining=1).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Gloucestershire index=public/data/packs/gloucestershire/schools-index.json remainingWithWebsite=23.
- Stream LA=West Sussex index=public/data/packs/west-sussex/schools-index.json remainingWithWebsite=2.
- Stream LA=Brent index=public/data/packs/brent/schools-index.json remainingWithWebsite=1.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 8016 records (union size 8016).
- Captured batch (sidecar 7990 → 8016); learned terms now 512.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 5, learned phrases +3.
- Re-merged affected schools-index files after QA fixes.
