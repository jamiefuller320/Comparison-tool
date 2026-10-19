# Qualitative capture loop

- Ran at: `2026-10-19T16:11:30.548063+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Dorset, East Sussex, Wiltshire`
- Index: `public/data/packs/wiltshire/schools-index.json`
- Remaining with website (pre-capture): `195`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7186` → `7246`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `19`
- Dry run: `False`

## Streams

- `Dorset`: status=ok added=0 remaining=0 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=0 remaining=0 index=`public/data/packs/east-sussex/schools-index.json`
- `Wiltshire`: status=ok added=60 remaining=195 index=`public/data/packs/wiltshire/schools-index.json`

## Notes

- Hydrated working sidecar from 7186 published URN shards (prior=0 → 7186).
- Ingest policy=auto phase=se_tail (non-London remaining=195, London remaining=0, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Wiltshire (remaining=195).
- Stream preferred=Dorset exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=East Sussex exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Wiltshire index=public/data/packs/wiltshire/schools-index.json remainingWithWebsite=195.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=0.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7246 records (union size 7246).
- Captured batch (sidecar 7186 → 7246); learned terms now 534.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +19.
- Re-merged affected schools-index files after QA fixes.
