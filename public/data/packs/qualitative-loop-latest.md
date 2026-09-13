# Qualitative capture loop

- Ran at: `2026-09-13T14:16:48.770421+00:00`
- Scope: `parallel`
- LA: `Buckinghamshire, Kent, West Sussex`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `90`
- Batch limit (per stream): `60`
- Sidecar records before → after: `2951` → `3131`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `17`
- Dry run: `False`

## Streams

- `Buckinghamshire`: status=ok added=60 remaining=89 index=`public/data/packs/buckinghamshire/schools-index.json`
- `Kent`: status=ok added=60 remaining=90 index=`public/data/packs/kent/schools-index.json`
- `West Sussex`: status=ok added=60 remaining=88 index=`public/data/packs/west-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 2951 published URN shards (prior=0 → 2951).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=90).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Buckinghamshire (remaining=89).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to West Sussex (remaining=88).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=90.
- Stream LA=Buckinghamshire index=public/data/packs/buckinghamshire/schools-index.json remainingWithWebsite=89.
- Stream LA=West Sussex index=public/data/packs/west-sussex/schools-index.json remainingWithWebsite=88.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 3131 records (union size 3131).
- Captured batch (sidecar 2951 → 3131); learned terms now 597.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +17.
- Re-merged affected schools-index files after QA fixes.
