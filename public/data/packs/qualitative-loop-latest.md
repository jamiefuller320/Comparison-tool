# Qualitative capture loop

- Ran at: `2026-10-07T16:06:32.988075+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Enfield, Newham, Wandsworth`
- Index: `public/data/packs/wandsworth/schools-index.json`
- Remaining with website (pre-capture): `51`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6458` → `6601`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `11`
- Dry run: `False`

## Streams

- `Enfield`: status=ok added=46 remaining=46 index=`public/data/packs/enfield/schools-index.json`
- `Newham`: status=ok added=46 remaining=46 index=`public/data/packs/newham/schools-index.json`
- `Wandsworth`: status=ok added=51 remaining=51 index=`public/data/packs/wandsworth/schools-index.json`

## Notes

- Hydrated working sidecar from 6458 published URN shards (prior=0 → 6458).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=667, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Wandsworth (remaining=51).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Enfield (remaining=46).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Newham (remaining=46).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Wandsworth index=public/data/packs/wandsworth/schools-index.json remainingWithWebsite=51.
- Stream LA=Enfield index=public/data/packs/enfield/schools-index.json remainingWithWebsite=46.
- Stream LA=Newham index=public/data/packs/newham/schools-index.json remainingWithWebsite=46.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6601 records (union size 6601).
- Captured batch (sidecar 6458 → 6601); learned terms now 559.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +11.
- Re-merged affected schools-index files after QA fixes.
