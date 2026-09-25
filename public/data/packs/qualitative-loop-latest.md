# Qualitative capture loop

- Ran at: `2026-09-25T14:32:40.474367+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Barnet, Lambeth, Tower Hamlets`
- Index: `public/data/packs/barnet/schools-index.json`
- Remaining with website (pre-capture): `133`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4394` → `4493`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `13`
- Dry run: `False`

## Streams

- `Barnet`: status=ok added=60 remaining=133 index=`public/data/packs/barnet/schools-index.json`
- `Lambeth`: status=ok added=12 remaining=12 index=`public/data/packs/lambeth/schools-index.json`
- `Tower Hamlets`: status=ok added=27 remaining=27 index=`public/data/packs/tower-hamlets/schools-index.json`

## Notes

- Hydrated working sidecar from 4394 published URN shards (prior=0 → 4394).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=2731, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Barnet (remaining=133).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Barnet index=public/data/packs/barnet/schools-index.json remainingWithWebsite=133.
- Stream LA=Lambeth index=public/data/packs/lambeth/schools-index.json remainingWithWebsite=12.
- Stream LA=Tower Hamlets index=public/data/packs/tower-hamlets/schools-index.json remainingWithWebsite=27.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4493 records (union size 4493).
- Captured batch (sidecar 4394 → 4493); learned terms now 561.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +13.
- Re-merged affected schools-index files after QA fixes.
