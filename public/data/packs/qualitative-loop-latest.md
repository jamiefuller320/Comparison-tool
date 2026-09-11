# Qualitative capture loop

- Ran at: `2026-09-11T13:49:33.636093+00:00`
- Scope: `parallel`
- LA: `Bournemouth, Christchurch and Poole, Kent, Milton Keynes`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `150`
- Batch limit (per stream): `60`
- Sidecar records before → after: `2591` → `2771`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `8`
- Dry run: `False`

## Streams

- `Bournemouth, Christchurch and Poole`: status=ok added=60 remaining=111 index=`public/data/packs/bournemouth-christchurch-and-poole/schools-index.json`
- `Kent`: status=ok added=60 remaining=150 index=`public/data/packs/kent/schools-index.json`
- `Milton Keynes`: status=ok added=60 remaining=120 index=`public/data/packs/milton-keynes/schools-index.json`

## Notes

- Hydrated working sidecar from 2591 published URN shards (prior=0 → 2591).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=150).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Milton Keynes (remaining=120).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Bournemouth, Christchurch and Poole (remaining=111).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=150.
- Stream LA=Milton Keynes index=public/data/packs/milton-keynes/schools-index.json remainingWithWebsite=120.
- Stream LA=Bournemouth, Christchurch and Poole index=public/data/packs/bournemouth-christchurch-and-poole/schools-index.json remainingWithWebsite=111.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 2771 records (union size 2771).
- Captured batch (sidecar 2591 → 2771); learned terms now 611.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +8.
- Re-merged affected schools-index files after QA fixes.
