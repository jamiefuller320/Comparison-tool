# Qualitative capture loop

- Ran at: `2026-09-26T13:36:41.140313+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Bromley, Ealing, Southwark`
- Index: `public/data/packs/ealing/schools-index.json`
- Remaining with website (pre-capture): `118`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4493` → `4673`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `21`
- Dry run: `False`

## Streams

- `Bromley`: status=ok added=60 remaining=114 index=`public/data/packs/bromley/schools-index.json`
- `Ealing`: status=ok added=60 remaining=118 index=`public/data/packs/ealing/schools-index.json`
- `Southwark`: status=ok added=60 remaining=113 index=`public/data/packs/southwark/schools-index.json`

## Notes

- Hydrated working sidecar from 4493 published URN shards (prior=0 → 4493).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=2632, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Ealing (remaining=118).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Bromley (remaining=114).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Southwark (remaining=113).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Ealing index=public/data/packs/ealing/schools-index.json remainingWithWebsite=118.
- Stream LA=Bromley index=public/data/packs/bromley/schools-index.json remainingWithWebsite=114.
- Stream LA=Southwark index=public/data/packs/southwark/schools-index.json remainingWithWebsite=113.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4673 records (union size 4673).
- Captured batch (sidecar 4493 → 4673); learned terms now 562.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +21.
- Re-merged affected schools-index files after QA fixes.
