# Qualitative capture loop

- Ran at: `2026-08-26T09:32:43.340024+00:00`
- Scope: `parallel`
- LA: `Hampshire, Dorset, East Sussex`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `34`
- Batch limit (per stream): `60`
- Sidecar records before → after: `671` → `825`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `31`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=34 remaining=34 index=`public/data/schools-index.json`
- `Dorset`: status=ok added=60 remaining=118 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=60 remaining=148 index=`public/data/packs/east-sussex/schools-index.json`

## Notes

- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=34.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=118.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=148.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 825 records (union size 825).
- Captured batch (sidecar 671 → 825); learned terms now 600.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +31.
- Re-merged affected schools-index files after QA fixes.
