# Qualitative capture loop

- Ran at: `2026-10-03T14:04:32.157726+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Barnet, Hammersmith and Fulham, Harrow`
- Index: `public/data/packs/hammersmith-and-fulham/schools-index.json`
- Remaining with website (pre-capture): `77`
- Batch limit (per stream): `60`
- Sidecar records before → after: `5753` → `5933`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `26`
- Dry run: `False`

## Streams

- `Barnet`: status=ok added=60 remaining=73 index=`public/data/packs/barnet/schools-index.json`
- `Hammersmith and Fulham`: status=ok added=60 remaining=77 index=`public/data/packs/hammersmith-and-fulham/schools-index.json`
- `Harrow`: status=ok added=60 remaining=71 index=`public/data/packs/harrow/schools-index.json`

## Notes

- Hydrated working sidecar from 5753 published URN shards (prior=0 → 5753).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=1372, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Hammersmith and Fulham (remaining=77).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Barnet (remaining=73).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Harrow (remaining=71).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hammersmith and Fulham index=public/data/packs/hammersmith-and-fulham/schools-index.json remainingWithWebsite=77.
- Stream LA=Barnet index=public/data/packs/barnet/schools-index.json remainingWithWebsite=73.
- Stream LA=Harrow index=public/data/packs/harrow/schools-index.json remainingWithWebsite=71.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 5933 records (union size 5933).
- Captured batch (sidecar 5753 → 5933); learned terms now 565.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +26.
- Re-merged affected schools-index files after QA fixes.
