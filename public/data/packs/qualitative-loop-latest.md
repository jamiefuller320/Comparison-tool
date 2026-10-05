# Qualitative capture loop

- Ran at: `2026-10-05T17:37:39.328755+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Barking and Dagenham, Islington, Kingston upon Thames`
- Index: `public/data/packs/islington/schools-index.json`
- Remaining with website (pre-capture): `67`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6113` → `6293`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `18`
- Dry run: `False`

## Streams

- `Barking and Dagenham`: status=ok added=60 remaining=65 index=`public/data/packs/barking-and-dagenham/schools-index.json`
- `Islington`: status=ok added=60 remaining=67 index=`public/data/packs/islington/schools-index.json`
- `Kingston upon Thames`: status=ok added=60 remaining=63 index=`public/data/packs/kingston-upon-thames/schools-index.json`

## Notes

- Hydrated working sidecar from 6113 published URN shards (prior=0 → 6113).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=1012, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Islington (remaining=67).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Barking and Dagenham (remaining=65).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Kingston upon Thames (remaining=63).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Islington index=public/data/packs/islington/schools-index.json remainingWithWebsite=67.
- Stream LA=Barking and Dagenham index=public/data/packs/barking-and-dagenham/schools-index.json remainingWithWebsite=65.
- Stream LA=Kingston upon Thames index=public/data/packs/kingston-upon-thames/schools-index.json remainingWithWebsite=63.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6293 records (union size 6293).
- Captured batch (sidecar 6113 → 6293); learned terms now 563.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +18.
- Re-merged affected schools-index files after QA fixes.
