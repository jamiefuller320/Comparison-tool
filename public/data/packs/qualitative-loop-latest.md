# Qualitative capture loop

- Ran at: `2026-10-16T12:24:43.480414+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Barking and Dagenham, Kingston upon Thames, Tower Hamlets`
- Index: `public/data/packs/barking-and-dagenham/schools-index.json`
- Remaining with website (pre-capture): `5`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7118` → `7126`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `1`
- Learned terms: `500`
- Learned QA phrases: `1`
- Dry run: `False`

## Streams

- `Barking and Dagenham`: status=ok added=5 remaining=5 index=`public/data/packs/barking-and-dagenham/schools-index.json`
- `Kingston upon Thames`: status=ok added=3 remaining=3 index=`public/data/packs/kingston-upon-thames/schools-index.json`
- `Tower Hamlets`: status=ok added=0 remaining=0 index=`public/data/packs/tower-hamlets/schools-index.json`

## Notes

- Hydrated working sidecar from 7118 published URN shards (prior=0 → 7118).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=8, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Barking and Dagenham (remaining=5).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Kingston upon Thames (remaining=3).
- Stream preferred=Tower Hamlets exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Barking and Dagenham index=public/data/packs/barking-and-dagenham/schools-index.json remainingWithWebsite=5.
- Stream LA=Kingston upon Thames index=public/data/packs/kingston-upon-thames/schools-index.json remainingWithWebsite=3.
- Stream LA=Tower Hamlets index=public/data/packs/tower-hamlets/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7126 records (union size 7126).
- Captured batch (sidecar 7118 → 7126); learned terms now 540.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 1, learned phrases +1.
- Re-merged affected schools-index files after QA fixes.
