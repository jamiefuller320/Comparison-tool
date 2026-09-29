# Qualitative capture loop

- Ran at: `2026-09-29T15:46:44.683469+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Bexley, Haringey, Lewisham`
- Index: `public/data/packs/lewisham/schools-index.json`
- Remaining with website (pre-capture): `94`
- Batch limit (per stream): `60`
- Sidecar records before → after: `5033` → `5213`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `17`
- Dry run: `False`

## Streams

- `Bexley`: status=ok added=60 remaining=90 index=`public/data/packs/bexley/schools-index.json`
- `Haringey`: status=ok added=60 remaining=93 index=`public/data/packs/haringey/schools-index.json`
- `Lewisham`: status=ok added=60 remaining=94 index=`public/data/packs/lewisham/schools-index.json`

## Notes

- Hydrated working sidecar from 5033 published URN shards (prior=0 → 5033).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=2092, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Lewisham (remaining=94).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Haringey (remaining=93).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Bexley (remaining=90).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Lewisham index=public/data/packs/lewisham/schools-index.json remainingWithWebsite=94.
- Stream LA=Haringey index=public/data/packs/haringey/schools-index.json remainingWithWebsite=93.
- Stream LA=Bexley index=public/data/packs/bexley/schools-index.json remainingWithWebsite=90.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 5213 records (union size 5213).
- Captured batch (sidecar 5033 → 5213); learned terms now 565.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +17.
- Re-merged affected schools-index files after QA fixes.
