# Qualitative capture loop

- Ran at: `2026-10-01T15:49:06.495310+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Camden, Redbridge, Westminster`
- Index: `public/data/packs/redbridge/schools-index.json`
- Remaining with website (pre-capture): `86`
- Batch limit (per stream): `60`
- Sidecar records before → after: `5393` → `5573`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `21`
- Dry run: `False`

## Streams

- `Camden`: status=ok added=60 remaining=85 index=`public/data/packs/camden/schools-index.json`
- `Redbridge`: status=ok added=60 remaining=86 index=`public/data/packs/redbridge/schools-index.json`
- `Westminster`: status=ok added=60 remaining=84 index=`public/data/packs/westminster/schools-index.json`

## Notes

- Hydrated working sidecar from 5393 published URN shards (prior=0 → 5393).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=1732, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Redbridge (remaining=86).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Camden (remaining=85).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Westminster (remaining=84).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Redbridge index=public/data/packs/redbridge/schools-index.json remainingWithWebsite=86.
- Stream LA=Camden index=public/data/packs/camden/schools-index.json remainingWithWebsite=85.
- Stream LA=Westminster index=public/data/packs/westminster/schools-index.json remainingWithWebsite=84.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 5573 records (union size 5573).
- Captured batch (sidecar 5393 → 5573); learned terms now 562.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +21.
- Re-merged affected schools-index files after QA fixes.
