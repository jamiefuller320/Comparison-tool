# Qualitative capture loop

- Ran at: `2026-09-17T13:56:26.145906+00:00`
- Scope: `parallel`
- LA: `Bournemouth, Christchurch and Poole, Isle of Wight, Medway`
- Index: `public/data/packs/bournemouth-christchurch-and-poole/schools-index.json`
- Remaining with website (pre-capture): `51`
- Batch limit (per stream): `60`
- Sidecar records before → after: `3668` → `3819`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `14`
- Dry run: `False`

## Streams

- `Bournemouth, Christchurch and Poole`: status=ok added=51 remaining=51 index=`public/data/packs/bournemouth-christchurch-and-poole/schools-index.json`
- `Isle of Wight`: status=ok added=50 remaining=50 index=`public/data/packs/isle-of-wight/schools-index.json`
- `Medway`: status=ok added=50 remaining=50 index=`public/data/packs/medway/schools-index.json`

## Notes

- Hydrated working sidecar from 3668 published URN shards (prior=0 → 3668).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Bournemouth, Christchurch and Poole (remaining=51).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Isle of Wight (remaining=50).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Medway (remaining=50).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Bournemouth, Christchurch and Poole index=public/data/packs/bournemouth-christchurch-and-poole/schools-index.json remainingWithWebsite=51.
- Stream LA=Isle of Wight index=public/data/packs/isle-of-wight/schools-index.json remainingWithWebsite=50.
- Stream LA=Medway index=public/data/packs/medway/schools-index.json remainingWithWebsite=50.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 3819 records (union size 3819).
- Captured batch (sidecar 3668 → 3819); learned terms now 566.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +14.
- Re-merged affected schools-index files after QA fixes.
