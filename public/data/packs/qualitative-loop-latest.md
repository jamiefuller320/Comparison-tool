# Qualitative capture loop

- Ran at: `2026-09-02T13:28:09.223260+00:00`
- Scope: `parallel`
- LA: `Kent, Oxfordshire, Surrey`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `690`
- Batch limit (per stream): `60`
- Sidecar records before → after: `971` → `1151`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `18`
- Dry run: `False`

## Streams

- `Kent`: status=ok added=60 remaining=690 index=`public/data/packs/kent/schools-index.json`
- `Oxfordshire`: status=ok added=60 remaining=349 index=`public/data/packs/oxfordshire/schools-index.json`
- `Surrey`: status=ok added=60 remaining=507 index=`public/data/packs/surrey/schools-index.json`

## Notes

- Hydrated working sidecar from 971 published URN shards (prior=0 → 971).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=689).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Surrey (remaining=507).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Oxfordshire (remaining=349).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=690).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=690.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=507.
- Stream LA=Oxfordshire index=public/data/packs/oxfordshire/schools-index.json remainingWithWebsite=349.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 1151 records (union size 1151).
- Captured batch (sidecar 971 → 1151); learned terms now 607.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +18.
- Re-merged affected schools-index files after QA fixes.
