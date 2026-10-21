# Qualitative capture loop

- Ran at: `2026-10-21T14:32:19.279318+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Dorset, East Sussex, Wiltshire`
- Index: `public/data/packs/wiltshire/schools-index.json`
- Remaining with website (pre-capture): `75`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7306` → `7366`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `12`
- Dry run: `False`

## Streams

- `Dorset`: status=ok added=0 remaining=0 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=0 remaining=0 index=`public/data/packs/east-sussex/schools-index.json`
- `Wiltshire`: status=ok added=60 remaining=75 index=`public/data/packs/wiltshire/schools-index.json`

## Notes

- Hydrated working sidecar from 7306 published URN shards (prior=0 → 7306).
- Ingest policy=auto phase=se_tail (non-London remaining=75, London remaining=0, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Wiltshire (remaining=75).
- Stream preferred=Dorset exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=East Sussex exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Wiltshire index=public/data/packs/wiltshire/schools-index.json remainingWithWebsite=75.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=0.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7366 records (union size 7366).
- Captured batch (sidecar 7306 → 7366); learned terms now 533.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +12.
- Re-merged affected schools-index files after QA fixes.
