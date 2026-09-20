# Qualitative capture loop

- Ran at: `2026-09-20T12:44:20.010710+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Southampton, Surrey, Wokingham`
- Index: `public/data/packs/surrey/schools-index.json`
- Remaining with website (pre-capture): `27`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4035` → `4107`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `9`
- Dry run: `False`

## Streams

- `Southampton`: status=ok added=22 remaining=22 index=`public/data/packs/southampton/schools-index.json`
- `Surrey`: status=ok added=27 remaining=27 index=`public/data/packs/surrey/schools-index.json`
- `Wokingham`: status=ok added=23 remaining=23 index=`public/data/packs/wokingham/schools-index.json`

## Notes

- Hydrated working sidecar from 4035 published URN shards (prior=0 → 4035).
- Ingest policy=auto phase=se_tail (non-London remaining=118, London remaining=0, pending London packs=33).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Surrey (remaining=27).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Wokingham (remaining=23).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Southampton (remaining=22).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Surrey index=public/data/packs/surrey/schools-index.json remainingWithWebsite=27.
- Stream LA=Wokingham index=public/data/packs/wokingham/schools-index.json remainingWithWebsite=23.
- Stream LA=Southampton index=public/data/packs/southampton/schools-index.json remainingWithWebsite=22.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4107 records (union size 4107).
- Captured batch (sidecar 4035 → 4107); learned terms now 557.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +9.
- Re-merged affected schools-index files after QA fixes.
