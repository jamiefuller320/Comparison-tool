# Qualitative capture loop

- Ran at: `2026-09-15T14:05:25.787165+00:00`
- Scope: `parallel`
- LA: `Brighton and Hove, Reading, Windsor and Maidenhead`
- Index: `public/data/packs/windsor-and-maidenhead/schools-index.json`
- Remaining with website (pre-capture): `82`
- Batch limit (per stream): `60`
- Sidecar records before → after: `3311` → `3491`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `17`
- Dry run: `False`

## Streams

- `Brighton and Hove`: status=ok added=60 remaining=74 index=`public/data/packs/brighton-and-hove/schools-index.json`
- `Reading`: status=ok added=60 remaining=68 index=`public/data/packs/reading/schools-index.json`
- `Windsor and Maidenhead`: status=ok added=60 remaining=82 index=`public/data/packs/windsor-and-maidenhead/schools-index.json`

## Notes

- Hydrated working sidecar from 3311 published URN shards (prior=0 → 3311).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Windsor and Maidenhead (remaining=82).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Brighton and Hove (remaining=74).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Reading (remaining=68).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Windsor and Maidenhead index=public/data/packs/windsor-and-maidenhead/schools-index.json remainingWithWebsite=82.
- Stream LA=Brighton and Hove index=public/data/packs/brighton-and-hove/schools-index.json remainingWithWebsite=74.
- Stream LA=Reading index=public/data/packs/reading/schools-index.json remainingWithWebsite=68.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 3491 records (union size 3491).
- Captured batch (sidecar 3311 → 3491); learned terms now 582.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +17.
- Re-merged affected schools-index files after QA fixes.
