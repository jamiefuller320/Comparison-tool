# Qualitative capture loop

- Ran at: `2026-09-16T14:05:08.449369+00:00`
- Scope: `parallel`
- LA: `Milton Keynes, Portsmouth, Slough`
- Index: `public/data/packs/portsmouth/schools-index.json`
- Remaining with website (pre-capture): `62`
- Batch limit (per stream): `60`
- Sidecar records before → after: `3491` → `3668`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `27`
- Dry run: `False`

## Streams

- `Milton Keynes`: status=ok added=60 remaining=60 index=`public/data/packs/milton-keynes/schools-index.json`
- `Portsmouth`: status=ok added=60 remaining=62 index=`public/data/packs/portsmouth/schools-index.json`
- `Slough`: status=ok added=57 remaining=57 index=`public/data/packs/slough/schools-index.json`

## Notes

- Hydrated working sidecar from 3491 published URN shards (prior=0 → 3491).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Portsmouth (remaining=62).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Milton Keynes (remaining=60).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Slough (remaining=57).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Portsmouth index=public/data/packs/portsmouth/schools-index.json remainingWithWebsite=62.
- Stream LA=Milton Keynes index=public/data/packs/milton-keynes/schools-index.json remainingWithWebsite=60.
- Stream LA=Slough index=public/data/packs/slough/schools-index.json remainingWithWebsite=57.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 3668 records (union size 3668).
- Captured batch (sidecar 3491 → 3668); learned terms now 572.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +27.
- Re-merged affected schools-index files after QA fixes.
