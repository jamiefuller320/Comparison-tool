# Qualitative capture loop

- Ran at: `2026-09-23T12:58:01.378198+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Hampshire, Lambeth, Tower Hamlets`
- Index: `public/data/schools-index.json`
- Remaining with website (pre-capture): `0`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4153` → `4153`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `4`
- Learned terms: `500`
- Learned QA phrases: `1`
- Dry run: `False`

## Streams

- `Hampshire`: status=ok added=0 remaining=0 index=`public/data/schools-index.json`
- `Lambeth`: status=ok added=0 remaining=0 index=`public/data/schools-index.json`
- `Tower Hamlets`: status=ok added=0 remaining=0 index=`public/data/schools-index.json`

## Notes

- Hydrated working sidecar from 4153 published URN shards (prior=0 → 4153).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=0, pending London packs=33).
- London phase: borough packs not ready yet — run `npm run pack:london` (capture will no-op until manifest entries are ready).
- Stream preferred=Hampshire exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Lambeth exhausted (remaining=0); no replacement LA with website work.
- Stream preferred=Tower Hamlets exhausted (remaining=0); no replacement LA with website work.
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hampshire index=public/data/schools-index.json remainingWithWebsite=0.
- Stream LA=Lambeth index=public/data/schools-index.json remainingWithWebsite=0.
- Stream LA=Tower Hamlets index=public/data/schools-index.json remainingWithWebsite=0.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4153 records (union size 4153).
- Captured batch (sidecar 4153 → 4153); learned terms now 545.
- No new captures — website pools exhausted for selected streams (allow-empty no-op); still running synth/QA/refresh budget.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 4, learned phrases +1.
- Re-merged affected schools-index files after QA fixes.
