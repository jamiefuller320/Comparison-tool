# Qualitative capture loop

- Ran at: `2026-08-27T19:39:22.502825+00:00`
- Scope: `parallel`
- LA: `Hampshire, Dorset, East Sussex`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `0`
- Batch limit (per stream): `60`
- Sidecar records before → after: `825` → `943`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `26`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=0 remaining=0 index=`public/data/schools-index.json`
- `Dorset`: status=ok added=58 remaining=58 index=`public/data/packs/dorset/schools-index.json`
- `East Sussex`: status=ok added=60 remaining=88 index=`public/data/packs/east-sussex/schools-index.json`

## Notes

- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=0.
- Stream LA=Dorset index=public/data/packs/dorset/schools-index.json remainingWithWebsite=58.
- Stream LA=East Sussex index=public/data/packs/east-sussex/schools-index.json remainingWithWebsite=88.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 943 records (union size 943).
- Captured batch (sidecar 825 → 943); learned terms now 590.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +26.
- Re-merged affected schools-index files after QA fixes.
