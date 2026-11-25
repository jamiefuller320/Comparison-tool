# Qualitative capture loop

- Ran at: `2026-11-25T18:15:49.526965+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Dorset, East Sussex, Milton Keynes`
- Index: `public/data/packs/milton-keynes/schools-index.json`
- Remaining with website (pre-capture): `1`
- Batch limit (per stream): `60`
- Sidecar records before → after: `8026` → `8027`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `1`
- Learned terms: `500`
- Learned QA phrases: `0`
- Dry run: `False`

## Streams

- `Dorset`: status=ok added=0 remaining=0 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=0 remaining=0 index=`public/data/packs/east-sussex/schools-index.json`
- `Milton Keynes`: status=ok added=1 remaining=1 index=`public/data/packs/milton-keynes/schools-index.json`

## Notes

- Hydrated working sidecar from 8026 published URN shards (prior=0 → 8026).
- Ingest policy=auto phase=se_tail (non-London remaining=1, London remaining=0, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Milton Keynes (remaining=1).
- Stream preferred=Dorset exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=East Sussex exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Milton Keynes index=public/data/packs/milton-keynes/schools-index.json remainingWithWebsite=1.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=0.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 8027 records (union size 8027).
- Captured batch (sidecar 8026 → 8027); learned terms now 508.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 1, learned phrases +0.
- Re-merged affected schools-index files after QA fixes.
