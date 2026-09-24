# Qualitative capture loop

- Ran at: `2026-09-24T11:05:51.363149+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Barnet, Lambeth, Tower Hamlets`
- Index: `public/data/packs/barnet/schools-index.json`
- Remaining with website (pre-capture): `153`
- Batch limit (per stream): `20`
- Sidecar records before → after: `4154` → `4214`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `9`
- Dry run: `False`

## Streams

- `Barnet`: status=ok added=20 remaining=153 index=`public/data/packs/barnet/schools-index.json`
- `Lambeth`: status=ok added=20 remaining=92 index=`public/data/packs/lambeth/schools-index.json`
- `Tower Hamlets`: status=ok added=20 remaining=107 index=`public/data/packs/tower-hamlets/schools-index.json`

## Notes

- Ingest policy=auto phase=london (non-London remaining=0, London remaining=2971, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Barnet (remaining=153).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Barnet index=public/data/packs/barnet/schools-index.json remainingWithWebsite=153.
- Stream LA=Lambeth index=public/data/packs/lambeth/schools-index.json remainingWithWebsite=92.
- Stream LA=Tower Hamlets index=public/data/packs/tower-hamlets/schools-index.json remainingWithWebsite=107.
- Running 3 capture streams in parallel (limit 20 each).
- Merged 3 partial sidecar(s) → 4214 records (union size 4214).
- Captured batch (sidecar 4154 → 4214); learned terms now 541.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +9.
- Re-merged affected schools-index files after QA fixes.
