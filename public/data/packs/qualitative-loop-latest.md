# Qualitative capture loop

- Ran at: `2026-10-09T15:23:27.554283+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Bexley, Haringey, Lewisham`
- Index: `public/data/packs/lewisham/schools-index.json`
- Remaining with website (pre-capture): `34`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6720` → `6817`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `9`
- Dry run: `False`

## Streams

- `Bexley`: status=ok added=30 remaining=30 index=`public/data/packs/bexley/schools-index.json`
- `Haringey`: status=ok added=33 remaining=33 index=`public/data/packs/haringey/schools-index.json`
- `Lewisham`: status=ok added=34 remaining=34 index=`public/data/packs/lewisham/schools-index.json`

## Notes

- Hydrated working sidecar from 6720 published URN shards (prior=0 → 6720).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=405, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Lewisham (remaining=34).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Haringey (remaining=33).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Bexley (remaining=30).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Lewisham index=public/data/packs/lewisham/schools-index.json remainingWithWebsite=34.
- Stream LA=Haringey index=public/data/packs/haringey/schools-index.json remainingWithWebsite=33.
- Stream LA=Bexley index=public/data/packs/bexley/schools-index.json remainingWithWebsite=30.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6817 records (union size 6817).
- Captured batch (sidecar 6720 → 6817); learned terms now 555.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +9.
- Re-merged affected schools-index files after QA fixes.
