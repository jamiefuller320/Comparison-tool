# Qualitative capture loop

- Ran at: `2026-10-11T14:41:08.896948+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Camden, Redbridge, Westminster`
- Index: `public/data/packs/redbridge/schools-index.json`
- Remaining with website (pre-capture): `26`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6898` → `6973`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `9`
- Learned terms: `500`
- Learned QA phrases: `2`
- Dry run: `False`

## Streams

- `Camden`: status=ok added=25 remaining=25 index=`public/data/packs/camden/schools-index.json`
- `Redbridge`: status=ok added=26 remaining=26 index=`public/data/packs/redbridge/schools-index.json`
- `Westminster`: status=ok added=24 remaining=24 index=`public/data/packs/westminster/schools-index.json`

## Notes

- Hydrated working sidecar from 6898 published URN shards (prior=0 → 6898).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=227, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Redbridge (remaining=26).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Camden (remaining=25).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Westminster (remaining=24).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Redbridge index=public/data/packs/redbridge/schools-index.json remainingWithWebsite=26.
- Stream LA=Camden index=public/data/packs/camden/schools-index.json remainingWithWebsite=25.
- Stream LA=Westminster index=public/data/packs/westminster/schools-index.json remainingWithWebsite=24.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6973 records (union size 6973).
- Captured batch (sidecar 6898 → 6973); learned terms now 553.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 9, learned phrases +2.
- Re-merged affected schools-index files after QA fixes.
