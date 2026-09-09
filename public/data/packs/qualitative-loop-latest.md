# Qualitative capture loop

- Ran at: `2026-09-09T14:03:05.034493+00:00`
- Scope: `parallel`
- LA: `Buckinghamshire, Kent, Oxfordshire`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `270`
- Batch limit (per stream): `60`
- Sidecar records before → after: `2231` → `2411`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `11`
- Dry run: `False`

## Streams

- `Buckinghamshire`: status=ok added=60 remaining=149 index=`public/data/packs/buckinghamshire/schools-index.json`
- `Kent`: status=ok added=60 remaining=270 index=`public/data/packs/kent/schools-index.json`
- `Oxfordshire`: status=ok added=60 remaining=169 index=`public/data/packs/oxfordshire/schools-index.json`

## Notes

- Hydrated working sidecar from 2231 published URN shards (prior=0 → 2231).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=270).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Oxfordshire (remaining=169).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Buckinghamshire (remaining=149).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=270.
- Stream LA=Oxfordshire index=public/data/packs/oxfordshire/schools-index.json remainingWithWebsite=169.
- Stream LA=Buckinghamshire index=public/data/packs/buckinghamshire/schools-index.json remainingWithWebsite=149.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 2411 records (union size 2411).
- Captured batch (sidecar 2231 → 2411); learned terms now 629.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +11.
- Re-merged affected schools-index files after QA fixes.
