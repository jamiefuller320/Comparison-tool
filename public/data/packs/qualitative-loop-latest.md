# Qualitative capture loop

- Ran at: `2026-08-28T20:04:16.989347+00:00`
- Scope: `parallel`
- LA: `Hampshire, Dorset, East Sussex`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `0`
- Batch limit (per stream): `60`
- Sidecar records before → after: `943` → `971`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `9`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=0 remaining=0 index=`public/data/schools-index.json`
- `Dorset`: status=ok added=0 remaining=0 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=28 remaining=28 index=`public/data/packs/east-sussex/schools-index.json`

## Notes

- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=0.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=0.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=28.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 971 records (union size 971).
- Captured batch (sidecar 943 → 971); learned terms now 570.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +9.
- Re-merged affected schools-index files after QA fixes.
