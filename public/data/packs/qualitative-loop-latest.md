# Qualitative capture loop

- Ran at: `2026-09-14T15:15:11.055677+00:00`
- Scope: `parallel`
- LA: `Southampton, Surrey, Wokingham`
- Index: `public/data/packs/surrey/schools-index.json`
- Remaining with website (pre-capture): `87`
- Batch limit (per stream): `60`
- Sidecar records before → after: `3131` → `3311`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `27`
- Dry run: `False`

## Streams

- `Southampton`: status=ok added=60 remaining=82 index=`public/data/packs/southampton/schools-index.json`
- `Surrey`: status=ok added=60 remaining=87 index=`public/data/packs/surrey/schools-index.json`
- `Wokingham`: status=ok added=60 remaining=83 index=`public/data/packs/wokingham/schools-index.json`

## Notes

- Hydrated working sidecar from 3131 published URN shards (prior=0 → 3131).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Surrey (remaining=87).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Wokingham (remaining=83).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Southampton (remaining=82).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=87.
- Stream LA=Wokingham index=public/data/packs/wokingham/schools-index.json remainingWithWebsite=83.
- Stream LA=Southampton index=public/data/packs/southampton/schools-index.json remainingWithWebsite=82.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 3311 records (union size 3311).
- Captured batch (sidecar 3131 → 3311); learned terms now 588.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +27.
- Re-merged affected schools-index files after QA fixes.
