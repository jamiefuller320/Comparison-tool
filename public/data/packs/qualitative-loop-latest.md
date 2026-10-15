# Qualitative capture loop

- Ran at: `2026-10-15T12:50:49.279658+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `City of London, Islington, Kensington and Chelsea`
- Index: `public/data/packs/kensington-and-chelsea/schools-index.json`
- Remaining with website (pre-capture): `8`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7097` → `7118`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `4`
- Learned terms: `500`
- Learned QA phrases: `0`
- Dry run: `False`

## Streams

- `City of London`: status=ok added=6 remaining=6 index=`public/data/packs/city-of-london/schools-index.json`
- `Islington`: status=ok added=7 remaining=7 index=`public/data/packs/islington/schools-index.json`
- `Kensington and Chelsea`: status=ok added=8 remaining=8 index=`public/data/packs/kensington-and-chelsea/schools-index.json`

## Notes

- Hydrated working sidecar from 7097 published URN shards (prior=0 → 7097).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=29, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Kensington and Chelsea (remaining=8).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Islington (remaining=7).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to City of London (remaining=6).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Kensington and Chelsea index=public/data/packs/kensington-and-chelsea/schools-index.json remainingWithWebsite=8.
- Stream LA=Islington index=public/data/packs/islington/schools-index.json remainingWithWebsite=7.
- Stream LA=City of London index=public/data/packs/city-of-london/schools-index.json remainingWithWebsite=6.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7118 records (union size 7118).
- Captured batch (sidecar 7097 → 7118); learned terms now 543.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 4, learned phrases +0.
- Re-merged affected schools-index files after QA fixes.
