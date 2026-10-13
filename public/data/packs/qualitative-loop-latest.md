# Qualitative capture loop

- Ran at: `2026-10-13T15:30:31.981986+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Barnet, Hammersmith and Fulham, Harrow`
- Index: `public/data/packs/hammersmith-and-fulham/schools-index.json`
- Remaining with website (pre-capture): `17`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7033` → `7074`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `9`
- Learned terms: `500`
- Learned QA phrases: `5`
- Dry run: `False`

## Streams

- `Barnet`: status=ok added=13 remaining=13 index=`public/data/packs/barnet/schools-index.json`
- `Hammersmith and Fulham`: status=ok added=17 remaining=17 index=`public/data/packs/hammersmith-and-fulham/schools-index.json`
- `Harrow`: status=ok added=11 remaining=11 index=`public/data/packs/harrow/schools-index.json`

## Notes

- Hydrated working sidecar from 7033 published URN shards (prior=0 → 7033).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=92, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Hammersmith and Fulham (remaining=17).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Barnet (remaining=13).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Harrow (remaining=11).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hammersmith and Fulham index=public/data/packs/hammersmith-and-fulham/schools-index.json remainingWithWebsite=17.
- Stream LA=Barnet index=public/data/packs/barnet/schools-index.json remainingWithWebsite=13.
- Stream LA=Harrow index=public/data/packs/harrow/schools-index.json remainingWithWebsite=11.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7074 records (union size 7074).
- Captured batch (sidecar 7033 → 7074); learned terms now 549.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 9, learned phrases +5.
- Re-merged affected schools-index files after QA fixes.
