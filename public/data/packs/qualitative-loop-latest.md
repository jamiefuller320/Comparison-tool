# Qualitative capture loop

- Ran at: `2026-10-17T12:28:18.607105+00:00`
- Ingest policy / phase: `auto` / `maintenance`
- Scope: `parallel`
- LA: `Hampshire, Lambeth, Tower Hamlets`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `0`
- Batch limit (per stream): `15`
- Sidecar records before → after: `7126` → `7126`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `3`
- Learned terms: `500`
- Learned QA phrases: `0`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=0 remaining=0 index=`public/data/schools-index.json`
- `Lambeth`: status=ok added=0 remaining=0 index=`public/data/packs/lambeth/schools-index.json`
- `Tower Hamlets`: status=ok added=0 remaining=0 index=`public/data/packs/tower-hamlets/schools-index.json`

## Notes

- Hydrated working sidecar from 7126 published URN shards (prior=0 → 7126).
- Ingest policy=auto phase=maintenance (non-London remaining=0, London remaining=0, pending London packs=0).
- Maintenance phase: core region website ingest complete — prioritise stale re-screens, qualitative-quality-loop, and pack-quality / selective Cursor polish; expand into adjacent LAs only when ready packs exist and maintenance budgets allow (see PROGRESSIVE_NATIONAL_PACK_BUILD_ORDER).
- Stream preferred=Hampshire exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Lambeth exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Tower Hamlets exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=0.
- Stream LA=Lambeth index=public/data/packs/lambeth/schools-index.json remainingWithWebsite=0.
- Stream LA=Tower Hamlets index=public/data/packs/tower-hamlets/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 15 each).
- Merged 3 partial sidecar(s) → 7126 records (union size 7126).
- Captured batch (sidecar 7126 → 7126); learned terms now 539.
- No new captures — website pools exhausted for selected streams (allow-empty no-op); still running synth/QA/refresh budget.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 3, learned phrases +0.
- Re-merged affected schools-index files after QA fixes.
