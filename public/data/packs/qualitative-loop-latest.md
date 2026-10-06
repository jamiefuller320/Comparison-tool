# Qualitative capture loop

- Ran at: `2026-10-06T16:01:38.970752+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Bromley, Ealing, Southwark`
- Index: `public/data/packs/ealing/schools-index.json`
- Remaining with website (pre-capture): `58`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6293` → `6458`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `21`
- Dry run: `False`

## Streams

- `Bromley`: status=ok added=54 remaining=54 index=`public/data/packs/bromley/schools-index.json`
- `Ealing`: status=ok added=58 remaining=58 index=`public/data/packs/ealing/schools-index.json`
- `Southwark`: status=ok added=53 remaining=53 index=`public/data/packs/southwark/schools-index.json`

## Notes

- Hydrated working sidecar from 6293 published URN shards (prior=0 → 6293).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=832, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Ealing (remaining=58).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Bromley (remaining=54).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Southwark (remaining=53).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Ealing index=public/data/packs/ealing/schools-index.json remainingWithWebsite=58.
- Stream LA=Bromley index=public/data/packs/bromley/schools-index.json remainingWithWebsite=54.
- Stream LA=Southwark index=public/data/packs/southwark/schools-index.json remainingWithWebsite=53.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6458 records (union size 6458).
- Captured batch (sidecar 6293 → 6458); learned terms now 558.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +21.
- Re-merged affected schools-index files after QA fixes.
