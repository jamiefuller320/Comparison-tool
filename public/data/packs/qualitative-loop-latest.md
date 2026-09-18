# Qualitative capture loop

- Ran at: `2026-09-18T13:30:40.260272+00:00`
- Scope: `parallel`
- LA: `Bracknell Forest, Oxfordshire, West Berkshire`
- Index: `public/data/packs/oxfordshire/schools-index.json`
- Remaining with website (pre-capture): `49`
- Batch limit (per stream): `60`
- Sidecar records before → after: `3819` → `3948`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `19`
- Dry run: `False`

## Streams

- `Bracknell Forest`: status=ok added=43 remaining=43 index=`public/data/packs/bracknell-forest/schools-index.json`
- `Oxfordshire`: status=ok added=49 remaining=49 index=`public/data/packs/oxfordshire/schools-index.json`
- `West Berkshire`: status=ok added=37 remaining=37 index=`public/data/packs/west-berkshire/schools-index.json`

## Notes

- Hydrated working sidecar from 3819 published URN shards (prior=0 → 3819).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Oxfordshire (remaining=49).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Bracknell Forest (remaining=43).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to West Berkshire (remaining=37).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Oxfordshire index=public/data/packs/oxfordshire/schools-index.json remainingWithWebsite=49.
- Stream LA=Bracknell Forest index=public/data/packs/bracknell-forest/schools-index.json remainingWithWebsite=43.
- Stream LA=West Berkshire index=public/data/packs/west-berkshire/schools-index.json remainingWithWebsite=37.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 3948 records (union size 3948).
- Captured batch (sidecar 3819 → 3948); learned terms now 560.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +19.
- Re-merged affected schools-index files after QA fixes.
