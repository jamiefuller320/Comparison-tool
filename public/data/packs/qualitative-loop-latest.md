# Qualitative capture loop

- Ran at: `2026-11-15T14:43:24.032988+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Brighton and Hove, Buckinghamshire, Enfield`
- Index: `public/data/packs/brighton-and-hove/schools-index.json`
- Remaining with website (pre-capture): `1`
- Batch limit (per stream): `60`
- Sidecar records before → after: `8016` → `8019`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `1`
- Learned terms: `500`
- Learned QA phrases: `5`
- Dry run: `False`

## Streams

- `Brighton and Hove`: status=ok added=1 remaining=1 index=`public/data/packs/brighton-and-hove/schools-index.json`
- `Buckinghamshire`: status=ok added=1 remaining=1 index=`public/data/packs/buckinghamshire/schools-index.json`
- `Enfield`: status=ok added=1 remaining=1 index=`public/data/packs/enfield/schools-index.json`

## Notes

- Hydrated working sidecar from 8016 published URN shards (prior=0 → 8016).
- Ingest policy=auto phase=se_tail (non-London remaining=3, London remaining=3, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Brighton and Hove (remaining=1).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Buckinghamshire (remaining=1).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Enfield (remaining=1).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Brighton and Hove index=public/data/packs/brighton-and-hove/schools-index.json remainingWithWebsite=1.
- Stream LA=Buckinghamshire index=public/data/packs/buckinghamshire/schools-index.json remainingWithWebsite=1.
- Stream LA=Enfield index=public/data/packs/enfield/schools-index.json remainingWithWebsite=1.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 8019 records (union size 8019).
- Captured batch (sidecar 8016 → 8019); learned terms now 512.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 1, learned phrases +5.
- Re-merged affected schools-index files after QA fixes.
