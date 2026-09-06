# Qualitative capture loop

- Ran at: `2026-09-06T13:09:38.472631+00:00`
- Scope: `parallel`
- LA: `Kent, Surrey, West Sussex`
- Index: `public/data/packs/kent/schools-index.json`
- Remaining with website (pre-capture): `450`
- Batch limit (per stream): `60`
- Sidecar records before → after: `1691` → `1871`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `7`
- Dry run: `False`

## Streams

- `Kent`: status=ok added=60 remaining=450 index=`public/data/packs/kent/schools-index.json`
- `Surrey`: status=ok added=60 remaining=267 index=`public/data/packs/surrey/schools-index.json`
- `West Sussex`: status=ok added=60 remaining=268 index=`public/data/packs/west-sussex/schools-index.json`

## Notes

- Hydrated working sidecar from 1691 published URN shards (prior=0 → 1691).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kent (remaining=450).
- Stream preferred=Dorset exhausted (remaining=0); advanced to West Sussex (remaining=268).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Surrey (remaining=267).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kent index=public/data/packs/kent/schools-index.json remainingWithWebsite=450.
- Stream LA=West Sussex index=public/data/packs/west-sussex/schools-index.json remainingWithWebsite=268.
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=267.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 1871 records (union size 1871).
- Captured batch (sidecar 1691 → 1871); learned terms now 632.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +7.
- Re-merged affected schools-index files after QA fixes.
