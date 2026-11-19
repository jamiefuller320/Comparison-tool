# Qualitative capture loop

- Ran at: `2026-11-19T16:33:44.351887+00:00`
- Ingest policy / phase: `auto` / `maintenance`
- Scope: `parallel`
- LA: `Hampshire, Milton Keynes, Southwark`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `1`
- Batch limit (per stream): `15`
- Sidecar records before → after: `8023` → `8026`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `2`
- Learned terms: `500`
- Learned QA phrases: `1`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=1 remaining=1 index=`public/data/schools-index.json`
- `Milton Keynes`: status=ok added=1 remaining=1 index=`public/data/packs/milton-keynes/schools-index.json`
- `Southwark`: status=ok added=1 remaining=1 index=`public/data/packs/southwark/schools-index.json`

## Notes

- Hydrated working sidecar from 8023 published URN shards (prior=0 → 8023).
- Ingest policy=auto phase=maintenance (non-London remaining=0, London remaining=0, pending London packs=0).
- Maintenance phase: core region website ingest complete — prioritise stale re-screens, qualitative-quality-loop, and pack-quality / selective Cursor polish; expand into adjacent LAs only when ready packs exist and maintenance budgets allow (see PROGRESSIVE_NATIONAL_PACK_BUILD_ORDER).
- Stream preferred=Hampshire exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Lambeth exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Tower Hamlets exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Milton Keynes (remaining=1).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Southwark (remaining=1).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=1.
- Stream LA=Milton Keynes index=public/data/packs/milton-keynes/schools-index.json remainingWithWebsite=1.
- Stream LA=Southwark index=public/data/packs/southwark/schools-index.json remainingWithWebsite=1.
- Running 3 capture streams in parallel (limit 15 each).
- Merged 3 partial sidecar(s) → 8026 records (union size 8026).
- Captured batch (sidecar 8023 → 8026); learned terms now 511.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 2, learned phrases +1.
- Re-merged affected schools-index files after QA fixes.
