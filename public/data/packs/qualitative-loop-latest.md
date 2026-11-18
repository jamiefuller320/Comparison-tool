# Qualitative capture loop

- Ran at: `2026-11-18T16:25:25.139918+00:00`
- Ingest policy / phase: `auto` / `maintenance`
- Scope: `parallel`
- LA: `Bournemouth, Christchurch and Poole, Lambeth, Tower Hamlets`
- Index: `public/data/packs/bournemouth-christchurch-and-poole/schools-index.json`
- Remaining with website (pre-capture): `1`
- Batch limit (per stream): `15`
- Sidecar records before → after: `8022` → `8023`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `0`
- Learned terms: `500`
- Learned QA phrases: `0`
- Dry run: `False`

## Streams

- `Bournemouth, Christchurch and Poole`: status=ok added=1 remaining=1 index=`public/data/packs/bournemouth-christchurch-and-poole/schools-index.json`
- `Lambeth`: status=ok added=0 remaining=0 index=`public/data/packs/lambeth/schools-index.json`
- `Tower Hamlets`: status=ok added=0 remaining=0 index=`public/data/packs/tower-hamlets/schools-index.json`

## Notes

- Hydrated working sidecar from 8022 published URN shards (prior=0 → 8022).
- Ingest policy=auto phase=maintenance (non-London remaining=0, London remaining=0, pending London packs=0).
- Maintenance phase: core region website ingest complete — prioritise stale re-screens, qualitative-quality-loop, and pack-quality / selective Cursor polish; expand into adjacent LAs only when ready packs exist and maintenance budgets allow (see PROGRESSIVE_NATIONAL_PACK_BUILD_ORDER).
- Stream preferred=Hampshire exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Lambeth exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Tower Hamlets exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Bournemouth, Christchurch and Poole (remaining=1).
- Stream LA=Bournemouth, Christchurch and Poole index=public/data/packs/bournemouth-christchurch-and-poole/schools-index.json remainingWithWebsite=1.
- Stream LA=Lambeth index=public/data/packs/lambeth/schools-index.json remainingWithWebsite=0.
- Stream LA=Tower Hamlets index=public/data/packs/tower-hamlets/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 15 each).
- Merged 3 partial sidecar(s) → 8023 records (union size 8023).
- Captured batch (sidecar 8022 → 8023); learned terms now 511.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 0, learned phrases +0.
