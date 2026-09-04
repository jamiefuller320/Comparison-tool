# Qualitative capture loop

- Ran at: `2026-09-04T13:43:40.842156+00:00`
- Scope: `parallel`
- LA: `Kent, Oxfordshire, Surrey`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `570`
- Batch limit (per stream): `60`
- Sidecar records before → after: `1331` → `1511`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `18`
- Dry run: `False`

## Streams

- `Kent`: status=ok added=60 remaining=570 index=`public/data/packs/kent/schools-index.json`
- `Oxfordshire`: status=ok added=60 remaining=289 index=`public/data/packs/oxfordshire/schools-index.json`
- `Surrey`: status=ok added=60 remaining=387 index=`public/data/packs/surrey/schools-index.json`

## Notes

- Hydrated working sidecar from 1331 published URN shards (prior=0 → 1331).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=570).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Surrey (remaining=387).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Oxfordshire (remaining=289).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=570.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=387.
- Stream LA=Oxfordshire index=public/data/packs/oxfordshire/schools-index.json remainingWithWebsite=289.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 1511 records (union size 1511).
- Captured batch (sidecar 1331 → 1511); learned terms now 622.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +18.
- Re-merged affected schools-index files after QA fixes.
