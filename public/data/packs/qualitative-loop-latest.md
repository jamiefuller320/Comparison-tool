# Qualitative capture loop

- Ran at: `2026-10-02T15:52:42.618190+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Hackney, Richmond upon Thames, Waltham Forest`
- Index: `public/data/packs/waltham-forest/schools-index.json`
- Remaining with website (pre-capture): `81`
- Batch limit (per stream): `60`
- Sidecar records before → after: `5573` → `5753`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `22`
- Dry run: `False`

## Streams

- `Hackney`: status=ok added=60 remaining=79 index=`public/data/packs/hackney/schools-index.json`
- `Richmond upon Thames`: status=ok added=60 remaining=80 index=`public/data/packs/richmond-upon-thames/schools-index.json`
- `Waltham Forest`: status=ok added=60 remaining=81 index=`public/data/packs/waltham-forest/schools-index.json`

## Notes

- Hydrated working sidecar from 5573 published URN shards (prior=0 → 5573).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=1552, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Waltham Forest (remaining=81).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Richmond upon Thames (remaining=80).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Hackney (remaining=79).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Waltham Forest index=public/data/packs/waltham-forest/schools-index.json remainingWithWebsite=81.
- Stream LA=Richmond upon Thames index=public/data/packs/richmond-upon-thames/schools-index.json remainingWithWebsite=80.
- Stream LA=Hackney index=public/data/packs/hackney/schools-index.json remainingWithWebsite=79.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 5753 records (union size 5753).
- Captured batch (sidecar 5573 → 5753); learned terms now 563.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +22.
- Re-merged affected schools-index files after QA fixes.
