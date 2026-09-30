# Qualitative capture loop

- Ran at: `2026-09-30T15:16:18.366903+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Croydon, Havering, Hounslow`
- Index: `public/data/packs/havering/schools-index.json`
- Remaining with website (pre-capture): `89`
- Batch limit (per stream): `60`
- Sidecar records before → after: `5213` → `5393`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `32`
- Dry run: `False`

## Streams

- `Croydon`: status=ok added=60 remaining=86 index=`public/data/packs/croydon/schools-index.json`
- `Havering`: status=ok added=60 remaining=89 index=`public/data/packs/havering/schools-index.json`
- `Hounslow`: status=ok added=60 remaining=86 index=`public/data/packs/hounslow/schools-index.json`

## Notes

- Hydrated working sidecar from 5213 published URN shards (prior=0 → 5213).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=1912, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Havering (remaining=89).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Croydon (remaining=86).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Hounslow (remaining=86).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Havering index=public/data/packs/havering/schools-index.json remainingWithWebsite=89.
- Stream LA=Croydon index=public/data/packs/croydon/schools-index.json remainingWithWebsite=86.
- Stream LA=Hounslow index=public/data/packs/hounslow/schools-index.json remainingWithWebsite=86.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 5393 records (union size 5393).
- Captured batch (sidecar 5213 → 5393); learned terms now 563.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +32.
- Re-merged affected schools-index files after QA fixes.
