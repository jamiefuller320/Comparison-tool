# Qualitative capture loop

- Ran at: `2026-09-07T15:00:24.315532+00:00`
- Scope: `parallel`
- LA: `Buckinghamshire, Kent, Oxfordshire`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `390`
- Batch limit (per stream): `60`
- Sidecar records before → after: `1871` → `2051`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `7`
- Dry run: `False`

## Streams

- `Buckinghamshire`: status=ok added=60 remaining=209 index=`public/data/packs/buckinghamshire/schools-index.json`
- `Kent`: status=ok added=60 remaining=390 index=`public/data/packs/kent/schools-index.json`
- `Oxfordshire`: status=ok added=60 remaining=229 index=`public/data/packs/oxfordshire/schools-index.json`

## Notes

- Hydrated working sidecar from 1871 published URN shards (prior=0 → 1871).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=390).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Oxfordshire (remaining=229).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Buckinghamshire (remaining=209).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=390.
- Stream LA=Oxfordshire index=public/data/packs/oxfordshire/schools-index.json remainingWithWebsite=229.
- Stream LA=Buckinghamshire index=public/data/packs/buckinghamshire/schools-index.json remainingWithWebsite=209.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 2051 records (union size 2051).
- Captured batch (sidecar 1871 → 2051); learned terms now 636.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +7.
- Re-merged affected schools-index files after QA fixes.
