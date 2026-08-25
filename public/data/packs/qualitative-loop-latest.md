# Qualitative capture loop

- Ran at: `2026-08-25T09:19:11.252834+00:00`
- Scope: `parallel`
- LA: `Hampshire, Dorset, East Sussex`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `94`
- Batch limit (per stream): `60`
- Sidecar records before → after: `491` → `671`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `42`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=60 remaining=94 index=`public/data/schools-index.json`
- `Dorset`: status=ok added=60 remaining=178 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=60 remaining=208 index=`public/data/packs/east-sussex/schools-index.json`

## Notes

- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=94.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=178.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=208.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 671 records (union size 671).
- Captured batch (sidecar 491 → 671); learned terms now 601.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +42.
- Re-merged affected schools-index files after QA fixes.
