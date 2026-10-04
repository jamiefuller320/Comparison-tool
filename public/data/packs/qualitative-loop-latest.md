# Qualitative capture loop

- Ran at: `2026-10-04T14:56:55.165331+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Kensington and Chelsea, Merton, Sutton`
- Index: `public/data/packs/merton/schools-index.json`
- Remaining with website (pre-capture): `71`
- Batch limit (per stream): `60`
- Sidecar records before → after: `5933` → `6113`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `21`
- Dry run: `False`

## Streams

- `Kensington and Chelsea`: status=ok added=60 remaining=68 index=`public/data/packs/kensington-and-chelsea/schools-index.json`
- `Merton`: status=ok added=60 remaining=71 index=`public/data/packs/merton/schools-index.json`
- `Sutton`: status=ok added=60 remaining=71 index=`public/data/packs/sutton/schools-index.json`

## Notes

- Hydrated working sidecar from 5933 published URN shards (prior=0 → 5933).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=1192, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Merton (remaining=71).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Sutton (remaining=71).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Kensington and Chelsea (remaining=68).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Merton index=public/data/packs/merton/schools-index.json remainingWithWebsite=71.
- Stream LA=Sutton index=public/data/packs/sutton/schools-index.json remainingWithWebsite=71.
- Stream LA=Kensington and Chelsea index=public/data/packs/kensington-and-chelsea/schools-index.json remainingWithWebsite=68.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6113 records (union size 6113).
- Captured batch (sidecar 5933 → 6113); learned terms now 563.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +21.
- Re-merged affected schools-index files after QA fixes.
