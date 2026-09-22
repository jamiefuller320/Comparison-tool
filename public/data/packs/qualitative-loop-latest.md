# Qualitative capture loop

- Ran at: `2026-09-22T12:32:55.530244+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Dorset, East Sussex, Portsmouth`
- Index: `public/data/packs/portsmouth/schools-index.json`
- Remaining with website (pre-capture): `2`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4151` → `4153`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `0`
- Learned terms: `500`
- Learned QA phrases: `0`
- Dry run: `False`

## Streams

- `Dorset`: status=ok added=0 remaining=0 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=0 remaining=0 index=`public/data/packs/east-sussex/schools-index.json`
- `Portsmouth`: status=ok added=2 remaining=2 index=`public/data/packs/portsmouth/schools-index.json`

## Notes

- Hydrated working sidecar from 4151 published URN shards (prior=0 → 4151).
- Ingest policy=auto phase=se_tail (non-London remaining=2, London remaining=0, pending London packs=33).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Portsmouth (remaining=2).
- Stream preferred=Dorset exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=East Sussex exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Portsmouth index=public/data/packs/portsmouth/schools-index.json remainingWithWebsite=2.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=0.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4153 records (union size 4153).
- Captured batch (sidecar 4151 → 4153); learned terms now 550.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 0, learned phrases +0.
