# Qualitative capture loop

- Ran at: `2026-10-14T13:09:55.488649+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Hampshire, Merton, Sutton`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `1`
- Batch limit (per stream): `60`
- Sidecar records before → after: `7074` → `7097`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `8`
- Learned terms: `500`
- Learned QA phrases: `7`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=1 remaining=1 index=`public/data/schools-index.json`
- `Merton`: status=ok added=11 remaining=11 index=`public/data/packs/merton/schools-index.json`
- `Sutton`: status=ok added=11 remaining=11 index=`public/data/packs/sutton/schools-index.json`

## Notes

- Hydrated working sidecar from 7074 published URN shards (prior=0 → 7074).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=51, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Merton (remaining=11).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Sutton (remaining=11).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Kensington and Chelsea (remaining=8).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Merton (remaining=11).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Sutton (remaining=11).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=1.
- Stream LA=Merton index=public/data/packs/merton/schools-index.json remainingWithWebsite=11.
- Stream LA=Sutton index=public/data/packs/sutton/schools-index.json remainingWithWebsite=11.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7097 records (union size 7097).
- Captured batch (sidecar 7074 → 7097); learned terms now 547.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 8, learned phrases +7.
- Re-merged affected schools-index files after QA fixes.
