# Qualitative capture loop

- Ran at: `2026-09-27T14:22:15.587600+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Enfield, Newham, Wandsworth`
- Index: `public/data/packs/wandsworth/schools-index.json`
- Remaining with website (pre-capture): `111`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4673` → `4853`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `16`
- Dry run: `False`

## Streams

- `Enfield`: status=ok added=60 remaining=106 index=`public/data/packs/enfield/schools-index.json`
- `Newham`: status=ok added=60 remaining=106 index=`public/data/packs/newham/schools-index.json`
- `Wandsworth`: status=ok added=60 remaining=111 index=`public/data/packs/wandsworth/schools-index.json`

## Notes

- Hydrated working sidecar from 4673 published URN shards (prior=0 → 4673).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=2452, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Wandsworth (remaining=111).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Enfield (remaining=106).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Newham (remaining=106).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Wandsworth index=public/data/packs/wandsworth/schools-index.json remainingWithWebsite=111.
- Stream LA=Enfield index=public/data/packs/enfield/schools-index.json remainingWithWebsite=106.
- Stream LA=Newham index=public/data/packs/newham/schools-index.json remainingWithWebsite=106.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4853 records (union size 4853).
- Captured batch (sidecar 4673 → 4853); learned terms now 568.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +16.
- Re-merged affected schools-index files after QA fixes.
