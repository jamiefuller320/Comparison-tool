# Qualitative capture loop

- Ran at: `2026-11-16T16:59:14.644437+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Hillingdon, Slough, Wandsworth`
- Index: `public/data/packs/hillingdon/schools-index.json`
- Remaining with website (pre-capture): `1`
- Batch limit (per stream): `60`
- Sidecar records before → after: `8019` → `8022`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `1`
- Learned terms: `500`
- Learned QA phrases: `0`
- Dry run: `False`

## Streams

- `Hillingdon`: status=ok added=1 remaining=1 index=`public/data/packs/hillingdon/schools-index.json`
- `Slough`: status=ok added=1 remaining=1 index=`public/data/packs/slough/schools-index.json`
- `Wandsworth`: status=ok added=1 remaining=1 index=`public/data/packs/wandsworth/schools-index.json`

## Notes

- Hydrated working sidecar from 8019 published URN shards (prior=0 → 8019).
- Ingest policy=auto phase=se_tail (non-London remaining=1, London remaining=2, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Hillingdon (remaining=1).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Slough (remaining=1).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Wandsworth (remaining=1).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hillingdon index=public/data/packs/hillingdon/schools-index.json remainingWithWebsite=1.
- Stream LA=Slough index=public/data/packs/slough/schools-index.json remainingWithWebsite=1.
- Stream LA=Wandsworth index=public/data/packs/wandsworth/schools-index.json remainingWithWebsite=1.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 8022 records (union size 8022).
- Captured batch (sidecar 8019 → 8022); learned terms now 512.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 1, learned phrases +0.
- Re-merged affected schools-index files after QA fixes.
