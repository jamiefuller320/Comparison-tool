# Qualitative capture loop

- Ran at: `2026-10-10T14:22:34.557164+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Croydon, Havering, Hounslow`
- Index: `public/data/packs/havering/schools-index.json`
- Remaining with website (pre-capture): `29`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6817` → `6898`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `16`
- Dry run: `False`

## Streams

- `Croydon`: status=ok added=26 remaining=26 index=`public/data/packs/croydon/schools-index.json`
- `Havering`: status=ok added=29 remaining=29 index=`public/data/packs/havering/schools-index.json`
- `Hounslow`: status=ok added=26 remaining=26 index=`public/data/packs/hounslow/schools-index.json`

## Notes

- Hydrated working sidecar from 6817 published URN shards (prior=0 → 6817).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=308, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Havering (remaining=29).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Croydon (remaining=26).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Hounslow (remaining=26).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Havering index=public/data/packs/havering/schools-index.json remainingWithWebsite=29.
- Stream LA=Croydon index=public/data/packs/croydon/schools-index.json remainingWithWebsite=26.
- Stream LA=Hounslow index=public/data/packs/hounslow/schools-index.json remainingWithWebsite=26.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6898 records (union size 6898).
- Captured batch (sidecar 6817 → 6898); learned terms now 557.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +16.
- Re-merged affected schools-index files after QA fixes.
