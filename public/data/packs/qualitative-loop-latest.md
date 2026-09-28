# Qualitative capture loop

- Ran at: `2026-09-28T16:49:16.326452+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Brent, Greenwich, Hillingdon`
- Index: `public/data/packs/hillingdon/schools-index.json`
- Remaining with website (pre-capture): `105`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4853` → `5033`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `10`
- Dry run: `False`

## Streams

- `Brent`: status=ok added=60 remaining=96 index=`public/data/packs/brent/schools-index.json`
- `Greenwich`: status=ok added=60 remaining=98 index=`public/data/packs/greenwich/schools-index.json`
- `Hillingdon`: status=ok added=60 remaining=105 index=`public/data/packs/hillingdon/schools-index.json`

## Notes

- Hydrated working sidecar from 4853 published URN shards (prior=0 → 4853).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=2272, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Hillingdon (remaining=105).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Greenwich (remaining=98).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Brent (remaining=96).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hillingdon index=public/data/packs/hillingdon/schools-index.json remainingWithWebsite=105.
- Stream LA=Greenwich index=public/data/packs/greenwich/schools-index.json remainingWithWebsite=98.
- Stream LA=Brent index=public/data/packs/brent/schools-index.json remainingWithWebsite=96.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 5033 records (union size 5033).
- Captured batch (sidecar 4853 → 5033); learned terms now 563.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +10.
- Re-merged affected schools-index files after QA fixes.
