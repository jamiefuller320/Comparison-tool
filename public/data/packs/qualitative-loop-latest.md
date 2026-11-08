# Qualitative capture loop

- Ran at: `2026-11-08T14:25:05.731629+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Hampshire, Dorset, East Sussex`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `578`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7382` → `7383`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `6`
- Learned terms: `500`
- Learned QA phrases: `2`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=0 remaining=0 index=`public/data/schools-index.json`
- `Dorset`: status=ok added=1 remaining=1 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=0 remaining=0 index=`public/data/packs/east-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 7382 published URN shards (prior=0 → 7382).
- Ingest policy=auto phase=se_tail (non-London remaining=4982, London remaining=2943, pending London packs=0).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=578.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=178.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=207.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7383 records (union size 7383).
- Captured batch (sidecar 7382 → 7383); learned terms now 595.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 6, learned phrases +2.
- Re-merged affected schools-index files after QA fixes.
