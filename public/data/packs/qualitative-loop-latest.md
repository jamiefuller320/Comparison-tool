# Qualitative capture loop

- Ran at: `2026-09-05T12:53:38.018797+00:00`
- Scope: `parallel`
- LA: `Buckinghamshire, Kent, Surrey`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `510`
- Batch limit (per stream): `60`
- Sidecar records before → after: `1511` → `1691`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `22`
- Dry run: `False`

## Streams

- `Buckinghamshire`: status=ok added=60 remaining=269 index=`public/data/packs/buckinghamshire/schools-index.json`
- `Kent`: status=ok added=60 remaining=510 index=`public/data/packs/kent/schools-index.json`
- `Surrey`: status=ok added=60 remaining=327 index=`public/data/packs/surrey/schools-index.json`

## Notes

- Hydrated working sidecar from 1511 published URN shards (prior=0 → 1511).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=510).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Surrey (remaining=327).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Buckinghamshire (remaining=269).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=510.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=327.
- Stream LA=Buckinghamshire index=public/data/packs/buckinghamshire/schools-index.json remainingWithWebsite=269.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 1691 records (union size 1691).
- Captured batch (sidecar 1511 → 1691); learned terms now 629.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +22.
- Re-merged affected schools-index files after QA fixes.
