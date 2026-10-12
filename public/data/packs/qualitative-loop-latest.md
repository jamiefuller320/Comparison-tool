# Qualitative capture loop

- Ran at: `2026-10-12T17:11:52.780520+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Hackney, Richmond upon Thames, Waltham Forest`
- Index: `public/data/packs/waltham-forest/schools-index.json`
- Remaining with website (pre-capture): `21`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6973` → `7033`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `14`
- Learned terms: `500`
- Learned QA phrases: `8`
- Dry run: `False`

## Streams

- `Hackney`: status=ok added=19 remaining=19 index=`public/data/packs/hackney/schools-index.json`
- `Richmond upon Thames`: status=ok added=20 remaining=20 index=`public/data/packs/richmond-upon-thames/schools-index.json`
- `Waltham Forest`: status=ok added=21 remaining=21 index=`public/data/packs/waltham-forest/schools-index.json`

## Notes

- Hydrated working sidecar from 6973 published URN shards (prior=0 → 6973).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=152, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Waltham Forest (remaining=21).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Richmond upon Thames (remaining=20).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Hackney (remaining=19).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Waltham Forest index=public/data/packs/waltham-forest/schools-index.json remainingWithWebsite=21.
- Stream LA=Richmond upon Thames index=public/data/packs/richmond-upon-thames/schools-index.json remainingWithWebsite=20.
- Stream LA=Hackney index=public/data/packs/hackney/schools-index.json remainingWithWebsite=19.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 7033 records (union size 7033).
- Captured batch (sidecar 6973 → 7033); learned terms now 551.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 14, learned phrases +8.
- Re-merged affected schools-index files after QA fixes.
