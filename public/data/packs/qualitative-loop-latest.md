# Qualitative capture loop

- Ran at: `2026-09-12T12:57:59.865005+00:00`
- Scope: `parallel`
- LA: `Medway, Oxfordshire, West Berkshire`
- Index: `public/data/packs/medway/schools-index.json`
- Remaining with website (pre-capture): `110`
- Batch limit (per stream): `60`
- Sidecar records before → after: `2771` → `2951`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `6`
- Dry run: `False`

## Streams

- `Medway`: status=ok added=60 remaining=110 index=`public/data/packs/medway/schools-index.json`
- `Oxfordshire`: status=ok added=60 remaining=109 index=`public/data/packs/oxfordshire/schools-index.json`
- `West Berkshire`: status=ok added=60 remaining=97 index=`public/data/packs/west-berkshire/schools-index.json`

## Notes

- Hydrated working sidecar from 2771 published URN shards (prior=0 → 2771).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Medway (remaining=110).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Oxfordshire (remaining=109).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to West Berkshire (remaining=97).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Medway index=public/data/packs/medway/schools-index.json remainingWithWebsite=110.
- Stream LA=Oxfordshire index=public/data/packs/oxfordshire/schools-index.json remainingWithWebsite=109.
- Stream LA=West Berkshire index=public/data/packs/west-berkshire/schools-index.json remainingWithWebsite=97.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 2951 records (union size 2951).
- Captured batch (sidecar 2771 → 2951); learned terms now 605.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +6.
- Re-merged affected schools-index files after QA fixes.
