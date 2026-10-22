# Qualitative capture loop

- Ran at: `2026-10-22T13:22:17.508641+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Dorset, East Sussex, Wiltshire`
- Index: `public/data/packs/wiltshire/schools-index.json`
- Remaining with website (pre-capture): `15`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7366` → `7381`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `4`
- Learned terms: `500`
- Learned QA phrases: `6`
- Dry run: `False`

## Streams

- `Dorset`: status=ok added=0 remaining=0 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=0 remaining=0 index=`public/data/packs/east-sussex/schools-index.json`
- `Wiltshire`: status=ok added=15 remaining=15 index=`public/data/packs/wiltshire/schools-index.json`

## Notes

- Hydrated working sidecar from 7366 published URN shards (prior=0 → 7366).
- Ingest policy=auto phase=se_tail (non-London remaining=15, London remaining=0, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Wiltshire (remaining=15).
- Stream preferred=Dorset exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=East Sussex exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Wiltshire index=public/data/packs/wiltshire/schools-index.json remainingWithWebsite=15.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=0.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7381 records (union size 7381).
- Captured batch (sidecar 7366 → 7381); learned terms now 529.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 4, learned phrases +6.
- Re-merged affected schools-index files after QA fixes.
